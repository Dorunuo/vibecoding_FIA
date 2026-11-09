// C: presentation only. Session/audio snapshots remain the sole source of truth.
import { GAME_STATE, GAME_MODE } from './config.js';

export function createUI(callbacks = {}) {
  const el = id => document.getElementById(id);
  const removers = [], added = [];
  let disposed = false, previousState = null, state = GAME_STATE.MENU;
  let toastTimer = null, device = 'keyboard';
  const text = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
  const attr = (node, name, value) => node?.setAttribute(name, String(value));
  function listen(node, type, handler, options) {
    if (!node) return;
    node.addEventListener(type, handler, options);
    removers.push(() => node.removeEventListener(type, handler, options));
  }
  function add(tag, id, parent, content = '') {
    const node = document.createElement(tag);
    node.id = id; node.textContent = content;
    parent.appendChild(node); added.push(node);
    return node;
  }
  const menu = el('menu-screen'), pause = el('pause-screen'), result = el('result-screen');
  const hud = el('hud'), slider = el('volume-slider'), mute = el('mute-button');
  const volumeRow = slider?.closest('.volume-row');
  const originalVolumeParent = volumeRow?.parentNode, originalVolumeNext = volumeRow?.nextSibling;
  const toolbar = add('div', 'game-tools', document.body);
  if (volumeRow) toolbar.appendChild(volumeRow);
  const volumeValue = add('output', 'volume-value', toolbar);
  attr(volumeValue, 'for', 'volume-slider');
  attr(slider, 'aria-label', '主音量');
  const helpButton = add('button', 'help-button', toolbar, '操作帮助');
  attr(helpButton, 'aria-expanded', false); attr(helpButton, 'aria-controls', 'game-help');
  const help = add('section', 'game-help', document.body);
  help.hidden = true; attr(help, 'aria-label', '操作帮助');
  const helpText = add('p', 'help-text', help);
  const closeHelp = add('button', 'close-help', help, '关闭帮助');
  const deviceLabel = add('span', 'input-device', toolbar, '键鼠');
  const toast = add('div', 'game-announcement', document.body);
  attr(toast, 'role', 'status'); attr(toast, 'aria-live', 'polite'); attr(toast, 'aria-atomic', true);
  const exitStatus = add('span', 'exit-status', hud);
  const demoExit = add('button', 'demo-exit-button', hud, '退出演示');
  const resultSummary = add('p', 'result-summary', result);
  const menuHint = menu?.querySelector('.hint');
  // Keep A's disabled Demo button and loading/error labels untouched.
  if (menuHint) text(menuHint, '探索三层遗迹，收集全部晶体，打开出口并抵达终点。沿楼梯上下层，注意红色陷阱。');
  for (const [screen, label] of [[menu, '主菜单'], [pause, '暂停菜单'], [result, '本局结果']]) {
    attr(screen, 'role', 'region'); attr(screen, 'aria-label', label);
  }
  attr(el('interaction-prompt'), 'role', 'status');
  attr(el('interaction-prompt'), 'aria-live', 'polite');
  attr(el('progress'), 'aria-live', 'polite'); attr(el('health'), 'aria-live', 'polite');
  function invoke(name, ...args) { if (!disposed) callbacks[name]?.(...args); }
  for (const [id, callback] of Object.entries({
    'start-button': 'onStart', 'demo-button': 'onDemo', 'pause-button': 'onPause',
    'resume-button': 'onResume', 'mute-button': 'onMute',
  })) listen(el(id), 'click', () => invoke(callback));
  document.querySelectorAll('button[data-action]').forEach(button => {
    listen(button, 'click', () => invoke(button.getAttribute('data-action') === 'restart' ? 'onRestart' : 'onMenu'));
  });
  listen(demoExit, 'click', () => invoke('onMenu'));
  listen(slider, 'input', () => invoke('onVolumeChange', Number(slider.value)));
  function showHelp(open) {
    help.hidden = !open; attr(helpButton, 'aria-expanded', open);
    if (open) {
      // A help overlay must not leave the human running into a trap.
      if (state === GAME_STATE.PLAYING) invoke('onPause');
      closeHelp.focus();
    } else helpButton.focus();
  }
  listen(helpButton, 'click', () => showHelp(help.hidden));
  listen(closeHelp, 'click', () => showHelp(false));
  function setInputDevice(value) {
    device = value === 'gamepad' ? 'gamepad' : value === 'mouse' ? 'mouse' : 'keyboard';
    text(deviceLabel, device === 'gamepad' ? '手柄输入' : '键鼠输入');
    text(helpText, device === 'gamepad'
      ? '标准映射手柄：左摇杆移动，右摇杆镜头，A 跳跃，X 挖掘，左摇杆按下冲刺，Start 暂停。实际设备兼容性仍需实测。菜单请用键鼠操作。'
      : 'WASD / 方向键移动；拖动鼠标左键或右键环绕镜头；E 靠近晶体后挖掘；空格跳跃；Shift 冲刺；Esc 暂停/继续。沿楼梯探索上下层，集齐晶体后寻找已开启的出口。Tab 切换界面控件，Enter / 空格激活按钮，方向键调音量。');
  }
  setInputDevice('keyboard');
  // Capture stops B's window keydown preventDefault from swallowing native buttons.
  // Space is activated explicitly; Enter uses the same single click path.
  listen(window, 'keydown', event => {
    const target = event.target;
    if (help.hidden === false && event.code === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); showHelp(false); return;
    }
    if (target?.tagName === 'BUTTON' && ['Enter', 'Space'].includes(event.code)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat && !target.disabled) target.click();
    } else if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) {
      event.stopImmediatePropagation(); // retain native slider keys
    } else if (target?.tagName === 'BUTTON' && [
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'ArrowUp', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight',
    ].includes(event.code)) {
      // UI focus must not also move/dig/sprint the player behind the controls.
      event.preventDefault(); event.stopImmediatePropagation();
    }
    if (event.code === 'Tab') {
      const root = !help.hidden ? help : state === GAME_STATE.MENU ? menu : state === GAME_STATE.PAUSED ? pause :
        [GAME_STATE.WIN, GAME_STATE.GAME_OVER].includes(state) ? result : null;
      if (!root) return;
      const controls = [...root.querySelectorAll('button:not(:disabled), input:not(:disabled)'),
        ...(!help.hidden ? [] : toolbar.querySelectorAll('button:not(:disabled), input:not(:disabled)'))];
      const index = controls.indexOf(document.activeElement);
      if (!controls.length) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0)
        : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      controls[next].focus();
    }
  }, true);
  listen(window, 'pointerdown', () => { if (device !== 'mouse') setInputDevice('mouse'); });
  function visible(node, show, display = 'flex') {
    if (!node) return;
    node.hidden = !show; node.style.display = show ? display : 'none'; attr(node, 'aria-hidden', !show);
  }
  function render(s, audio) {
    if (disposed || !s) return;
    state = s.state;
    const playing = state === GAME_STATE.PLAYING;
    const finished = state === GAME_STATE.WIN || state === GAME_STATE.GAME_OVER;
    visible(menu, state === GAME_STATE.MENU); visible(pause, state === GAME_STATE.PAUSED);
    visible(result, finished); visible(hud, playing);
    visible(el('demo-badge'), s.mode === GAME_MODE.DEMO && playing, 'inline-flex');
    visible(demoExit, s.mode === GAME_MODE.DEMO && playing);
    text(el('demo-badge'), 'DEMO · 自动游玩');
    text(el('objective'), s.objective || '收集晶体，开启出口');
    text(el('progress'), `晶体 ${s.collected} / ${s.total}`);
    text(el('health'), `生命 ${s.health} / ${s.maxHealth}`);
    attr(el('health'), 'data-low', s.health <= 1);
    text(el('interaction-prompt'), s.interactionPrompt || '');
    visible(el('interaction-prompt'), !!s.interactionPrompt && playing, 'block');
    text(exitStatus, s.exitOpen ? '出口已开启' : '出口未开启');
    attr(exitStatus, 'data-open', !!s.exitOpen);
    if (finished) {
      text(el('result-message'), s.resultMessage || (state === GAME_STATE.WIN ? '遗迹探索成功！' : '探索中断'));
      attr(result, 'data-result', state);
      text(resultSummary, `${s.mode === GAME_MODE.DEMO ? '自动演示' : '本次探索'} · 晶体 ${s.collected}/${s.total} · 剩余生命 ${s.health}/${s.maxHealth}。${state === GAME_STATE.WIN ? '可以重新挑战，或返回菜单开始人工游玩。' : '留意陷阱节奏，重新开始再试一次。'}`);
    }
    if (audio) {
      if (slider) slider.value = String(audio.volume);
      const percent = Math.round(audio.volume * 100);
      text(volumeValue, audio.muted ? `静音（${percent}%）` : `${percent}%`);
      text(mute, audio.muted ? '取消静音' : '静音');
      attr(mute, 'aria-pressed', audio.muted); attr(mute, 'aria-label', audio.muted ? '取消静音' : '静音');
      attr(slider, 'aria-valuetext', `${percent}%${audio.muted ? '，当前静音' : ''}`);
    }
    if (state !== previousState) {
      if (toastTimer) clearTimeout(toastTimer);
      text(toast, '');
      if (previousState !== null && state !== GAME_STATE.PAUSED) { help.hidden = true; attr(helpButton, 'aria-expanded', false); }
      if (state === GAME_STATE.MENU) el('start-button')?.focus({ preventScroll: true });
      else if (state === GAME_STATE.PAUSED) (help.hidden ? el('resume-button') : closeHelp)?.focus({ preventScroll: true });
      else if (finished) result.querySelector('button')?.focus({ preventScroll: true });
      previousState = state;
    }
  }
  function announce(message, kind = 'info') {
    if (disposed) return;
    clearTimeout(toastTimer);
    text(toast, String(message || '')); attr(toast, 'data-kind', kind);
    toastTimer = setTimeout(() => { text(toast, ''); toastTimer = null; }, 4500);
  }
  function dispose() {
    if (disposed) return;
    disposed = true; clearTimeout(toastTimer); removers.forEach(remove => remove());
    if (volumeRow && originalVolumeParent) originalVolumeParent.insertBefore(volumeRow, originalVolumeNext);
    added.reverse().forEach(node => node.remove());
  }
  return { render, setInputDevice, announce, dispose };
}
