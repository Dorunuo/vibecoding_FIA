// ============================================================
// gameplay.js —— 唯一主修改人：C
//
// createGameSession({ scene, level }) 返回：
//   start(mode), restart(), returnToMenu(), togglePause(),
//   update(dt, input, playerSnapshot, playerApi), getSnapshot(), dispose()
//
// 契约要点：
//   - 管理 GAME_STATE / GAME_MODE、晶体、陷阱、生命、计数、出口。
//   - 只有 C 能改当前游戏状态；初始状态 MENU、默认 HUMAN。
//   - getSnapshot() 提供 state/mode/collected/total/health/maxHealth/exitOpen/
//     objective/interactionPrompt/resultMessage/treasures/exit。
//   - update 返回 GameEvent[]：dig/collect/hurt/exit_locked/exit_open/win/game_over。
//   - 由本模块统一创建/重置/更新 collectibles/hazards/exit。
//
// 地刺素材接入：真实宝藏计数、三维触发伤害/无敌、失败与集齐开门。
// Demo 路线不在此构造；音频由主循环消费既有事件。
// ============================================================

import { GAME_STATE, GAME_MODE, GAME_RULES, GAME_EVENT, PLAYER_ACTION } from './config.js';
import { createCollectibles, TREASURE_STATE } from './collectibles.js';
import { createHazards } from './hazards.js';
import { createExit } from './exit.js';

