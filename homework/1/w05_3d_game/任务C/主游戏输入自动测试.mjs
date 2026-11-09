import './node-assets.mjs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createInput } from '../src/input.js';
import { createPlayer } from '../src/player.js';
import { LEVEL } from '../src/level.js';

// 用 DOM 替身检查真实 input.js 的事件生命周期；不冒充浏览器人工验收。
class Canvas extends EventTarget {
  attrs = new Map();
  get tabIndex() { return Number(this.attrs.get('tabindex') ?? -1); }
  set tabIndex(value) { this.attrs.set('tabindex', String(value)); }
  getAttribute(key) { return this.attrs.get(key) ?? null; }
  setAttribute(key, value) { this.attrs.set(key, value); }
  removeAttribute(key) { this.attrs.delete(key); }
  focus() { document.activeElement = this; }
}
globalThis.window = new EventTarget();
globalThis.document = Object.assign(new EventTarget(), { hidden: false, activeElement: null });
const canvas = new Canvas();
const input = createInput(canvas);
assert.equal(canvas.tabIndex, 0);
const pointer = new Event('pointerdown');
Object.defineProperty(pointer, 'button', { value: 0 });
canvas.dispatchEvent(pointer);
assert.equal(document.activeElement, canvas);
function key(type, code) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'code', { value: code });
  // B 新版监听 window；DOM 替身不会冒泡，直接派发到监听目标。
  window.dispatchEvent(event);
  return event;
}
assert.equal(key('keydown', 'KeyW').defaultPrevented, true);
assert.equal(input.readFrame().moveY, 1);
const player = createPlayer({ scene: new THREE.Scene(), spawn: LEVEL.spawn });
await player.ready;
const before = player.getSnapshot().position.clone();
for (let i = 0; i < 60; i++) player.update(1 / 60, input.readFrame(), {
  cameraYaw: 0, colliders: [], bounds: LEVEL.bounds, playerRadius: LEVEL.playerRadius,
});
assert.ok(player.getSnapshot().position.z < before.z - 2);
key('keyup', 'KeyW');
assert.equal(input.readFrame().moveY, 0);
key('keydown', 'KeyD');
key('keydown', 'KeyW');
const diagonal = input.readFrame();
assert.ok(Math.abs(Math.hypot(diagonal.moveX, diagonal.moveY) - 1) < 1e-10);
canvas.dispatchEvent(new Event('blur'));
assert.equal(input.readFrame().moveY, 0);
key('keydown', 'KeyE');
assert.equal(input.readFrame().interactPressed, true);
assert.equal(input.readFrame().interactPressed, false);
key('keyup', 'KeyE');
key('keydown', 'KeyW');
window.dispatchEvent(new Event('blur'));
assert.equal(input.readFrame().moveY, 0);
key('keydown', 'KeyW');
document.hidden = true;
document.dispatchEvent(new Event('visibilitychange'));
assert.equal(input.readFrame().moveY, 0);
input.setEnabled(false);
key('keydown', 'Escape');
assert.equal(input.readFrame().pausePressed, true);
assert.equal(input.readFrame().pausePressed, false);
input.reset();
input.setEnabled(true);
input.dispose();
assert.equal(canvas.getAttribute('tabindex'), null);
document.activeElement = null;
canvas.dispatchEvent(new Event('pointerdown'));
assert.equal(document.activeElement, null);
key('keydown', 'KeyW');
assert.equal(input.readFrame().moveY, 0);
const alreadyFocusable = new Canvas();
alreadyFocusable.tabIndex = 3;
createInput(alreadyFocusable).dispose();
assert.equal(alreadyFocusable.tabIndex, 3);
player.dispose();
console.log('PASS：主游戏画布可聚焦、点击聚焦、W输入驱动真实player移动、松键、斜向、E边沿、失焦/隐藏清键、暂停Esc、监听释放与tabindex恢复。浏览器人工复测待执行。');
