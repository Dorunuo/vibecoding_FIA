// ============================================================
// exit.js —— 唯一主修改人：C
//
// C 的 gameplay.js 内部模块。负责出口门体与开门视觉、到达判定。A 已在
// scene.js 放了静态门框；可开启门体 + 开门外观由本模块管理。
// 不操作 DOM、不创建主循环、不直接切换 GAME_STATE。
//
// 当前为【最小占位实现】：只提供位置/尺寸/是否开启等数据与接口形状，
// 开门后不改变视觉（真实门体由 C 补充）。
// ============================================================

import { LEVEL } from './level.js';

export function createExit(scene) {
  const exit = {
    position: [...LEVEL.exit.position],
    approach: [...LEVEL.exit.approach],
    size: [...LEVEL.exit.size],
  };
  let open = false;

  function reset() {
    open = false;
  }

  function setOpen(flag) {
    open = flag;
    // C 在此实现开门视觉（门体升起/门框发光等）。
  }

  function isOpen() {
    return open;
  }

  function update(dt) {
    // 骨架期无门体动画；C 可实现开门过渡。
    return [];
  }

  function dispose() {}

  function getSnapshot() {
    return { position: exit.position.slice(), open };
  }

  return { reset, setOpen, isOpen, update, dispose, getSnapshot, exit };
}