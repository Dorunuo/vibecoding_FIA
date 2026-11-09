// C：晶体状态与视觉。仅由 gameplay 更新，不监听输入、不创建循环或操作角色位置。
import * as THREE from 'three';
import { GAME_EVENT, GAME_RULES, PLAYER_ACTION } from './config.js';
import { LEVEL } from './level.js';

export const TREASURE_STATE = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  IN_RANGE: 'IN_RANGE',
  COLLECTING: 'COLLECTING',
  COLLECTED: 'COLLECTED',
});

// level 为可选内部依赖；原 createCollectibles(scene) 调用仍兼容。
export function createCollectibles(scene, level = LEVEL) {
  const group = new THREE.Group();
  group.name = 'collectibles';
  scene.add(group);
  let disposed = false;
  let active = null;
  let nearest = null;

  const items = level.treasures.map((definition) => {
    const position = new THREE.Vector3(...definition.position);
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35, 0),
      new THREE.MeshStandardMaterial({
        color: 0x7fd6ff,
        emissive: 0x37a8cc,
        emissiveIntensity: 1.2,
        roughness: 0.3,
      }),
    );
    mesh.name = `crystal-${definition.id}`;
    group.add(mesh);
    return { id: definition.id, position, mesh, state: TREASURE_STATE.AVAILABLE, elapsed: 0 };
  });

  function reset() {
    if (disposed) return;
    active = null;
    nearest = null;
    for (const item of items) {
      item.state = TREASURE_STATE.AVAILABLE;
      item.elapsed = 0;
      item.mesh.visible = true;
      item.mesh.scale.setScalar(1);
      item.mesh.rotation.set(0, 0, 0);
      item.mesh.position.copy(item.position);
      item.mesh.position.y += 0.15;
      item.mesh.material.emissiveIntensity = 1.2;
    }
  }

  function update(dt, input = {}, playerSnapshot, playerApi) {
    if (disposed || !Number.isFinite(dt) || dt < 0) return [];
    const events = [];
    // InputFrame 的 Pressed 已由输入模块保证为边沿；不能再次去边沿吞掉恢复后的新按键。
    const pressed = input.interactPressed === true;

    // 已开始的挖掘不因后续按键中断；计时完全来自游戏 dt，暂停时调用方不更新。
    // 不把触发帧的 dt 算入挖掘：本帧 player.update 已执行，动作从此刻才开始。
    if (active) {
      active.elapsed = Math.min(GAME_RULES.collectDuration, active.elapsed + dt);
      const progress = active.elapsed / GAME_RULES.collectDuration;
      active.mesh.position.y = active.position.y + 0.15 + progress * 1.1;
      active.mesh.rotation.y += dt * 5;
      active.mesh.scale.setScalar(1 + progress * 0.3);
      active.mesh.material.emissiveIntensity = 1.8 + progress * 2;
      if (active.elapsed + 1e-9 >= GAME_RULES.collectDuration) {
        active.elapsed = GAME_RULES.collectDuration;
        active.state = TREASURE_STATE.COLLECTED;
        active.mesh.visible = false;
        events.push({ type: GAME_EVENT.COLLECT, treasureId: active.id });
        active = null;
      }
      // 完成帧不启动另一个晶体；必须有下一次独立互动。
      return events;
    }

    nearest = null;
    let nearestDistance = Infinity;
    const position = playerSnapshot?.position;
    const validPosition = position && [position.x, position.y, position.z].every(Number.isFinite);
    for (const item of items) {
      if (item.state === TREASURE_STATE.COLLECTED) continue;
      const distance = validPosition ? item.position.distanceTo(position) : Infinity;
      const inRange = distance <= GAME_RULES.interactRadius;
      item.state = inRange ? TREASURE_STATE.IN_RANGE : TREASURE_STATE.AVAILABLE;
      item.mesh.rotation.y += dt * 0.8;
      item.mesh.material.emissiveIntensity = inRange ? 1.8 : 1.2;
      if (inRange && distance < nearestDistance) {
        nearest = item;
        nearestDistance = distance;
      }
    }

    // 不打断跳跃或其他锁定动作；缺少公开动作接口时绝不悄悄领取。
    if (pressed && nearest && playerSnapshot.grounded === true &&
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
    if (active) {
      const percent = Math.min(99, Math.floor(active.elapsed / GAME_RULES.collectDuration * 100));
      return `正在挖掘… ${percent}%`;
    }
    return nearest && nearest.state === TREASURE_STATE.IN_RANGE ? '按 E 挖掘晶体（需站稳）' : '';
  }

  function getStates() {
    return items.map((item) => ({
      id: item.id,
      state: item.state,
      position: item.position.clone(),
      progress: item.elapsed / GAME_RULES.collectDuration,
    }));
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    active = null;
    nearest = null;
    scene.remove(group);
    for (const item of items) {
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
    }
    group.clear();
  }

  reset();
  return { group, reset, update, getStates, getInteractionPrompt, dispose };
}
