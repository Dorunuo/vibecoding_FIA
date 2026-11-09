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
// 第 1 批：真实晶体交互与会话复位已实现。
// 陷阱/出口/胜负仍是占位，不在本批提前接入；唯一计数来源是晶体状态。
// ============================================================

import { GAME_STATE, GAME_MODE, GAME_RULES } from './config.js';
import { createCollectibles, TREASURE_STATE } from './collectibles.js';
import { createHazards } from './hazards.js';
import { createExit } from './exit.js';

export function createGameSession({ scene, level }) {
  // 内部实体（由本模块统一创建/重置/更新）
  const collectibles = createCollectibles(scene, level);
  let disposed = false;
  const hazards = createHazards(scene);
  const exit = createExit(scene);

  const state = {
    state: GAME_STATE.MENU,
    mode: GAME_MODE.HUMAN,
    collected: 0,
    total: level.treasures.length, // 从 level 读取，冻结为 3
    health: GAME_RULES.maxHealth,
    maxHealth: GAME_RULES.maxHealth,
    exitOpen: false,
    objective: `收集 ${level.treasures.length} 个被掩埋的宝物`,
    interactionPrompt: '',
    resultMessage: '',
  };

  function clearRun() {
    collectibles.reset();
    hazards.reset();
    exit.reset();
    state.collected = 0;
    state.health = GAME_RULES.maxHealth;
    state.exitOpen = false;
    state.interactionPrompt = '';
    state.resultMessage = '';
    state.objective = `收集 ${state.total} 个被掩埋的宝物`;
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

    const events = collectibles.update(dt, input, playerSnapshot, playerApi);
    // 从状态派生，避免重复事件、重开或多帧更新造成重复累计。
    state.collected = collectibles.getStates().filter(
      (item) => item.state === TREASURE_STATE.COLLECTED,
    ).length;
    state.interactionPrompt = collectibles.getInteractionPrompt();
    state.objective = state.collected === state.total
      ? '晶体已收集完毕（本批尚未接入出口通关）'
      : `收集 ${state.total} 个被掩埋的宝物`;
    hazards.update(dt, playerSnapshot);
    exit.update(dt);

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