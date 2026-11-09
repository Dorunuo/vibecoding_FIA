// ============================================================
// collectibles.js —— 唯一主修改人：C
//
// C 的 gameplay.js 内部模块。负责三个被掩埋晶体的状态机与视觉。
// 不操作 DOM、不创建主循环、不直接切换 GAME_STATE；通过返回值/事件交给
// gameplay.js。真实的「靠近提示 → 按 E → 挖掘动画 → 升起变亮旋转 → 计数」
// 流程由 C 实现。
//
// 当前为【最小占位实现】：根据 LEVEL.treasures 创建三个静止发光晶体的视觉
// 占位，提供 reset/update/getStates 接口形状，保证骨架可运行。真实逻辑由 C 写。
// ============================================================

import * as THREE from 'three';
import { LEVEL } from './level.js';

export const TREASURE_STATE = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  IN_RANGE: 'IN_RANGE',
  COLLECTING: 'COLLECTING',
  COLLECTED: 'COLLECTED',
});

export function createCollectibles(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const items = LEVEL.treasures.map((t) => {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35, 0),
      new THREE.MeshStandardMaterial({
        color: 0x7fd6ff,
        emissive: 0x37a8cc,
        emissiveIntensity: 1.2,
        roughness: 0.3,
      }),
    );
    crystal.position.set(t.position[0], 0.4, t.position[2]);
    group.add(crystal);

    return {
      id: t.id,
      state: TREASURE_STATE.AVAILABLE,
      position: new THREE.Vector3(...t.position),
      mesh: crystal,
    };
  });

  function reset() {
    for (const it of items) {
      it.state = TREASURE_STATE.AVAILABLE;
      it.mesh.visible = true;
      it.mesh.scale.setScalar(1);
      it.mesh.position.set(it.position.x, 0.4, it.position.z);
      it.mesh.material.emissiveIntensity = 1.2;
    }
  }

  function update(dt) {
    // 骨架期只有轻微自转，证明有可见对象；收集逻辑由 C 实现。
    for (const it of items) {
      it.mesh.rotation.y += dt * 0.8;
    }
    return [];
  }

  function getStates() {
    return items.map((it) => ({
      id: it.id,
      state: it.state,
      position: it.position.clone(), // 只读副本
    }));
  }

  function dispose() {
    scene.remove(group);
  }

  return { group, reset, update, getStates, dispose };
}