export function createGameSession({ scene, level }) {
  // 内部实体（由本模块统一创建/重置/更新）
  const collectibles = createCollectibles(scene, level);
  let disposed = false;
  const hazards = createHazards(scene, level);
  const exit = createExit(scene, level);
  let wasAtExit = false;

  const state = {
    state: GAME_STATE.MENU,
    mode: GAME_MODE.HUMAN,
    collected: 0,
    total: level.treasures.length, // 从 level 读取，冻结为 3
    health: GAME_RULES.maxHealth,
    maxHealth: GAME_RULES.maxHealth,
    exitOpen: false,
    objective: `寻找 ${level.treasures.length} 个金色晶体标记：靠近土堆/木盒，站稳按 E 收集`,
    interactionPrompt: '',
    resultMessage: '',
  };

  function clearRun() {
    collectibles.reset();
    hazards.reset();
    exit.reset();
    wasAtExit = false;
    state.collected = 0;
    state.health = GAME_RULES.maxHealth;
    state.exitOpen = false;
    state.interactionPrompt = '';
    state.resultMessage = '';
    state.objective = `金色晶体标记 ${state.collected}/${state.total}：靠近土堆/木盒，站稳按 E（按提示楼层前往）`;
  }

  function start(mode = GAME_MODE.HUMAN) {
    if (disposed) return;
    clearRun();
    state.mode = mode === GAME_MODE.DEMO ? GAME_MODE.DEMO : GAME_MODE.HUMAN;
    state.state = GAME_STATE.PLAYING;
  }

  function restart() {
    if (disposed) return;
    // 保留当前模式，完整重置本局
    const mode = state.mode;
    clearRun();
    state.mode = mode;
    state.state = GAME_STATE.PLAYING;
  }

  function returnToMenu() {
    if (disposed) return;
    clearRun();
    state.mode = GAME_MODE.HUMAN;
    state.state = GAME_STATE.MENU;
  }

  function togglePause() {
    if (disposed) return false;
    if (state.state === GAME_STATE.PLAYING) {
      state.state = GAME_STATE.PAUSED;
      return true;
    }
    if (state.state === GAME_STATE.PAUSED) {
      state.state = GAME_STATE.PLAYING;
      return true;
    }
    return false;
  }

  function update(dt, input, playerSnapshot, playerApi) {
    // 非游戏态及非法时间步不消费互动，也不推进动画或挖掘计时。
    if (disposed || state.state !== GAME_STATE.PLAYING || !Number.isFinite(dt) || dt < 0) {
      return [];
    }

    const events = hazards.update(dt, playerSnapshot);
    const hurtThisFrame = events.some(event => event.type === GAME_EVENT.HURT);
    // 所有有效伤害（包括非致死）先中断挖掘，再应用 hurt；不能释放新 hurt 锁。
    if (hurtThisFrame) collectibles.cancel(playerSnapshot, playerApi);
    for (const event of events) {
      if (event.type !== GAME_EVENT.HURT) continue;
      state.health = Math.max(0, state.health - event.damage);
      playerApi?.playAction?.(PLAYER_ACTION.HURT, 0.3, { lockMovement: true });
    }
    // 同帧死亡优先于收集/出口，不能以死亡那一帧开门取胜。
    if (state.health <= 0) {
      state.state = GAME_STATE.GAME_OVER;
      state.objective = '探索失败';
      state.interactionPrompt = '';
      state.resultMessage = '生命耗尽，请重新探索并避开地刺。';
      events.push({ type: GAME_EVENT.GAME_OVER });
      return events;
    }
    // 主循环传入的是伤害前快照；本帧不能借旧 controlLocked=false 重新开始。
    const interactionSnapshot = hurtThisFrame
      ? { ...playerSnapshot, action: PLAYER_ACTION.HURT, controlLocked: true }
      : playerSnapshot;
    events.push(...collectibles.update(dt, hurtThisFrame ? {} : input, interactionSnapshot, playerApi));
    // 从状态派生，避免重复事件、重开或多帧更新造成重复累计。
    state.collected = collectibles.getStates().filter(
      (item) => item.state === TREASURE_STATE.COLLECTED,
    ).length;
    state.interactionPrompt = collectibles.getInteractionPrompt();
    if (!state.exitOpen && state.collected === state.total) {
      state.exitOpen = true;
      exit.setOpen(true);
      events.push({ type: GAME_EVENT.EXIT_OPEN });
    }
    state.objective = state.exitOpen
      ? '出口已开启，进入发光门框完成探索'
      : `金色晶体标记 ${state.collected}/${state.total}：靠近土堆/木盒，站稳按 E（按提示楼层前往）`;
    exit.update(dt);

    const atExit = exit.contains(playerSnapshot?.position);
    if (atExit && !state.exitOpen) {
      state.interactionPrompt = `出口尚未开启，还需收集 ${state.total - state.collected} 个宝物`;
      // 一次进入只发送一次；站在区域内/连续按 E 不反复发送。
      if (!wasAtExit) events.push({ type: GAME_EVENT.EXIT_LOCKED });
    } else if (atExit && state.exitOpen) {
      state.state = GAME_STATE.WIN;
      state.objective = '探索完成';
      state.interactionPrompt = '';
      state.resultMessage = `探索成功！已找回全部 ${state.total} 个宝物并抵达出口。`;
      events.push({ type: GAME_EVENT.WIN });
      // 当前 B 的 playAction 会同步 pose，因此 main 下一帧停止 update 仍能显示胜利定格。
      // 使用公开接口，不推进第二主循环、不直接写角色内部状态。
      playerApi?.playAction?.(PLAYER_ACTION.VICTORY, 1, { lockMovement: true });
    }
    wasAtExit = atExit;

    return events;
  }

  function getSnapshot() {
    return {
      state: state.state,
      mode: state.mode,
      collected: state.collected,
      total: state.total,
      health: state.health,
      maxHealth: state.maxHealth,
      exitOpen: state.exitOpen,
      objective: state.objective,
      interactionPrompt: state.interactionPrompt,
      resultMessage: state.resultMessage,
      treasures: collectibles.getStates(), // id/state/position（只读副本）
      exit: exit.getSnapshot(),
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    collectibles.dispose();
    hazards.dispose();
    exit.dispose();
  }

  return { start, restart, returnToMenu, togglePause, update, getSnapshot, dispose };
}