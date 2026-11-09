// 穿模扫描与修复验证（终版）：真实 GLB 可视网格 × manifest 碰撞体 × 真实 player.js 物理探针。
// 判定口径：模拟结束后玩家圆柱水平穿入某可视网格 >8cm 且上身体带（膝盖以上）重叠 >8cm = 穿模。
// 楼梯另做 5 项专项断言：两侧封锁、梯面侧移不出栏杆、顶端背面封锁、顶端入口/底端出口仍然畅通。
// 退出码 0 = 未发现穿模；仅几何/物理检验，不验证画面观感。
import './node-assets.mjs';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPlayer } from '../src/player.js';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('assets/level-manifest.json', root)));
const gltf = await new GLTFLoader().loadAsync('assets/ruins-environment.glb');
const model = gltf.scene;
model.updateMatrixWorld(true);

const DECOR = /Hanging_Vine|Vine_Leaf|Wall_Moss|Moss_Mat|Stone_Tablet|Amber_.*_Gem/;
const GAMEPLAY_OWNED = /Treasure|Trap_|Gold_Glow|Box_Gold|Interaction_|ExplorerRoot/;
// 设计豁免：洞口警示沿（洞口本就是设计的坠落通道，0.1m 矮沿不阻挡）。
const DESIGN_WALKABLE = /^Drop_Hole_Warning_Rim/;
const FLOORS = manifest.floor_heights;
const RADIUS = manifest.recommended_player_radius;
const UPPER_MIN = 0.3, UPPER_MAX = 1.7; // 膝盖以上身体带：踏步立板触碰不算穿模

const colliders = manifest.colliders
  .filter((c) => !(c.isTrigger || c.trigger_only || c.type === 'TRIGGER'))
  .map((c) => {
    const [x, y, z] = c.center, [w, h, d] = c.size;
    return { name: c.name, minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 };
  });
const tiles = manifest.floor_tiles.map((t) => {
  const [x, y, z] = t.center, [w, h, d] = t.size;
  return { level: t.level, minX: x - w / 2, maxX: x + w / 2, topY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 };
});
const ramps = manifest.stairs.map((s) => {
  const xs = s.ramp_corners.map((p) => p[0]), ys = s.ramp_corners.map((p) => p[1]), zs = s.ramp_corners.map((p) => p[2]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
});
const overlap1D = (aMin, aMax, bMin, bMax) => aMin < bMax && bMin < aMax;
const rectDist = (r, x, z) => Math.hypot(Math.max(r.minX - x, 0, x - r.maxX), Math.max(r.minZ - z, 0, z - r.maxZ));
const rectsTouch = (a, b, pad) => a.minX - pad < b.maxX && b.minX - pad < a.maxX && a.minZ - pad < b.maxZ && b.minZ - pad < a.maxZ;

// —— 收集可视网格（单网格粒度），按空间邻近聚簇 ——
const meshes = [];
model.traverse((node) => {
  if (!node.isMesh || DECOR.test(node.name) || GAMEPLAY_OWNED.test(node.name) || DESIGN_WALKABLE.test(node.name)) return;
  const box = new THREE.Box3().setFromObject(node);
  if (box.isEmpty()) return;
  meshes.push({ name: node.name, minX: box.min.x, maxX: box.max.x, minY: box.min.y, maxY: box.max.y, minZ: box.min.z, maxZ: box.max.z });
});
// 可达 + 未覆盖粗筛：只有靠近可行走区域且大部分足迹无碰撞保护的网格才值得聚簇探测
function roughCandidate(m) {
  for (const floorY of FLOORS) {
    const bandMin = floorY + 0.05, bandMax = floorY + 1.6;
    if (!overlap1D(m.minY, m.maxY, bandMin, bandMax)) continue;
    const nearFloor = tiles.some((t) => Math.abs(t.topY - floorY) < 0.3 && rectsTouch(m, t, RADIUS + 0.05));
    const nearRamp = ramps.some((r) => overlap1D(m.minY, m.maxY, r.minY - 0.2, r.maxY + 1.6) && rectsTouch(m, r, RADIUS + 0.05));
    if (!nearFloor && !nearRamp) continue;
    let covered = 0, total = 0;
    const nx = Math.min(6, Math.max(1, Math.ceil((m.maxX - m.minX) / 0.4))), nz = Math.min(6, Math.max(1, Math.ceil((m.maxZ - m.minZ) / 0.4)));
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      total++;
      const x = m.minX + (m.maxX - m.minX) * (i / nx), z = m.minZ + (m.maxZ - m.minZ) * (j / nz);
      if (colliders.some((c) => overlap1D(c.minY, c.maxY, bandMin, bandMax) && x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ)) covered++;
    }
    if (covered / total < 0.8) return floorY;
  }
  return null;
}
const candidates = meshes.map((m) => ({ ...m, floorY: roughCandidate(m) })).filter((m) => m.floorY !== null);
// 并查集聚簇（xy 平面邻近 1.2m 且 y 带重叠）
const parent = candidates.map((_, i) => i);
const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) {
  const a = candidates[i], b = candidates[j];
  if (overlap1D(a.minY, a.maxY, b.minY - 1.2, b.maxY + 1.2) && rectsTouch(a, b, 1.2)) parent[find(i)] = find(j);
}
const clusters = new Map();
candidates.forEach((m, i) => {
  const k = find(i);
  if (!clusters.has(k)) clusters.set(k, { meshes: [], floorY: m.floorY });
  clusters.get(k).meshes.push(m);
});
console.log(`可视网格 ${meshes.length}，粗筛候选 ${candidates.length}，聚簇 ${clusters.size} 组待物理探测`);

