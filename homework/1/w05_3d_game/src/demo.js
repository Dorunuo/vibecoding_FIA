// C: real, camera-relative InputFrames only. Time comes from main's game dt.
import { GAME_STATE, GAME_RULES } from './config.js';
const emptyFrame = () => ({ moveX: 0, moveY: 0, lookX: 0, lookY: 0,
  jumpPressed: false, interactPressed: false, sprintHeld: false,
  pausePressed: false, confirmPressed: false, cancelPressed: false });

export function createDemoController({ level, session }) {
  let active = false, index = 0, elapsed = 0, stepTime = 0, failure = '', outcome = 'idle';
  let pressed = false;
  function fail(message) { active = false; failure = message; outcome = 'failed'; }
  function reset() {
    active = true; index = 0; elapsed = 0; stepTime = 0; failure = ''; pressed = false; outcome = 'running';
    if (!level.demoRoute?.length) fail('演示路线为空，不能运行自动演示。');
  }
  function advance() { index++; stepTime = 0; pressed = false; }
  function readFrame(player, cameraYaw, dt = 0) {
    const frame = emptyFrame(), snapshot = session.getSnapshot();
    if (!active) return frame;
    if (snapshot.state === GAME_STATE.WIN) { active = false; outcome = 'won'; return frame; }
    if (snapshot.state === GAME_STATE.GAME_OVER) { fail('演示中生命耗尽。'); return frame; }
    if (snapshot.state !== GAME_STATE.PLAYING) return frame;
    if (!Number.isFinite(dt) || dt < 0 || !Number.isFinite(cameraYaw)) return frame;
    elapsed += dt; stepTime += dt;
    if (elapsed > GAME_RULES.demoTimeout) { fail('演示超过总时限，请检查路线。'); return frame; }
    const step = level.demoRoute[index];
    if (!step) { fail('路线结束但尚未真实胜利。'); return frame; }
    if (stepTime > (step.timeout ?? 22)) { fail(`演示第 ${index + 1} 步卡住或超时（${step.kind}）。`); return frame; }
    let target = step.target;
    if (step.kind === 'interact') {
      const treasure = snapshot.treasures.find(t => t.id === step.treasureId);
      const definition = level.treasures.find(t => t.id === step.treasureId);
      if (!treasure || !definition) { fail('演示引用了不存在的宝物。'); return frame; }
      if (treasure.state === 'COLLECTED') { advance(); return frame; }
      target = definition.approach;
      if (treasure.state === 'COLLECTING') { pressed = false; return frame; }
    } else if (step.kind === 'exit') target = level.exit.position;
    else if (step.kind !== 'move') { fail('演示包含不允许的路线动作。'); return frame; }
    if (!Array.isArray(target) || target.length !== 3 || !target.every(Number.isFinite)) {
      fail('演示目标坐标无效。'); return frame;
    }
    const p = player.position, dx = target[0] - p.x, dz = target[2] - p.z;
    const distance = Math.hypot(dx, dz);
    const near = distance <= (step.tolerance ?? 0.22) && Math.abs(target[1] - p.y) < 0.6;
    if (near && player.grounded) {
      if (step.kind === 'move') advance();
      else if (step.kind === 'interact' && !player.controlLocked) {
        // An edge, not held E; retry after a cancelled collection with a fresh edge.
        frame.interactPressed = !pressed; pressed = !pressed;
      }
      return frame;
    }
    if (player.controlLocked || distance < 0.03) return frame;
    // Inverse of B's world-direction transform; slow down early to prevent overshoot.
    const strength = Math.min(1, Math.max(0.16, distance / 0.8));
    frame.moveX = (Math.cos(cameraYaw) * dx - Math.sin(cameraYaw) * dz) / distance * strength;
    frame.moveY = (-Math.sin(cameraYaw) * dx - Math.cos(cameraYaw) * dz) / distance * strength;
    return frame;
  }
  function stop() { active = false; if (outcome === 'running') outcome = 'stopped'; }
  return { reset, readFrame, stop, isFinished: () => !active,
    getSnapshot: () => ({ active, index, elapsed, stepTime, failure, outcome }) };
}
