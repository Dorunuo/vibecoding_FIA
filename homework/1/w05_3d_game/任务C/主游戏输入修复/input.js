// ============================================================
// input.js —— 唯一主修改人：B
//
// createInput(targetElement) 返回：
//   readFrame(), reset(), setEnabled(flag), getLastDevice(), dispose()
//
// 契约（由方案第七节冻结）：
//   - InputFrame 结构完全固定（见下方对象）。人工输入与 Demo 输入必须同构。
//   - 只在 input.js 内处理摇杆死区(0.15)与按钮映射；鼠标增量转角度增量。
//   - Pressed 是「边沿事件」，不是持续按住状态。
//   - window.blur / 页面隐藏 / 重开时清空按键与边沿。
//   - UI 按钮通过回调操作，不伪造键盘事件；Demo 直接返回同构输入帧。
//
// 当前为【最小占位实现】：仅能读取基本键盘 + 鼠标移动，尚未接入 Gamepad、
// 死区与完整映射。真实实现由 B 完善。A 只保证接口形状正确、可运行。
// ============================================================

import { GAME_RULES } from './config.js';

// 统一输入帧；两个模块（人工 / Demo）共用同一结构，B 不得擅自改字段。
function emptyFrame() {
  return {
    moveX: 0,            // [-1,1] 右为正
    moveY: 0,            // [-1,1] 前为正
    lookX: 0,            // 本帧镜头水平角增量(弧度)，已在输入源内处理灵敏度
    lookY: 0,            // 本帧镜头垂直角增量(弧度)
    jumpPressed: false,  // 仅按下边沿为 true
    interactPressed: false,
    sprintHeld: false,
    pausePressed: false,
    confirmPressed: false,
    cancelPressed: false,
  };
}

export function createInput(targetElement) {
  let lastDevice = 'keyboard';
  let enabled = true;

  // 键位映射（B 负责最终确定；此处占位）
  const keys = {
    KeyW: 'moveY+', KeyA: 'moveX-', KeyS: 'moveY-', KeyD: 'moveX+',
    ArrowUp: 'moveY+', ArrowDown: 'moveY-', ArrowLeft: 'moveX-', ArrowRight: 'moveX+',
    Space: 'jump', KeyE: 'interact', ShiftLeft: 'sprint', ShiftRight: 'sprint',
    Escape: 'pause',
  };
  const down = new Set();
  const edge = new Set(); // 本帧刚按下的键（一次性，读取后清空）
  let mouseDX = 0;
  let mouseDY = 0;

  function onKeyDown(e) {
    if (!keys[e.code]) return;
    e.preventDefault();
    lastDevice = 'keyboard';
    // 未按过的键视为边沿按下
    if (!down.has(e.code)) edge.add(e.code);
    down.add(e.code);
  }
  function onKeyUp(e) { down.delete(e.code); }
  function onMouseMove(e) {
    lastDevice = 'mouse';
    // 骨架期用固定系数；真实灵敏度由 B 决定（在 input 内处理，调用方不再乘）
    const sensitivity = 0.0025;
    mouseDX += e.movementX * sensitivity;
    mouseDY += e.movementY * sensitivity;
  }
  function onBlur() {
    down.clear();
    edge.clear();
    mouseDX = 0;
    mouseDY = 0;
  }

  // canvas 默认不能接收键盘焦点；仅在本输入模块内管理，不增加全局键盘监听。
  const previousTabIndex = targetElement.getAttribute('tabindex');
  if (targetElement.tabIndex < 0) targetElement.tabIndex = 0;
  function focusTarget() { targetElement.focus({ preventScroll: true }); }
  function onVisibilityChange() { if (document.hidden) onBlur(); }
  targetElement.addEventListener('pointerdown', focusTarget);
  targetElement.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibilityChange);
  targetElement.addEventListener('keydown', onKeyDown);
  targetElement.addEventListener('keyup', onKeyUp);
  targetElement.addEventListener('mousemove', onMouseMove);
  window.addEventListener('blur', onBlur);

  function readFrame() {
    const f = emptyFrame();
    if (!enabled) {
      // 暂停等场景：仍允许全局按键（pause/cancel），但清空移动/互动。
      f.pausePressed = edge.has('Escape');
      f.cancelPressed = edge.has('Escape');
      mouseDX = 0; mouseDY = 0;
      edge.clear();
      return f;
    }

    let mx = 0, my = 0;
    for (const code of down) {
      const action = keys[code];
      if (action === 'moveX+') mx += 1;
      else if (action === 'moveX-') mx -= 1;
      else if (action === 'moveY+') my += 1;
      else if (action === 'moveY-') my -= 1;
      else if (action === 'sprint') f.sprintHeld = true;
    }
    // 归一化移动输入（斜向不超速）
    const len = Math.hypot(mx, my);
    if (len > 0) { f.moveX = mx / len; f.moveY = my / len; }

    f.lookX = mouseDX;
    f.lookY = mouseDY;
    mouseDX = 0; mouseDY = 0;

    f.jumpPressed = edge.has('Space');
    f.interactPressed = edge.has('KeyE');
    f.pausePressed = edge.has('Escape');
    f.confirmPressed = edge.has('Space');
    f.cancelPressed = edge.has('Escape');

    edge.clear();
    return f;
  }

  function reset() { onBlur(); }
  function setEnabled(flag) { enabled = flag; if (!flag) onBlur(); }
  function getLastDevice() { return lastDevice; }
  function dispose() {
    targetElement.removeEventListener('keydown', onKeyDown);
    targetElement.removeEventListener('keyup', onKeyUp);
    targetElement.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('blur', onBlur);
    targetElement.removeEventListener('pointerdown', focusTarget);
    targetElement.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    onBlur();
    if (previousTabIndex === null) targetElement.removeAttribute('tabindex');
    else targetElement.setAttribute('tabindex', previousTabIndex);
  }

  return { readFrame, reset, setEnabled, getLastDevice, dispose };
}