// —— 物理探测 ——
const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const surfaces = tiles.map((t) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(t.maxX - t.minX, 0.36, t.maxZ - t.minZ), material);
  mesh.position.set((t.minX + t.maxX) / 2, t.topY - 0.18, (t.minZ + t.maxZ) / 2);
  mesh.updateMatrixWorld();
  return mesh;
});
for (const stair of manifest.stairs) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(stair.ramp_corners.flat(), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material); mesh.updateMatrixWorld(); surfaces.push(mesh);
}
const scene = new THREE.Scene();
const player = createPlayer({ scene, spawn: { position: manifest.spawn, yaw: 0 } });
await player.ready;
const world = { colliders, surfaces, bounds: { minX: -25, maxX: 25, minZ: -15, maxZ: 15 }, playerRadius: RADIUS, cameraYaw: 0 };
const baseFrame = { moveX: 0, moveY: 1, lookX: 0, lookY: 0, jumpPressed: false, sprintHeld: false };

function clusterRect(c) {
  return {
    minX: Math.min(...c.meshes.map((m) => m.minX)), maxX: Math.max(...c.meshes.map((m) => m.maxX)),
    minZ: Math.min(...c.meshes.map((m) => m.minZ)), maxZ: Math.max(...c.meshes.map((m) => m.maxZ)),
  };
}
function worstPenetration(c) {
  const p = player.getSnapshot().position;
  let worst = null;
  for (const m of c.meshes) {
    const pen = RADIUS - rectDist(m, p.x, p.z);
    const band = Math.min(p.y + UPPER_MAX, m.maxY) - Math.max(p.y + UPPER_MIN, m.minY);
    if (pen > 0.08 && band > 0.08 && (!worst || pen * band > worst.pen * worst.band)) worst = { mesh: m.name, pen, band };
  }
  return worst;
}
function probeCluster(c) {
  const foot = clusterRect(c);
  const cx = (foot.minX + foot.maxX) / 2, cz = (foot.minZ + foot.maxZ) / 2;
  const starts = tiles
    .filter((t) => Math.abs(t.topY - c.floorY) < 0.3 && rectsTouch(foot, t, RADIUS + 0.8))
    .map((t) => [(t.minX + t.maxX) / 2, c.floorY, (t.minZ + t.maxZ) / 2])
    .filter((p) => rectDist(foot, p[0], p[2]) > 0.01);
  const picked = starts.filter((_, i) => i % Math.max(1, Math.floor(starts.length / 8)) === 0).slice(0, 8);
  let worst = null;
  for (const [si, start] of picked.entries()) {
    player.reset({ position: start, yaw: 0 });
    const dir = new THREE.Vector2(cx - start[0], cz - start[2]);
    if (dir.length() < 0.01) continue;
    dir.normalize();
    world.cameraYaw = Math.atan2(-dir.x, -dir.y);
    const frame = { ...baseFrame, sprintHeld: si % 2 === 1 };
    let runWorst = null;
    for (let i = 0; i < 150; i++) {
      player.update(1 / 60, frame, world);
      if (i % 10 === 0 || i === 149) {
        const w = worstPenetration(c);
        if (w && (!runWorst || w.pen * w.band > runWorst.pen * runWorst.band)) runWorst = { ...w, at: player.getSnapshot().position.toArray().map((v) => +v.toFixed(2)), frame: i };
      }
    }
    if (runWorst && (!worst || runWorst.pen * runWorst.band > worst.pen * worst.band)) worst = { ...runWorst, from: start.map((v) => +v.toFixed(2)) };
  }
  return worst;
}

