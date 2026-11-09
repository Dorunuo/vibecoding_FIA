import assert from 'node:assert/strict';
import { stepMovement, createMovementKeys } from '../movement-check.js';
const origin = { x: 0, z: 0 };
const move = (...codes) => stepMovement(origin, new Set(codes), 0.05);
assert.deepEqual(move('KeyW'), { x: 0, z: -0.2 });
assert.deepEqual(move('KeyS'), { x: 0, z: 0.2 });
assert.deepEqual(move('KeyA'), { x: -0.2, z: 0 });
assert.deepEqual(move('KeyD'), { x: 0.2, z: 0 });
assert.deepEqual(move('KeyW', 'KeyS', 'KeyA', 'KeyD'), origin);
assert.deepEqual(move(), origin);
const diagonal = move('KeyW', 'KeyD');
assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 0.2) < 1e-10);
for (const dt of [NaN, Infinity, -1, 0]) {
  assert.deepEqual(stepMovement(origin, new Set(['KeyW']), dt), origin);
}
assert.deepEqual(stepMovement(origin, new Set(['KeyD']), 100), move('KeyD'));
assert.deepEqual(stepMovement({ x: 9.5, z: -9.5 }, new Set(['KeyD', 'KeyW']), 0.05), { x: 9.5, z: -9.5 });
assert.deepEqual(origin, { x: 0, z: 0 });
// 使用真实 EventTarget 验证监听、松键、失焦与释放；不是浏览器真实按键测试。
const target = new EventTarget();
const input = createMovementKeys(target);
function send(type, code) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'code', { value: code });
  target.dispatchEvent(event);
  return event;
}
assert.equal(send('keydown', 'KeyW').defaultPrevented, true);
assert.equal(input.keys.has('KeyW'), true);
send('keyup', 'KeyW');
assert.equal(input.keys.size, 0);
send('keydown', 'KeyA');
target.dispatchEvent(new Event('blur'));
assert.equal(input.keys.size, 0);
assert.equal(send('keydown', 'KeyE').defaultPrevented, false);
assert.equal(input.keys.size, 0);
input.dispose();
send('keydown', 'KeyD');
assert.equal(input.keys.size, 0);
console.log('PASS：独立WASD四方向、斜向等速、反向抵消、边界、非法dt、松键停止、失焦清键及监听释放。浏览器人工操作尚待检验。');
