// Shared gameplay coordinates from the new Y-up asset manifest; meters, original scale.
import { ASSET_LEVEL } from './asset-level.js';

export const LEVEL = {
  spawn: { position: [...ASSET_LEVEL.spawn], yaw: 0 },
  bounds: {
    minX: -ASSET_LEVEL.size_xz[0] / 2, maxX: ASSET_LEVEL.size_xz[0] / 2,
    minZ: -ASSET_LEVEL.size_xz[1] / 2, maxZ: ASSET_LEVEL.size_xz[1] / 2,
  },
  playerRadius: ASSET_LEVEL.recommended_player_radius,
  playerHeight: ASSET_LEVEL.character_height,
  floorHeights: [...ASSET_LEVEL.floor_heights],
  treasures: ASSET_LEVEL.treasures.map((t) => ({
    ...t,
    assetId: t.id,
    id: `relic-${t.id}`,
    visualNode: t.visual_node,
    position: [...t.position],
    approach: [...t.approach],
    // Foot-level distance anchor, not the elevated gold/box visual center.
    interactionPosition: [t.position[0], ASSET_LEVEL.floor_heights[t.level - 1], t.position[2]],
  })),
  hazards: ASSET_LEVEL.hazards.map((h) => ({
    ...h,
    assetId: h.id,
    id: `spikes-${h.id}`,
    position: [...h.position],
    trigger_center: [...h.trigger_center],
    trigger_size: [...h.trigger_size],
    size: [...h.trigger_size],
    isTrigger: true,
    // A game-rule choice; the asset intentionally does not prescribe damage.
    damage: 1,
  })),
  exit: {
    position: [...ASSET_LEVEL.exit],
    approach: [0, -10, 11],
    // Runtime trigger/gate volume; manifest defines the exit point, not this size.
    size: [3, 3, 1],
  },
  // C integration: camera-relative real-input route through both stairs.
  // Verified by 任务C/demo-integration.mjs against manifest solids/support geometry.
  demoRoute: [
    { kind: 'move', target: [...ASSET_LEVEL.treasures[0].approach] },
    { kind: 'interact', treasureId: 'relic-1' },
    { kind: 'move', target: [-15, 0, 0] },
    { kind: 'move', target: [-15, 0, 11] },
    { kind: 'move', target: [-20, 0, 11] },
    { kind: 'move', target: [-20, -5, -1] },
    { kind: 'move', target: [0, -5, 0] },
    { kind: 'move', target: [...ASSET_LEVEL.treasures[1].approach] },
    { kind: 'interact', treasureId: 'relic-2' },
    { kind: 'move', target: [0, -5, 0] },
    { kind: 'move', target: [20, -5, 0] },
    { kind: 'move', target: [20, -10, -13.2] },
    { kind: 'move', target: [13, -10, -11.25] },
    { kind: 'move', target: [8, -10, -11.25] },
    { kind: 'move', target: [8, -10, -12.4] },
    { kind: 'move', target: [4, -10, -12.4] },
    { kind: 'move', target: [4, -10, -4.55] },
    { kind: 'move', target: [...ASSET_LEVEL.treasures[2].approach] },
    { kind: 'interact', treasureId: 'relic-3' },
    { kind: 'move', target: [0, -10, 11] },
    { kind: 'exit' },
  ],
};