let failures = 0;
let ci = 0;
for (const c of clusters.values()) {
  ci++;
  const names = [...new Set(c.meshes.map((m) => m.name.replace(/_?\d+$/, '')))].join('/');
  const hit = probeCluster(c);
  if (hit) {
    failures++;
    console.log(`穿模 #${ci} [${names}] 穿入 ${(hit.pen * 100).toFixed(0)}cm 体带重叠 ${(hit.band * 100).toFixed(0)}cm 网格=${hit.mesh} 从=${hit.from} 帧=${hit.frame} 停在=${hit.at}`);
  } else {
    console.log(`通过 #${ci} [${names}] ×${c.meshes.length} 网格`);
  }
}

// —— 楼梯专项断言 ——
function drive(start, dir, seconds, sprint = false) {
  player.reset({ position: start, yaw: 0 });
  const d = new THREE.Vector2(...dir).normalize();
  world.cameraYaw = Math.atan2(-d.x, -d.y);
  const frame = { ...baseFrame, sprintHeld: sprint };
  for (let i = 0; i < Math.round(seconds * 60); i++) player.update(1 / 60, frame, world);
  return player.getSnapshot().position;
}
for (const stair of manifest.stairs) {
  const xs = stair.ramp_corners.map((p) => p[0]), ys = stair.ramp_corners.map((p) => p[1]), zs = stair.ramp_corners.map((p) => p[2]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const yTop = Math.max(...ys), yBottom = Math.min(...ys), cx = (minX + maxX) / 2, midZ = (minZ + maxZ) / 2;
  // 1. 下层侧面（东/西）不可走入梯体
  for (const [side, sx, dir] of [['东', maxX + 1.35, [-1, 0]], ['西', minX - 1.35, [1, 0]]]) {
    const end = drive([sx, yBottom, midZ], dir, 2.5);
    const inside = end.x > minX - 0.05 && end.x < maxX + 0.05 && end.z > minZ - 0.05 && end.z < maxZ + 0.05;
    if (inside || Math.abs(end.y - yBottom) > 0.3) { failures++; console.log(`FAIL ${stair.name} 下层${side}侧面进入 停在=${end.toArray().map((v) => +v.toFixed(2))}`); }
    else console.log(`通过 ${stair.name} 下层${side}侧面封锁 停在x=${end.x.toFixed(2)}`);
  }
  // 2. 梯面行走中侧移不越出栏杆
  const onStair = drive([cx, yTop, maxZ - 0.2], [0, -1], 2.0);
  const strafe = drive(player.getSnapshot().position.toArray(), [1, 0], 1.2);
  if (strafe.x > maxX + 0.05) { failures++; console.log(`FAIL ${stair.name} 梯面东侧移越界 停在=${strafe.toArray().map((v) => +v.toFixed(2))}`); }
  else console.log(`通过 ${stair.name} 梯面侧移受栏杆约束 x=${strafe.x.toFixed(2)} (上梯后位于 ${onStair.toArray().map((v) => +v.toFixed(2))})`);
  // 3. 顶端背面（下层）不可走入
  const back = drive([cx, yBottom, maxZ + 1.5], [0, -1], 2.5);
  if (back.z < maxZ + 0.5) { failures++; console.log(`FAIL ${stair.name} 顶端背面进入 停在=${back.toArray().map((v) => +v.toFixed(2))}`); }
  else console.log(`通过 ${stair.name} 顶端背面封锁 停在z=${back.z.toFixed(2)}`);
  // 4. 顶端入口仍可用（从上层地面走上梯面并下降到下层地面，余量收紧防“卡住”回归）
  const down = drive([cx, yTop, maxZ + 1.5], [0, -1], 4.5);
  if (down.y > yBottom + 0.15 || down.z > minZ + 0.3) { failures++; console.log(`FAIL ${stair.name} 顶端入口被堵/卡住 停在=${down.toArray().map((v) => +v.toFixed(2))}`); }
  else console.log(`通过 ${stair.name} 顶端入口畅通 到达y=${down.y.toFixed(2)} z=${down.z.toFixed(2)}`);
  // 5. 底端出口仍可用（从下层地面走上梯面并上升到上层地面，余量收紧防“卡住”回归）
  const up = drive([cx, yBottom, minZ - 1.5], [0, 1], 4.5);
  if (up.y < yTop - 0.15 || up.z < maxZ - 0.3) { failures++; console.log(`FAIL ${stair.name} 底端出口被堵/卡住 停在=${up.toArray().map((v) => +v.toFixed(2))}`); }
  else console.log(`通过 ${stair.name} 底端出口畅通 到达y=${up.y.toFixed(2)} z=${up.z.toFixed(2)}`);
}

player.dispose();
material.dispose();
surfaces.forEach((m) => m.geometry.dispose());
if (failures) { console.error(`FAIL 共 ${failures} 处穿模/阻塞异常`); process.exit(1); }
console.log('PASS 穿模扫描与楼梯专项全部通过');
