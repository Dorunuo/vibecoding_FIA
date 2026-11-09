// Independent Node tests: deliberately mocked WebAudio + minimal DOM, not listening/browser acceptance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAudio } from '../src/audio.js';
import { createUI } from '../src/ui.js';
import { GAME_EVENT } from '../src/config.js';

class Param {
  value = 0; calls = [];
  cancelScheduledValues(...a) { this.calls.push(['cancel', ...a]); }
  setValueAtTime(...a) { this.value = a[0]; this.calls.push(['set', ...a]); }
  linearRampToValueAtTime(...a) { this.value = a[0]; this.calls.push(['linear', ...a]); }
  exponentialRampToValueAtTime(...a) { this.value = a[0]; this.calls.push(['exponential', ...a]); }
}
class Node {
  gain = new Param(); frequency = new Param(); disconnected = false;
  connect(target) { this.target = target; }
  disconnect() { this.disconnected = true; }
  start(time) { this.started = time; }
  stop(time) { this.stopped = time; }
}
class Context {
  static instances = []; static failResume = false; static failClose = false;
  currentTime = 1; state = 'suspended'; destination = {}; sources = []; gains = []; resumes = 0;
  constructor() { Context.instances.push(this); }
  createGain() { const n = new Node(); this.gains.push(n); return n; }
  createOscillator() { const n = new Node(); this.sources.push(n); return n; }
  resume() { this.resumes++; if (Context.failResume) return Promise.reject(Error('blocked')); this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Context.failClose ? Promise.reject(Error('close failed')) : Promise.resolve(); }
}
const rejections = [];
process.on('unhandledRejection', e => rejections.push(e));
globalThis.AudioContext = Context;
const audio = createAudio();
audio.play('collect'); assert.equal(Context.instances.length, 0, 'lazy context');
Context.failResume = true;
assert.equal(await audio.unlock(), false, 'blocked autoplay fulfills false');
Context.failResume = false;
assert.equal(await audio.unlock(), true, 'retry resumes');
const ctx = Context.instances.at(-1);
ctx.state = 'suspended'; await audio.unlock(); assert.equal(ctx.resumes, 3, 'resume suspended context again');
for (const name of Object.values(GAME_EVENT)) {
  ctx.currentTime++;
  const count = ctx.sources.length;
  audio.play(name);
  assert.ok(ctx.sources.length > count, `${name} synthesizes`);
  assert.ok(ctx.sources.at(-1).started >= ctx.currentTime);
}
const beforeUnknown = ctx.sources.length;
audio.play('not-an-event'); assert.equal(ctx.sources.length, beforeUnknown);
audio.setVolume(.25); assert.equal(ctx.gains[0].gain.value, .25);
audio.toggleMute(); assert.equal(ctx.gains[0].gain.value, 0);
audio.setVolume(.6); assert.equal(ctx.gains[0].gain.value, 0);
assert.deepEqual(audio.getSnapshot(), { volume: .6, muted: true });
audio.toggleMute(); assert.equal(ctx.gains[0].gain.value, .6);
audio.setVolume(3); assert.equal(audio.getSnapshot().volume, 1);
audio.setVolume(NaN); assert.equal(audio.getSnapshot().volume, 1);
for (let i = 0; i < 40; i++) { ctx.currentTime++; audio.play('win'); }
assert.ok(ctx.sources.filter(n => !n.disconnected).length <= 24, 'bounded live voices');
audio.reset(); assert.ok(ctx.sources.every(n => n.disconnected), 'reset disconnects all sources');
ctx.currentTime++; audio.play('collect');
for (const source of ctx.sources.filter(n => !n.disconnected)) source.onended();
assert.ok(ctx.sources.every(n => n.disconnected), 'natural end cleanup');
Context.failClose = true;
audio.dispose(); audio.dispose();
assert.equal(await audio.unlock(), false);
assert.ok(ctx.gains[0].disconnected);
const countAfterDispose = ctx.sources.length; audio.play('win'); assert.equal(ctx.sources.length, countAfterDispose);
globalThis.AudioContext = class { constructor() { throw Error('unsupported'); } };
assert.equal(await createAudio().unlock(), false);
delete globalThis.AudioContext;
assert.equal(await createAudio().unlock(), false);
console.log('PASS WebAudio: all 11 events, unlock retry/suspension/failure, gain/mute, bounds, end/reset/dispose');

