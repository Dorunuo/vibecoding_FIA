// C: local Web Audio synthesis only. No assets, network, timers or extra loop.
import { GAME_EVENT } from './config.js';

// [frequency, duration, delay, waveform, gain, endFrequency]
const SOUNDS = {
  [GAME_EVENT.STEP]: [[115, .065, 0, 'triangle', .14, 55]],
  [GAME_EVENT.JUMP]: [[230, .18, 0, 'sine', .22, 520]],
  [GAME_EVENT.LAND]: [[130, .13, 0, 'triangle', .24, 45]],
  [GAME_EVENT.DIG]: [[150, .13, 0, 'triangle', .22, 65], [200, .11, .15, 'triangle', .16, 80]],
  [GAME_EVENT.COLLECT]: [[523, .22, 0, 'sine', .22], [659, .24, .10, 'sine', .20], [784, .32, .20, 'sine', .18]],
  [GAME_EVENT.HURT]: [[190, .26, 0, 'sawtooth', .14, 65]],
  [GAME_EVENT.EXIT_LOCKED]: [[155, .13, 0, 'square', .09], [130, .19, .15, 'square', .09]],
  [GAME_EVENT.EXIT_OPEN]: [[262, .45, 0, 'triangle', .16], [330, .45, .14, 'triangle', .16], [392, .55, .28, 'triangle', .16]],
  [GAME_EVENT.WIN]: [[523, .24, 0, 'triangle', .18], [659, .24, .18, 'triangle', .18], [784, .24, .36, 'triangle', .18], [1047, .65, .54, 'sine', .20]],
  [GAME_EVENT.GAME_OVER]: [[330, .28, 0, 'triangle', .20], [262, .30, .24, 'triangle', .20], [165, .65, .48, 'triangle', .20]],
  [GAME_EVENT.UI_CLICK]: [[740, .065, 0, 'sine', .12, 520]],
};
const MAX_VOICES = 24;

export function createAudio() {
  let ctx = null, master = null, disposed = false;
  let volume = .7, muted = false;
  let unlocking = null;
  const voices = new Set();
  const lastPlayed = new Map();
  const safely = fn => { try { fn(); } catch { /* Audio is optional, gameplay is not. */ } };

  function applyVolume() {
    if (!ctx || !master) return;
    safely(() => {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      // A short ramp prevents abrupt gain discontinuities/clicks.
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(muted ? 0 : volume, now + .015);
    });
  }

  // Always fulfills, including synchronous API failures and rejected resume().
  // Calling again after an autoplay rejection or OS suspension retries resume.
  function unlock() {
    if (disposed) return Promise.resolve(false);
    if (unlocking) return unlocking;
    try {
      if (!ctx || ctx.state === 'closed') {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) return Promise.resolve(false);
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : volume;
        master.connect(ctx.destination);
      }
      const pending = ctx.state === 'running' ? undefined : ctx.resume();
      unlocking = Promise.resolve(pending).then(() => !disposed && ctx?.state === 'running', () => false)
        .finally(() => { unlocking = null; });
      return unlocking;
    } catch {
      // A partially initialized context must not leak or prevent a later retry.
      const broken = ctx;
      ctx = null; master = null;
      safely(() => Promise.resolve(broken?.close()).catch(() => {}));
      return Promise.resolve(false);
    }
  }

  function release(voice, stop = false) {
    if (!voices.delete(voice)) return;
    voice.osc.onended = null;
    if (stop) safely(() => voice.osc.stop());
    safely(() => voice.osc.disconnect());
    safely(() => voice.gain.disconnect());
  }

  function play(eventType) {
    if (disposed || !ctx || !master || ctx.state !== 'running' || muted || volume === 0) return;
    const recipe = SOUNDS[eventType];
    if (!recipe) return;
    const now = ctx.currentTime;
    // Defensive throttling for repeated events; no suspended-context backlog.
    const interval = eventType === GAME_EVENT.STEP ? .085 : .04;
    if (now - (lastPlayed.get(eventType) ?? -Infinity) < interval) return;
    lastPlayed.set(eventType, now);
    for (const [frequency, duration, delay, type, amplitude, end = frequency] of recipe) {
      while (voices.size >= MAX_VOICES) release(voices.values().next().value, true);
      let voice;
      try {
        const osc = ctx.createOscillator();
        voice = { osc, gain: null };
        voices.add(voice);
        const gain = ctx.createGain();
        voice.gain = gain;
        const start = now + delay;
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, start);
        osc.frequency.exponentialRampToValueAtTime(end, start + duration);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(amplitude, start + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        osc.connect(gain); gain.connect(master);
        osc.onended = () => release(voice);
        osc.start(start); osc.stop(start + duration + .025);
      } catch {
        if (voice) release(voice, true);
      }
    }
  }

  function setVolume(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    volume = Math.max(0, Math.min(1, number));
    applyVolume();
  }
  function toggleMute() { muted = !muted; applyVolume(); return muted; }
  function getSnapshot() { return { volume, muted }; }
  function reset() {
    for (const voice of [...voices]) release(voice, true);
    lastPlayed.clear();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    reset();
    safely(() => master?.disconnect());
    const old = ctx;
    ctx = null; master = null;
    safely(() => Promise.resolve(old?.close()).catch(() => {}));
  }
  return { unlock, play, setVolume, toggleMute, getSnapshot, reset, dispose };
}
