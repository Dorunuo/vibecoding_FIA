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
async function boot() {
const container = document.getElementById('game-container');
const startButton = document.getElementById('start-button');
const demoButton = document.getElementById('demo-button');
startButton.disabled = true; demoButton.disabled = true;
startButton.textContent = '正在加载三层遗迹与人物…';
const environment = createEnvironment(container);
await environment.ready;
const input = createInput(environment.renderer.domElement);
environment.renderer.domElement.tabIndex = 0;
const player = createPlayer({ scene: environment.scene, spawn: LEVEL.spawn });
await player.ready;
const followCamera = createFollowCamera({ aspect: window.innerWidth / window.innerHeight, obstacles: environment.cameraObstacles });
startButton.disabled = false; startButton.textContent = '开始游戏';
// C integration: route regression uses the real B controller and manifest geometry.
demoButton.disabled = LEVEL.demoRoute.length === 0;
if (demoButton.disabled) demoButton.textContent = 'Demo 路线待验证';
const audio = createAudio();
const session = createGameSession({ scene: environment.scene, level: LEVEL });
const demo = createDemoController({ level: LEVEL, session });

// 先隐藏菜单/暂停遮罩，再将键盘焦点交还画布。
function focusGame() {
  ui.render(session.getSnapshot(), audio.getSnapshot());
  environment.renderer.domElement.focus({ preventScroll: true });
}

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
  focusGame();
}

function pauseRun() {
  input.reset();
  audio.reset();
  session.togglePause();
}

function resumeRun() {
  input.reset();
  audio.unlock().catch(() => {});
  session.togglePause();
  if (session.getSnapshot().state === GAME_STATE.PLAYING) focusGame();
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

function uiCommand(callback) {
  return (...args) => { audio.unlock().then(() => audio.play(GAME_EVENT.UI_CLICK)); callback(...args); };
}
const ui = createUI({
  onStart: uiCommand(() => startRun(GAME_MODE.HUMAN)),
  onDemo: uiCommand(() => startRun(GAME_MODE.DEMO)),
  onPause: uiCommand(pauseRun),
  onResume: uiCommand(resumeRun),
  onRestart: uiCommand(restartCurrentRun),
  onMenu: uiCommand(returnToMenu),
  onVolumeChange: (value) => { audio.unlock(); audio.setVolume(value); },
  onMute: () => { audio.unlock(); audio.toggleMute(); },
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
  // Demo cancel takes priority over pause, including paused/results states.
  if (globalInput.cancelPressed && sessionSnapshot.mode === GAME_MODE.DEMO &&
      sessionSnapshot.state !== GAME_STATE.MENU) {
    returnToMenu();
    return;
  }
  // Human Esc pauses/resumes; Demo Start can still pause without cancelling.
  if (globalInput.pausePressed && sessionSnapshot.state !== GAME_STATE.MENU) {
    if (sessionSnapshot.state === GAME_STATE.PLAYING) {
      pauseRun();
    } else if (sessionSnapshot.state === GAME_STATE.PAUSED) {
      resumeRun();
    }
  }
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const globalInput = input.readFrame();
  ui.setInputDevice(input.getLastDevice());
  const sessionSnapshot = session.getSnapshot();

  handleGlobalInput(globalInput, sessionSnapshot);

  // 重新读取状态（处理全局按键可能造成的状态变化）
  const currentSnapshot = session.getSnapshot();

  if (currentSnapshot.state === GAME_STATE.PLAYING) {
    elapsed += dt;

    // 输入来源：DEMO 用 demo.readFrame，HUMAN 用真实输入
    const controlInput =
      currentSnapshot.mode === GAME_MODE.DEMO
        ? demo.readFrame(player.getSnapshot(), followCamera.yaw, dt)
        : globalInput;

    if (currentSnapshot.mode === GAME_MODE.DEMO && demo.getSnapshot().failure) {
      const message = demo.getSnapshot().failure;
      console.warn(message);
      returnToMenu();
      ui.render(session.getSnapshot(), audio.getSnapshot());
      ui.announce(message, 'error');
      environment.renderer.render(environment.scene, followCamera.camera);
      requestAnimationFrame(animate);
      return;
    }
    const playerEvents = player.update(dt, controlInput, {
      colliders: environment.colliders,
      cameraYaw: followCamera.yaw,
      bounds: LEVEL.bounds,
      playerRadius: LEVEL.playerRadius,
      surfaces: environment.surfaces,
    });

    followCamera.update(dt, player.getSnapshot(), controlInput);

    const gameEvents = session.update(
      dt,
      controlInput,
      player.getSnapshot(),
      player,
    );

    if (currentSnapshot.mode === GAME_MODE.DEMO &&
        [GAME_STATE.WIN, GAME_STATE.GAME_OVER].includes(session.getSnapshot().state)) {
      // Observe real terminal state now: there is no subsequent PLAYING frame.
      demo.readFrame(player.getSnapshot(), followCamera.yaw, 0);
    }
    environment.update(dt, elapsed, player.getSnapshot());

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

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  input.reset();
  if (session.getSnapshot().state === GAME_STATE.PLAYING) pauseRun();
});

// 启动唯一主循环
requestAnimationFrame(animate);
}
boot().catch(error => {
  console.error('资源加载失败', error);
  const button = document.getElementById('start-button');
  button.disabled = true;
  button.textContent = '加载失败，请刷新或检查资源文件';
  const hint = document.querySelector('#menu-screen .hint');
  if (hint) hint.textContent = '资源加载失败：' + error.message;
});