// Small DOM fixture implements only APIs exercised by UI; no third-party dependency.
class Element {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.attrs = {}; this.style = {}; this.listeners = new Map(); this.hidden = false; this.disabled = false; this.textContent = ''; }
  set id(v) { this.attrs.id = v; this.doc.ids.set(v, this); } get id() { return this.attrs.id; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return this.attrs[k] ?? null; }
  get parentNode() { return this.parent; } get nextSibling() { return this.parent?.children[this.parent.children.indexOf(this) + 1] || null; }
  appendChild(n) { n.remove(); n.parent = this; this.children.push(n); return n; }
  insertBefore(n, next) { n.remove(); n.parent = this; const i = this.children.indexOf(next); if (i < 0) this.children.push(n); else this.children.splice(i, 0, n); }
  remove() { if (this.parent) { this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; } }
  closest(selector) { return this.attrs.class === selector.slice(1) ? this : this.parent?.closest(selector); }
  querySelectorAll(selector) {
    const all = this.children.flatMap(c => [c, ...c.querySelectorAll('*')]);
    if (selector === '*') return all;
    if (selector === 'button[data-action]') return all.filter(n => n.tagName === 'BUTTON' && n.attrs['data-action']);
    if (selector.includes(':not(:disabled)')) return all.filter(n => ['BUTTON', 'INPUT'].includes(n.tagName) && !n.disabled);
    if (selector === 'button') return all.filter(n => n.tagName === 'BUTTON');
    if (selector.startsWith('.')) return all.filter(n => n.attrs.class === selector.slice(1));
    return [];
  }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  addEventListener(t, f) { if (!this.listeners.has(t)) this.listeners.set(t, new Set()); this.listeners.get(t).add(f); }
  removeEventListener(t, f) { this.listeners.get(t)?.delete(f); }
  emit(t, event = {}) { for (const f of this.listeners.get(t) || []) f({ target: this, ...event }); }
  click() { if (!this.disabled) this.emit('click'); }
  focus() { this.doc.activeElement = this; }
}
const doc = { ids: new Map(), getElementById(id) { return this.ids.get(id); }, createElement(tag) { return new Element(tag, this); } };
doc.body = new Element('body', doc); doc.querySelectorAll = s => doc.body.querySelectorAll(s);
// Parse the real index fixture's element nesting (not a browser HTML parser).
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const stack = [doc.body];
const body = html.split('<body>')[1].split('<script')[0];
for (const token of body.match(/<\/?(?:div|h1|h2|p|span|button|label|input)\b[^>]*>/g)) {
  if (token.startsWith('</')) { stack.pop(); continue; }
  const tag = token.match(/^<(\w+)/)[1]; const n = doc.createElement(tag);
  for (const match of token.matchAll(/([\w-]+)="([^"]*)"/g)) { if (match[1] === 'id') n.id = match[2]; else n.setAttribute(match[1], match[2]); }
  stack.at(-1).appendChild(n); if (tag !== 'input') stack.push(n);
}
globalThis.document = doc;
globalThis.window = new Element('window', doc);
const calls = [];
const callbacks = Object.fromEntries(['Start','Demo','Pause','Resume','Restart','Menu','VolumeChange','Mute'].map(key => [`on${key}`, (...a) => calls.push([key, ...a])]));
const ui = createUI(callbacks);
const get = id => doc.getElementById(id);
const snapshot = { state: 'MENU', mode: 'HUMAN', collected: 0, total: 3, health: 3, maxHealth: 3, objective: '三层遗迹目标', interactionPrompt: '' };
const render = overrides => ui.render({ ...snapshot, ...overrides }, { volume: .42, muted: true });
get('demo-button').disabled = true;
render({}); assert.equal(get('menu-screen').hidden, false); assert.equal(get('hud').hidden, true);
assert.equal(get('demo-button').disabled, true, 'does not enable unverified demo');
assert.equal(get('volume-slider').value, '.42'.replace(/^\./, '0.'));
assert.equal(get('mute-button').getAttribute('aria-pressed'), 'true');
get('start-button').click(); assert.deepEqual(calls.at(-1), ['Start']);
render({ state: 'PLAYING', mode: 'DEMO', collected: 2, health: 1, interactionPrompt: '按 E 挖掘' });
assert.equal(get('hud').hidden, false); assert.equal(get('demo-exit-button').hidden, false);
assert.equal(get('progress').textContent, '晶体 2 / 3');
assert.equal(get('health').getAttribute('data-low'), 'true');
get('demo-exit-button').click(); assert.deepEqual(calls.at(-1), ['Menu']);
get('help-button').click(); assert.deepEqual(calls.at(-1), ['Pause']);
render({ state: 'PAUSED' }); assert.equal(get('game-help').hidden, false);
assert.equal(doc.activeElement, get('close-help'));
get('close-help').click();
render({ state: 'WIN', collected: 3, exitOpen: true });
assert.equal(get('result-screen').hidden, false); assert.match(get('result-summary').textContent, /3\/3/);
render({ state: 'GAME_OVER', health: 0 }); assert.equal(get('result-screen').getAttribute('data-result'), 'GAME_OVER');
get('volume-slider').value = '.8'; get('volume-slider').emit('input'); assert.deepEqual(calls.at(-1), ['VolumeChange', .8]);
let prevented = false;
window.emit('keydown', { target: get('mute-button'), code: 'Space', preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
assert.equal(prevented, true); assert.deepEqual(calls.at(-1), ['Mute']);
const key = (target, code, extra = {}) => window.emit('keydown', { target, code, preventDefault() {}, stopImmediatePropagation() {}, ...extra });
const repeatedCount = calls.length;
key(get('mute-button'), 'Enter', { repeat: true }); assert.equal(calls.length, repeatedCount, 'key repeat is ignored');
key(get('mute-button'), 'Enter'); assert.deepEqual(calls.at(-1), ['Mute']);
let sliderPrevented = false;
key(get('volume-slider'), 'ArrowRight', { preventDefault() { sliderPrevented = true; } });
assert.equal(sliderPrevented, false, 'native slider keyboard behavior retained');
let movementStopped = false;
key(get('mute-button'), 'KeyW', { stopImmediatePropagation() { movementStopped = true; } });
assert.equal(movementStopped, true, 'button focus does not also drive player');
render({ state: 'PAUSED' });
get('resume-button').focus(); key(get('resume-button'), 'Tab', { shiftKey: true });
assert.equal(doc.activeElement, get('help-button'), 'shift Tab wraps through global tools');
get('help-button').click();
assert.equal(doc.activeElement, get('close-help'));
key(get('close-help'), 'Tab'); assert.equal(doc.activeElement, get('close-help'), 'help focus remains in help');
key(get('close-help'), 'Escape'); assert.equal(get('game-help').hidden, true);
assert.equal(doc.activeElement, get('help-button'), 'Escape returns help focus without toggling game pause');
get('restart-button').click(); assert.deepEqual(calls.at(-1), ['Restart']);
get('resume-button').click(); assert.deepEqual(calls.at(-1), ['Resume']);
get('pause-button').click(); assert.deepEqual(calls.at(-1), ['Pause']);
ui.announce('测试反馈'); assert.equal(get('game-announcement').textContent, '测试反馈');
render({}); assert.equal(get('game-announcement').textContent, '', 'state transition clears old announcement');
ui.setInputDevice('gamepad'); assert.match(get('help-text').textContent, /标准映射/);
const movedRow = get('volume-slider').closest('.volume-row');
ui.dispose(); assert.equal(movedRow.parentNode, get('menu-screen'), 'dispose restores original volume DOM');
const before = calls.length; get('start-button').click(); assert.equal(calls.length, before, 'dispose removes callbacks');
assert.equal([...window.listeners.values()].reduce((n, s) => n + s.size, 0), 0);
await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(rejections, [], 'no unhandled rejections');
console.log('PASS DOM simulation: states/HUD/results/Demo guard/help/volume/keyboard/callbacks/dispose');
console.log('LIMIT: simulated API and DOM only; no real-browser rendering or human auditory acceptance claimed.');
