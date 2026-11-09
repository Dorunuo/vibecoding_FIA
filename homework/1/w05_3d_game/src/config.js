// ============================================================
// config.js —— 唯一主修改人：A
//
// 全项目的共享常量与通用约定。
// 按《遗迹回声_第二版分工方案.md》第六、七节冻结：
//   - GAME_STATE / GAME_MODE / PLAYER_ACTION / GAME_RULES
//   - GAME_EVENT（事件名只为字符串常量，避免各处写错字）
//   - 坐标 / 单位 / yaw 等通用约定（写成交互提示给所有成员看）
//
// 修改纪律：此文件全局只读使用；确需修改须通知全组并同步调用方。
// ============================================================

// ---------- 坐标与单位约定 ----------
// - Y 轴向上，地面 y = 0；1 单位 ≈ 1 米。
// - 角色初始前方为 -Z（yaw = 0 时面向 -Z）。
// - 位置配置统一写 [x, y, z] 数组；进入模块后再转 THREE.Vector3。
// - 所有速度单位：单位/秒；所有角度：弧度；相机/角色朝向变量统一命名 yaw。
// - dt 单位：秒；主循环建议 Math.min(clock.getDelta(), 0.05)，避免切页穿透。

// ---------- 游戏状态机（只有 C 可修改当前状态）----------
export const GAME_STATE = Object.freeze({
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  WIN: 'WIN',
  GAME_OVER: 'GAME_OVER',
});

export const GAME_MODE = Object.freeze({
  HUMAN: 'HUMAN',
  DEMO: 'DEMO',
});

export const PLAYER_ACTION = Object.freeze({
  IDLE: 'idle',
  WALK: 'walk',
  RUN: 'run',
  JUMP: 'jump',
  FALL: 'fall',
  LAND: 'land',
  COLLECT: 'collect',
  HURT: 'hurt',
  VICTORY: 'victory',
});

export const GAME_RULES = Object.freeze({
  maxHealth: 3,
  interactRadius: 1.8,
  collectDuration: 0.9,
  hurtInvulnerability: 1.0,
  demoTimeout: 120,
});

// ---------- 事件名（主循环只转发，不据此改 C 的游戏状态）----------
// step, jump, land 由 B 的 player.update 发出；
// dig, collect, hurt, exit_locked, exit_open, win, game_over 由 C 的
// session.update 发出；ui_click 供 UI 反馈使用。main() 把它们分发给 audio/UI。
export const GAME_EVENT = Object.freeze({
  STEP: 'step',
  JUMP: 'jump',
  LAND: 'land',
  DIG: 'dig',
  COLLECT: 'collect',
  HURT: 'hurt',
  EXIT_LOCKED: 'exit_locked',
  EXIT_OPEN: 'exit_open',
  WIN: 'win',
  GAME_OVER: 'game_over',
  UI_CLICK: 'ui_click',
});