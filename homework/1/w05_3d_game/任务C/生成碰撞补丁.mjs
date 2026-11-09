// 碰撞补丁生成器（穿模修复的数据来源）：让碰撞体与 GLB 可视模型对齐。
// 幂等：先移除全部 patch==='C1-clip-fix' 旧条目，再从当前 GLB/manifest 重新生成。
// 生成结果写入 assets/level-manifest.json；正确性由 穿模扫描与验证.mjs 用真实物理探针判定。
// 若环境 GLB 或楼梯数据变动，必须重跑本脚本并重新通过扫描。
import './node-assets.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const PATCH = 'C1-clip-fix';
const manifestUrl = new URL('../assets/level-manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
const gltf = await new GLTFLoader().loadAsync('assets/ruins-environment.glb');
gltf.scene.updateMatrixWorld(true);

const added = [];
function add(name, min, max) {
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  if (![...min, ...max].every(Number.isFinite) || size.some((v) => v <= 0)) {
    throw new Error(`无效补丁碰撞体 ${name}: min=${min} max=${max}`);
  }
  added.push({
    name,
    center: [+((min[0] + max[0]) / 2).toFixed(4), +((min[1] + max[1]) / 2).toFixed(4), +((min[2] + max[2]) / 2).toFixed(4)],
    size: size.map((v) => +v.toFixed(4)),
    patch: PATCH,
  });
}

function glbBox(name) {
  const node = gltf.scene.getObjectByName(name);
  if (!node || !node.isMesh) throw new Error(`环境GLB缺少补丁参照网格: ${name}`);
  const box = new THREE.Box3().setFromObject(node);
  if (box.isEmpty()) throw new Error(`补丁参照网格包围盒为空: ${name}`);
  return box;
}

// —— 1. 楼梯：两侧全高护栏墙 + 顶端背面（梯段是实体踏步块，参数化自 manifest.stairs）——
// 与 GLB 实测对齐：栏杆柱/斜栏在踏面两侧边缘，高度到上层地面以上约 1.05；踏步块底低于下层地面 0.18。
const RAIL_TOP = 1.05, WALL_T = 0.24, END_Z = 0.1;
for (const stair of manifest.stairs) {
  const xs = stair.ramp_corners.map((p) => p[0]);
  const ys = stair.ramp_corners.map((p) => p[1]);
  const zs = stair.ramp_corners.map((p) => p[2]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const yTop = Math.max(...ys), yBottom = Math.min(...ys);
  add(`C1Patch_${stair.name}_WestGuard`, [minX - WALL_T, yBottom - 0.05, minZ - END_Z], [minX, yTop + RAIL_TOP, maxZ + END_Z]);
  add(`C1Patch_${stair.name}_EastGuard`, [maxX, yBottom - 0.05, minZ - END_Z], [maxX + WALL_T, yTop + RAIL_TOP, maxZ + END_Z]);
  // 顶端（z 较大端即 stair.top[2]）背面：阻挡下层从梯顶下走入梯体。
  // 顶面必须低于上层地面一个步高容差以上（yTop-0.5）：否则梯面行人接近顶端时，
  // 圆柱先碰到比脚底高 >0.24 的阻挡顶面而被卡住（实测会堵在距顶 0.92m 处）。
  const topZ = stair.top[2];
  add(`C1Patch_${stair.name}_TopBack`, [minX - WALL_T, yBottom - 0.2, topZ - 0.3], [maxX + WALL_T, yTop - 0.5, topZ]);
}

// —— 2. GLB 精确参照：井口压顶石、墙面搁架、关闭的出口石门、全部周边碎石 ——
// 碎石较矮者运行时自动成为可踏上的矮坎（player 步高容差 0.24），较高者自然阻挡。
const pad = 0.02;
let rubbleCount = 0;
gltf.scene.traverse((node) => {
  if (!node.isMesh) return;
  if (/^Stair_Shaft_Coping/.test(node.name) || /^Perimeter_Rubble/.test(node.name)) {
    const b = new THREE.Box3().setFromObject(node);
    if (b.isEmpty()) return;
    add(`C1Patch_${node.name}`, [b.min.x - pad, b.min.y, b.min.z - pad], [b.max.x + pad, b.max.y, b.max.z + pad]);
    if (/^Perimeter_Rubble/.test(node.name)) rubbleCount++;
  }
});
if (rubbleCount < 30) throw new Error(`碎石参照数量异常: ${rubbleCount}`);
for (const name of ['Kitchen_Wall_Shelf', 'Exit_Closed_Visual']) {
  const b = glbBox(name);
  add(`C1Patch_${name}`, [b.min.x - pad, b.min.y, b.min.z - pad], [b.max.x + pad, b.max.y, b.max.z + pad]);
}

// —— 3. 蓄水池入口间隙：可视壁完整一圈，碰撞留了入口；按可视封堵（内部无玩法内容）——
const entryRims = manifest.colliders
  .filter((c) => c.name === 'Cistern_Entry_Rim')
  .map((c) => ({
    minX: c.center[0] - c.size[0] / 2, maxX: c.center[0] + c.size[0] / 2,
    minY: c.center[1] - c.size[1] / 2, maxY: c.center[1] + c.size[1] / 2,
    minZ: c.center[2] - c.size[2] / 2, maxZ: c.center[2] + c.size[2] / 2,
  }))
  .sort((a, b) => a.minX - b.minX);
if (entryRims.length !== 2) throw new Error(`Cistern_Entry_Rim 数量异常: ${entryRims.length}`);
add('C1Patch_Cistern_EntryGap',
  [entryRims[0].maxX, entryRims[0].minY, entryRims[0].minZ],
  [entryRims[1].minX, entryRims[0].maxY, entryRims[0].maxZ]);

// —— 幂等写回 ——
const before = manifest.colliders.length;
manifest.colliders = manifest.colliders.filter((c) => c.patch !== PATCH).concat(added);
await writeFile(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
console.log(`碰撞补丁: ${before} -> 移除旧补丁后 ${before - (before - manifest.colliders.length + added.length)} + 新增 ${added.length} = 当前 ${manifest.colliders.length} 个碰撞体`);
for (const e of added) console.log(`  ${e.name} center=${JSON.stringify(e.center)} size=${JSON.stringify(e.size)}`);
console.log('已写回 assets/level-manifest.json；下一步运行 node 任务C/穿模扫描与验证.mjs');
