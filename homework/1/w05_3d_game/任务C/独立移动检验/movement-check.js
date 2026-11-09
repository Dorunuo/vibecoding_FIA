// 独立检验专用：不导入或修改主游戏 input/player/main。
export function stepMovement(position, keys, dt) {
  const current = { x: position.x, z: position.z };
  if (!Number.isFinite(dt) || dt <= 0) return current;
  const x = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const z = Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
  const length = Math.hypot(x, z);
  if (!length) return current;
  const distance = 4 * Math.min(dt, 0.05);
  return {
    x: Math.max(-9.5, Math.min(9.5, current.x + x / length * distance)),
    z: Math.max(-9.5, Math.min(9.5, current.z + z / length * distance)),
  };
}

export function createMovementKeys(target, onEvent = () => {}) {
  const keys = new Set();
  const allowed = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
  function down(event) {
    if (!allowed.has(event.code)) return;
    event.preventDefault();
    keys.add(event.code);
    onEvent(`按下 ${event.code}`);
  }
  function up(event) {
    if (!allowed.has(event.code)) return;
    event.preventDefault();
    keys.delete(event.code);
    onEvent(`松开 ${event.code}`);
  }
  function clear() { keys.clear(); }
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', clear);
  return {
    keys,
    clear,
    dispose() {
      clear();
      target.removeEventListener('keydown', down);
      target.removeEventListener('keyup', up);
      target.removeEventListener('blur', clear);
    },
  };
}
