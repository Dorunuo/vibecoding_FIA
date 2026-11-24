// C：保留真实土堆/木盒与碰撞；金色晶体仅为宝藏标记，不是第二份收集数据。
import * as THREE from 'three';
import { GAME_EVENT, GAME_RULES, PLAYER_ACTION } from './config.js';
import { LEVEL } from './level.js';

export const TREASURE_STATE = Object.freeze({
  AVAILABLE: 'AVAILABLE', IN_RANGE: 'IN_RANGE', COLLECTING: 'COLLECTING', COLLECTED: 'COLLECTED',
});

export function createCollectibles(scene, level = LEVEL) {
  const group = new THREE.Group();
  group.name = 'collectibles';
  scene.add(group);
  let disposed = false, active = null, nearest = null, target = null, lastPlayer = null;
  // 脚底可站在0.37m土堆/0.8m盒顶。高度单独判定，不用球距离侵蚀水平互动范围。
  // 容差始终小于最近楼层间距的一半；本关5m层高时为1.1m，不跨层收集。
  const floors = (level.floorHeights ?? []).filter(Number.isFinite);
  const gaps = floors.flatMap((y, i) => floors.slice(i + 1).map(other => Math.abs(y - other))).filter(gap => gap > 0);
  const heightTolerance = Math.min(1.1, gaps.length ? Math.min(...gaps) * 0.45 : 1.1);
  const markerGeometry = new THREE.OctahedronGeometry(0.34);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffd34d, toneMapped: false });
  const ringGeometry = new THREE.TorusGeometry(0.48, 0.045, 6, 32);
  const items = level.treasures.map((definition, index) => {
    const position = new THREE.Vector3(...(definition.interactionPosition ?? definition.position));
    const mesh = scene.getObjectByName(definition.visual_node ?? definition.visualNode ?? `Treasure_${definition.id}_Root`);
    const materials = [], effects = [];
    mesh?.traverse((node) => {
      // 透明光芒有baseColor贴图，单关emissive仍可见；灯也必须关闭。
      const sourceMaterials = node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : [];
      if (node.isLight || /glow|halo|aura|relic_gold/i.test(node.name) ||
          sourceMaterials.some(material => material.transparent && /glow|halo|aura/i.test(material.name))) {
        effects.push({ node, visible: node.visible, intensity: node.isLight ? node.intensity : null });
      }
      if (!node.isMesh || !node.material) return;
      const original = node.material;
      const clones = sourceMaterials.map((material) => {
        const clone = material.clone();
        materials.push({ node, original, clone, intensity: clone.emissiveIntensity ?? 0 });
        return clone;
      });
      node.material = Array.isArray(original) ? clones : clones[0];
    });
    const marker = new THREE.Group();
    marker.name = `TreasureMarker_${definition.id}`;
    // 用真实容器包围盒放在其上方，不移动任何原模型；标记不进入物理/相机碰撞数组。
    const bounds = mesh ? new THREE.Box3().setFromObject(mesh) : null;
    const top = bounds && !bounds.isEmpty() ? bounds.max.y : position.y + 0.8;
    marker.position.set(position.x, Math.max(position.y + 1.4, top + 0.5), position.z);
    const crystal = new THREE.Mesh(markerGeometry, markerMaterial);
    crystal.scale.y = 1.45;
    const ring = new THREE.Mesh(ringGeometry, markerMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.35;
    marker.add(crystal, ring);
    group.add(marker);
    return {
      id: definition.id, type: definition.type, floor: definition.level ?? index + 1,
      position, mesh, materials, effects, marker, markerY: marker.position.y,
      radius: definition.type === 'wood_box' ? 1.9 : definition.type === 'dirt_mound' ? 2.3 : GAME_RULES.interactRadius,
      state: TREASURE_STATE.AVAILABLE, elapsed: 0,
    };
  });

  function measure(item, snapshot) {
    const p = snapshot?.position;
    if (!p || ![p.x, p.y, p.z].every(Number.isFinite)) return { horizontal: Infinity, sameHeight: false, inRange: false };
    const horizontal = Math.hypot(p.x - item.position.x, p.z - item.position.z);
    const sameHeight = Math.abs(p.y - item.position.y) <= heightTolerance;
    return { horizontal, sameHeight, inRange: sameHeight && horizontal <= item.radius };
  }

  function render(item, emphasis = 1) {
    const collected = item.state === TREASURE_STATE.COLLECTED;
    item.marker.visible = !collected;
    item.marker.scale.setScalar(emphasis > 1 ? 1.15 : 1);
    const progress = item.state === TREASURE_STATE.COLLECTING ? item.elapsed / GAME_RULES.collectDuration : 0;
    item.marker.position.y = item.markerY + progress * 0.65;
    item.marker.rotation.y = progress * Math.PI * 2;
    for (const effect of item.effects) {
      effect.node.visible = collected ? false : effect.visible;
      if (effect.intensity !== null) effect.node.intensity = collected ? 0 : effect.intensity;
    }
    for (const material of item.materials) {
      material.clone.emissiveIntensity = collected ? 0 : material.intensity * emphasis;
    }
  }

  function reset() {
    if (disposed) return;
    active = null; nearest = null; target = null; lastPlayer = null;
    for (const item of items) {
      item.state = TREASURE_STATE.AVAILABLE;
      item.elapsed = 0;
      render(item);
    }
  }

  // 只取消自己拥有的 collect 动作；优先读取最新公开快照，绝不覆盖 hurt 等锁。
  // B 当前拒绝 duration=0；最短正时长 idle 可立即解除移动锁并在下一次 update 消退。
  function cancel(playerSnapshot, playerApi) {
    if (!active || disposed) return false;
    active.state = measure(active, playerSnapshot).inRange ? TREASURE_STATE.IN_RANGE : TREASURE_STATE.AVAILABLE;
    active.elapsed = 0;
    render(active);
    active = null;
    const current = typeof playerApi?.getSnapshot === 'function' ? playerApi.getSnapshot() : playerSnapshot;
    if (current?.action === PLAYER_ACTION.COLLECT) {
      playerApi?.playAction?.(PLAYER_ACTION.IDLE, Number.EPSILON, { lockMovement: false });
    }
    return true;
  }

  function update(dt, input = {}, playerSnapshot, playerApi) {
    if (disposed || !Number.isFinite(dt) || dt < 0) return [];
    lastPlayer = playerSnapshot;
    const events = [];
    let cancelled = false;
    if (active) {
      // 既不瞬移也不保留远程挖掘：外力/跌落离开范围则取消，必须重新按E。
      if (!measure(active, playerSnapshot).inRange || playerSnapshot?.grounded !== true ||
          playerSnapshot?.action === PLAYER_ACTION.HURT) {
        cancelled = cancel(playerSnapshot, playerApi);
      } else {
        active.elapsed = Math.min(GAME_RULES.collectDuration, active.elapsed + dt);
        render(active, 1.5 + active.elapsed / GAME_RULES.collectDuration);
        if (active.elapsed + 1e-9 >= GAME_RULES.collectDuration) {
          active.elapsed = GAME_RULES.collectDuration;
          active.state = TREASURE_STATE.COLLECTED;
          render(active);
          events.push({ type: GAME_EVENT.COLLECT, treasureId: active.id });
          active = null;
        } else return events;
      }
    }
    nearest = null; target = null;
    let nearestDistance = Infinity, targetScore = Infinity;
    for (const item of items) {
      if (item.state === TREASURE_STATE.COLLECTED) continue;
      const distance = measure(item, playerSnapshot);
      item.state = distance.inRange ? TREASURE_STATE.IN_RANGE : TREASURE_STATE.AVAILABLE;
      render(item, distance.inRange ? 1.5 : 1);
      if (distance.inRange && distance.horizontal < nearestDistance) {
        nearest = item; nearestDistance = distance.horizontal;
      }
      // 优先引导同层；别把楼下XZ更近的宝藏误称为当前可互动目标。
      const score = distance.horizontal + (distance.sameHeight ? 0 : 1000);
      if (score < targetScore) { target = item; targetScore = score; }
    }
    if (!cancelled && input?.interactPressed === true && nearest && playerSnapshot?.grounded === true &&
        playerSnapshot.action !== PLAYER_ACTION.HURT &&
        !playerSnapshot.controlLocked && typeof playerApi?.playAction === 'function') {
      playerApi.playAction(PLAYER_ACTION.COLLECT, GAME_RULES.collectDuration, { lockMovement: true });
      active = nearest;
      active.state = TREASURE_STATE.COLLECTING;
      active.elapsed = 0;
      events.push({ type: GAME_EVENT.DIG, treasureId: active.id });
    }
    return events;
  }

  function getInteractionPrompt() {
    if (disposed) return '';
    if (active) return `第${active.floor}层 · 正在${active.type === 'wood_box' ? '开盒' : '挖掘'}… ${Math.min(99, Math.floor(active.elapsed / GAME_RULES.collectDuration * 100))}%`;
    const item = nearest ?? target;
    if (!item) return '';
    const distance = measure(item, lastPlayer);
    if (!Number.isFinite(distance.horizontal)) return '寻找宝藏上方的金色晶体，靠近后站稳按 E';
    const label = `目标：第${item.floor}层${item.type === 'wood_box' ? '木盒' : '土堆'} · 水平 ${distance.horizontal.toFixed(1)}m`;
    if (!distance.sameHeight) return `${label} · 高度不符，请沿楼梯前往目标层`;
    if (!distance.inRange) return `${label} · 靠近至 ${item.radius.toFixed(1)}m 内，站稳按 E`;
    if (lastPlayer?.grounded !== true) return `${label} · 请落地站稳后按 E`;
    if (lastPlayer?.controlLocked) return `${label} · 动作结束后按 E`;
    return `${label} · 按 E ${item.type === 'wood_box' ? '打开木盒' : '挖掘土堆'}`;
  }

  function getStates() {
    return items.map((item) => ({ id: item.id, state: item.state, position: item.position.clone(), floor: item.floor, progress: item.elapsed / GAME_RULES.collectDuration }));
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    active = null; nearest = null; target = null; lastPlayer = null;
    for (const item of items) {
      for (const material of item.materials) {
        material.node.material = material.original;
        material.clone.dispose();
      }
      for (const effect of item.effects) {
        effect.node.visible = effect.visible;
        if (effect.intensity !== null) effect.node.intensity = effect.intensity;
      }
    }
    markerGeometry.dispose(); markerMaterial.dispose(); ringGeometry.dispose();
    scene.remove(group);
    group.clear();
  }

  reset();
  return { group, reset, cancel, update, getStates, getInteractionPrompt, dispose };
}
