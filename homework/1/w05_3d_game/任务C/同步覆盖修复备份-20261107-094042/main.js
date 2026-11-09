// ============================================================
// main.js —— 唯一主修改人：A
//
// 职责：按《遗迹回声_第二版分工方案.md》第八节组合 A/B/C 模块，负责
//   窗口 resize、唯一主循环、事件分发、启动/重开/暂停/返回菜单流程。
// 约束：
//   - 除 main.js 外，其他模块不得自行启动 requestAnimationFrame。
//   - 模块工厂与事件监听在应用生命周期内只创建/注册一次；重开调用 reset/start。
//   - 主循环只把事件交给 audio/UI，不根据事件擅自修改 C 的游戏状态。
// ============================================================

import * as THREE from 'three';
import { GAME_STATE, GAME_MODE, GAME_EVENT } from './config.js';
import { LEVEL } from './level.js';
import { createEnvironment } from './scene.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createFollowCamera } from './camera.js';
import { createGameSession } from './gameplay.js';
import { createAudio } from './audio.js';
import { createDemoController } from './demo.js';
import { createUI } from './ui.js';

// ---------- 应用生命周期内只创建一次 ----------
const container = document.getElementById('game-container');

const environment = createEnvironment(container);
const input = createInput(environment.renderer.domElement);
const player = createPlayer({ scene: environment.scene, spawn: LEVEL.spawn });
const followCamera = createFollowCamera({ aspect: window.innerWidth / window.innerHeight });
const audio = createAudio();
const session = createGameSession({ scene: environment.scene, level: LEVEL });
const demo = createDemoController({ level: LEVEL, session });

// 启动/暂停/重开/返回菜单的共享流程（由 A 定义）
function startRun(mode) {
  audio.unlock().catch(() => {});
  input.reset();
  audio.reset();
  environment.reset();
  player.reset(LEVEL.spawn);
  followCamera.reset(player.getSnapshot());
  session.start(mode);
  demo.stop();
  if (mode === GAME_MODE.DEMO) demo.reset();
  input.setEnabled(true);
  elapsed = 0;
}

function pauseRun() {
  session.togglePause();
}

function resumeRun() {
  session.togglePause();
}

function restartCurrentRun() {
  // 完整重置，保留当前模式
  const mode = session.getSnapshot().mode;
  startRun(mode === GAME_MODE.DEMO ? GAME_MODE.DEMO : GAME_MODE.HUMAN);
}

function returnToMenu() {
  demo.stop();
  session.returnToMenu();
  input.reset();
  audio.reset();
  environment.reset();
  player.reset(LEVEL.spawn);
  followCamera.reset(player.getSnapshot());
  input.setEnabled(false);
  elapsed = 0;
}

const ui = createUI({
  onStart: () => startRun(GAME_MODE.HUMAN),
  onDemo: () => startRun(GAME_MODE.DEMO),
  onPause: pauseRun,
  onResume: resumeRun,
  onRestart: restartCurrentRun,
  onMenu: returnToMenu,
  onVolumeChange: (value) => audio.setVolume(value),
  onMute: () => audio.toggleMute(),
});

followCamera.reset(player.getSnapshot());

// ---------- 主循环 ----------
const clock = new THREE.Clock();
let elapsed = 0;

function dispatchEvents(events) {
  // 事件只分发；main 不据此改写 C 的游戏状态。
  for (const ev of events) {
    audio.play(ev.type);
  }
}

function handleGlobalInput(globalInput, sessionSnapshot) {
  // Esc 暂停/继续、Demo 退出返回菜单等全局命令优先处理。
  if (globalInput.pausePressed && sessionSnapshot.state !== GAME_STATE.MENU) {
    if (sessionSnapshot.state === GAME_STATE.PLAYING) {
      pauseRun();
    } else if (sessionSnapshot.state === GAME_STATE.PAUSED) {
      resumeRun();
    }
  }
  if (globalInput.cancelPressed && sessionSnapshot.mode === GAME_MODE.DEMO) {
    // Demo 中按 Esc/取消 退出演示，回到菜单
    if (sessionSnapshot.state === GAME_STATE.PLAYING) {
      returnToMenu();
    }
  }
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const globalInput = input.readFrame();
  const sessionSnapshot = session.getSnapshot();

  handleGlobalInput(globalInput, sessionSnapshot);

  // 重新读取状态（处理全局按键可能造成的状态变化）
  const currentSnapshot = session.getSnapshot();

  if (currentSnapshot.state === GAME_STATE.PLAYING) {
    elapsed += dt;

    // 输入来源：DEMO 用 demo.readFrame，HUMAN 用真实输入
    const controlInput =
      currentSnapshot.mode === GAME_MODE.DEMO
        ? demo.readFrame(player.getSnapshot(), followCamera.yaw)
        : globalInput;

    const playerEvents = player.update(dt, controlInput, {
      colliders: environment.colliders,
      cameraYaw: followCamera.yaw,
      bounds: LEVEL.bounds,
      playerRadius: LEVEL.playerRadius,
    });

    followCamera.update(dt, player.getSnapshot(), controlInput);

    const gameEvents = session.update(
      dt,
      controlInput,
      player.getSnapshot(),
      player,
    );

    environment.update(dt, elapsed);

    dispatchEvents(playerEvents);
    dispatchEvents(gameEvents);
  }

  ui.render(session.getSnapshot(), audio.getSnapshot());
  environment.renderer.render(environment.scene, followCamera.camera);
  requestAnimationFrame(animate);
}

// 初始渲染菜单（不做动画循环内播放，重开不重复注册 renderer）
ui.render(session.getSnapshot(), audio.getSnapshot());
environment.renderer.render(environment.scene, followCamera.camera);

// 窗口缩放只注册一次
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  environment.resize(w, h);
  followCamera.resize(w, h);
});

// 失焦：清空输入（防止卡键）；人工模式自动暂停
window.addEventListener('blur', () => {
  input.reset();
  const s = session.getSnapshot();
  if (s.state === GAME_STATE.PLAYING && s.mode === GAME_MODE.HUMAN) {
    pauseRun();
  }
});

// 启动唯一主循环
requestAnimationFrame(animate);