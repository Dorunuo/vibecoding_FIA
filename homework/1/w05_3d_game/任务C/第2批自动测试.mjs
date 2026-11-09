// 模块自动测试，不是浏览器/真人通关证据。运行：node 任务C/第2批自动测试.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGameSession } from '../src/gameplay.js';
import { createExit } from '../src/exit.js';
import { LEVEL } from '../src/level.js';
import { GAME_EVENT as E, GAME_STATE as S, GAME_MODE, GAME_RULES } from '../src/config.js';

const scene = new THREE.Scene();
const session = createGameSession({ scene, level: LEVEL });
const initialObjects = scene.children.length;
const actions = [];
const api = { playAction: (...args) => actions.push(args) };
const snapshot = (coordinates) => ({ position: new THREE.Vector3(...coordinates), grounded: true, controlLocked: false });
const tick = (coordinates, dt = 0.05, input = {}) => session.update(dt, input, snapshot(coordinates), api);
const atExit = LEVEL.exit.position;
assert.equal(session.getSnapshot().state, S.MENU);
assert.deepEqual(tick(atExit), []);
session.start();
assert.deepEqual(tick(atExit).map(e => e.type), [E.EXIT_LOCKED]);
assert.match(session.getSnapshot().interactionPrompt, /还需收集 3/);
for (let i = 0; i < 20; i++) assert.deepEqual(tick(atExit), []);
assert.equal(session.getSnapshot().state, S.PLAYING);
tick(LEVEL.spawn.position);
assert.deepEqual(tick(atExit).map(e => e.type), [E.EXIT_LOCKED]);

const allEvents = [];
for (const [index, treasure] of LEVEL.treasures.entries()) {
  allEvents.push(...tick(treasure.position, 0.05, { interactPressed: true }));
  assert.equal(session.getSnapshot().treasures[index].progress, 0);
  for (let i = 0; i < 8; i++) allEvents.push(...tick(treasure.position));
  const before = session.getSnapshot();
  session.togglePause();
  assert.deepEqual(tick(treasure.position, 10), []);
  assert.deepEqual(session.getSnapshot().treasures, before.treasures);
  session.togglePause();
  for (let i = 0; i < 10; i++) allEvents.push(...tick(treasure.position));
  assert.equal(session.getSnapshot().collected, index + 1);
  assert.equal(session.getSnapshot().exitOpen, index === LEVEL.treasures.length - 1);
  assert.equal(session.getSnapshot().state, S.PLAYING);
}
assert.equal(actions.length, LEVEL.treasures.length);
assert.deepEqual(actions[0], ['collect', GAME_RULES.collectDuration, { lockMovement: true }]);
for (const type of [E.DIG, E.COLLECT]) assert.equal(allEvents.filter(e => e.type === type).length, LEVEL.treasures.length);
assert.equal(allEvents.filter(e => e.type === E.EXIT_OPEN).length, 1);
assert.deepEqual(tick(LEVEL.exit.approach), []); // 推荐接近点不等于真实出口
assert.equal(session.getSnapshot().state, S.PLAYING);
for (const dt of [NaN, Infinity, -1]) assert.deepEqual(tick(atExit, dt), []);
session.togglePause();
const lift = session.getSnapshot().exit.lift;
tick(atExit, 10);
assert.equal(session.getSnapshot().exit.lift, lift);
assert.equal(session.getSnapshot().state, S.PAUSED);
session.togglePause();
assert.deepEqual(tick(atExit).map(e => e.type), [E.WIN]);
assert.equal(session.getSnapshot().state, S.WIN);
assert.match(session.getSnapshot().resultMessage, /探索成功/);
assert.equal(session.togglePause(), false);
assert.deepEqual(tick(atExit), []);
const copy = session.getSnapshot();
copy.exit.position[0] = 999;
assert.equal(session.getSnapshot().exit.position[0], atExit[0]);
for (let i = 0; i < 20; i++) {
  session.restart();
  const s = session.getSnapshot();
  assert.equal(s.state, S.PLAYING);
  assert.equal(s.collected, 0);
  assert.equal(s.exitOpen, false);
  assert.equal(s.exit.lift, 0);
  assert.equal(s.resultMessage, '');
  assert.equal(scene.children.length, initialObjects);
  assert.deepEqual(tick(atExit).map(e => e.type), [E.EXIT_LOCKED]);
  session.returnToMenu();
}
session.start(GAME_MODE.DEMO);
session.restart();
assert.equal(session.getSnapshot().mode, GAME_MODE.DEMO);
session.dispose();
session.dispose();
assert.equal(scene.children.length, 0);

// 注入非默认关卡，保证出口没有暗中读取另一份全局坐标。
const alternate = { ...LEVEL, exit: { position: [20, 2, 30], approach: [20, 2, 32], size: [4, 5, 2] } };
const gate = createExit(scene, alternate);
assert.equal(gate.contains(new THREE.Vector3(20, 2, 30)), true);
assert.equal(gate.contains(new THREE.Vector3(22, 2, 31)), true);
assert.equal(gate.contains(new THREE.Vector3(22.01, 2, 31)), false);
assert.equal(gate.contains(new THREE.Vector3(20, 7, 30)), false);
assert.equal(gate.contains(new THREE.Vector3(NaN, 2, 30)), false);
gate.setOpen(true);
gate.update(0.4);
assert.equal(gate.getSnapshot().lift, 0.4);
for (const dt of [NaN, Infinity, -1]) gate.update(dt);
assert.equal(gate.getSnapshot().lift, 0.4);
gate.reset();
assert.equal(gate.getSnapshot().lift, 0);
assert.equal(gate.isOpen(), false);
gate.dispose();
gate.dispose();
assert.equal(scene.children.length, 0);
console.log('PASS：锁门限频、真实挖掘/计数、一次开门、实际出口胜利、暂停、非法dt、快照、20次复位、模式、注入关卡及资源释放。');
