// B: all human devices produce the same frame as Demo. No game state lives here.
function emptyFrame() {
  return {
    moveX: 0, moveY: 0, lookX: 0, lookY: 0,
    jumpPressed: false, interactPressed: false, sprintHeld: false,
    pausePressed: false, confirmPressed: false, cancelPressed: false,
  };
}

export function createInput(targetElement) {
  let enabled = true;
  let lastDevice = 'keyboard';
  let mouseX = 0, mouseY = 0;
  let previousTime = performance.now();
  let disposed = false;
  const down = new Set();
  const edges = new Set();
  const padHistory = new Map();
  const tracked = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft',
    'ArrowRight', 'Space', 'KeyE', 'ShiftLeft', 'ShiftRight', 'Escape', 'Enter',
  ]);
  const removers = [];
  function listen(target, type, handler) {
    target.addEventListener(type, handler);
    removers.push(() => target.removeEventListener(type, handler));
  }
  function editing(event) {
    const el = event.target;
    return el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName);
  }
  function getPads() {
    try { return Array.from(navigator.getGamepads?.() || []).filter(Boolean); }
    catch { return []; }
  }
  function buttons(pad) { return Array.from(pad.buttons, b => b.pressed || b.value > 0.5); }
  function reset() {
    down.clear(); edges.clear(); mouseX = 0; mouseY = 0;
    padHistory.clear();
    // Held buttons must be released before they can produce another edge after reset.
    for (const pad of getPads()) padHistory.set(pad.index, buttons(pad));
    previousTime = performance.now();
  }
  listen(window, 'keydown', event => {
    if (!tracked.has(event.code) || editing(event)) return;
    event.preventDefault();
    if (!event.repeat && !down.has(event.code)) edges.add(event.code);
    down.add(event.code);
    lastDevice = 'keyboard';
  });
  listen(window, 'keyup', event => { down.delete(event.code); });
  listen(window, 'blur', reset);
  listen(document, 'visibilitychange', () => { if (document.hidden) reset(); });
  listen(window, 'gamepaddisconnected', event => { padHistory.delete(event.gamepad.index); });
  listen(window, 'gamepadconnected', event => {
    padHistory.set(event.gamepad.index, buttons(event.gamepad));
  });
  // Drag to orbit, or move freely if A requests pointer lock in a future integration.
  listen(targetElement, 'pointerdown', event => {
    if (event.button === 0 || event.button === 2) targetElement.focus?.({ preventScroll: true });
  });
  listen(targetElement, 'contextmenu', event => event.preventDefault());
  listen(window, 'pointermove', event => {
    const locked = document.pointerLockElement === targetElement;
    if (!enabled || document.hidden || (!locked && !(event.target === targetElement && (event.buttons & 3)))) return;
    mouseX += (event.movementX || 0) * 0.0025;
    mouseY += (event.movementY || 0) * 0.0025;
    lastDevice = 'mouse';
  });

  function stick(x = 0, y = 0) {
    const length = Math.hypot(x, y);
    if (length <= 0.15) return [0, 0];
    const scale = Math.min(1, (length - 0.15) / 0.85) / length;
    return [x * scale, y * scale];
  }
  function readFrame() {
    const frame = emptyFrame();
    if (disposed) return frame;
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    frame.pausePressed = edges.has('Escape');
    frame.cancelPressed = edges.has('Escape');
    frame.confirmPressed = edges.has('Enter') || edges.has('Space');
    if (enabled && !document.hidden) {
      const held = (...codes) => codes.some(code => down.has(code));
      frame.moveX = Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft'));
      frame.moveY = Number(held('KeyW', 'ArrowUp')) - Number(held('KeyS', 'ArrowDown'));
      frame.lookX = mouseX; frame.lookY = mouseY;
      frame.jumpPressed = edges.has('Space');
      frame.interactPressed = edges.has('KeyE');
      frame.sprintHeld = held('ShiftLeft', 'ShiftRight');
    }
    const connected = new Set();
    for (const pad of getPads()) {
      connected.add(pad.index);
      const current = buttons(pad);
      const previous = padHistory.get(pad.index) || [];
      const pressed = index => !!current[index] && !previous[index];
      // Only the standard browser mapping is claimed; unknown mappings are ignored.
      if (pad.mapping === 'standard' && !document.hidden) {
        const [mx, my] = stick(pad.axes[0], pad.axes[1]);
        const [lx, ly] = stick(pad.axes[2], pad.axes[3]);
        if (Math.hypot(mx, my, lx, ly) > 0 || current.some((value, i) => value && !previous[i])) lastDevice = 'gamepad';
        frame.pausePressed ||= pressed(9);
        frame.cancelPressed ||= pressed(1);
        frame.confirmPressed ||= pressed(0);
        if (enabled) {
          if (Math.hypot(mx, my) > Math.hypot(frame.moveX, frame.moveY)) {
            frame.moveX = mx; frame.moveY = -my;
          }
          frame.lookX += lx * 2.4 * dt;
          frame.lookY += ly * 1.8 * dt;
          frame.jumpPressed ||= pressed(0);
          frame.interactPressed ||= pressed(2);
          frame.sprintHeld ||= !!current[10];
        }
      }
      padHistory.set(pad.index, current);
    }
    for (const index of padHistory.keys()) if (!connected.has(index)) padHistory.delete(index);
    const length = Math.hypot(frame.moveX, frame.moveY);
    if (length > 1) { frame.moveX /= length; frame.moveY /= length; }
    mouseX = 0; mouseY = 0; edges.clear();
    return frame;
  }
  function setEnabled(flag) { enabled = !!flag; reset(); }
  function dispose() { reset(); disposed = true; removers.forEach(remove => remove()); }
  return { readFrame, reset, setEnabled, getLastDevice: () => lastDevice, dispose };
}
