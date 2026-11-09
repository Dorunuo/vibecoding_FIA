// C：纯伤害触发区，不创建物理墙；同时支持恒定地刺与旧周期陷阱。
import { LEVEL } from './level.js';
import { GAME_EVENT, GAME_RULES } from './config.js';

// 玩家脚底线段与按身体尺寸扩张后的 AABB 相交，捕获高速下落穿越。
function sweptIntersection(from, to, min, max) {
  let enter = 0;
  let leave = 1;
  for (const axis of ['x', 'y', 'z']) {
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < 1e-10) {
      if (from[axis] < min[axis] || from[axis] > max[axis]) return false;
    } else {
      const a = (min[axis] - from[axis]) / delta;
      const b = (max[axis] - from[axis]) / delta;
      enter = Math.max(enter, Math.min(a, b));
      leave = Math.min(leave, Math.max(a, b));
      if (enter > leave) return false;
    }
  }
  return true;
}

export function createHazards(scene, level = LEVEL) {
  const radius = level.playerRadius ?? 0.62;
  const height = level.playerHeight ?? level.characterHeight ?? 1.79;
  const defs = level.hazards.map((h) => {
    const size = [...(h.trigger_size ?? h.triggerSize ?? h.size)];
    const explicitCenter = h.trigger_center ?? h.triggerCenter;
    const position = [...(explicitCenter ?? h.position)];
    // 旧灰盒的 position 是底面；manifest trigger_center 则是中心。
    if (!explicitCenter && h.type !== 'static_spikes') position[1] += size[1] / 2;
    return { ...h, position, size, damage: Number.isFinite(h.damage) ? Math.max(0, h.damage) : 1 };
  });
  let elapsed = 0;
  let invulnerable = 0;
  let previous = null;
  let disposed = false;

  function reset() { elapsed = 0; invulnerable = 0; previous = null; }

  function update(dt, playerSnapshot) {
    if (disposed || !Number.isFinite(dt) || dt < 0) return [];
    elapsed += dt;
    invulnerable = Math.max(0, invulnerable - dt);
    const p = playerSnapshot?.position;
    if (!p || ![p.x, p.y, p.z].every(Number.isFinite)) { previous = null; return []; }
    const from = previous ?? p;
    previous = { x: p.x, y: p.y, z: p.z };
    if (invulnerable > 1e-9) return [];
    for (const h of defs) {
      const phase = h.phase ?? 0;
      const active = h.type === 'static_spikes' || !(h.period > 0) ||
        ((elapsed + phase) % h.period + h.period) % h.period < (h.activeDuration ?? h.period);
      if (!active || h.damage <= 0) continue;
      const [x, y, z] = h.position;
      const [width, tall, depth] = h.size;
      // 足底以上 1.79m 身体与真实 1.10m 地刺区相交才伤害；不把整层高度当危险区。
      const min = { x: x - width / 2 - radius, y: y - tall / 2 - height, z: z - depth / 2 - radius };
      const max = { x: x + width / 2 + radius, y: y + tall / 2, z: z + depth / 2 + radius };
      if (sweptIntersection(from, p, min, max)) {
        invulnerable = GAME_RULES.hurtInvulnerability;
        return [{ type: GAME_EVENT.HURT, hazardId: h.id, damage: h.damage }];
      }
    }
    return [];
  }

  function dispose() { disposed = true; previous = null; }
  return { reset, update, dispose, defs };
}
