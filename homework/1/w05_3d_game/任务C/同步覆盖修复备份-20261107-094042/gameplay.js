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
// 当前为【最小占位实现】：只撑起状态机外壳 + 快照约定，未实现真实收集/伤害/
// 出口/胜利判定。真实玩法由 C 写。A 只保证接口形状正确、可运行。
// ============================================================

import * as THREE from 'three';
import { GAME_STATE, GAME_MODE, GAME_RULES } from './config.js';
import { LEVEL } from './level.js';
import { createCollectibles } from './collectibles.js';
import { createHazards } from './hazards.js';
import { createExit } from './exit.js';

export function createGameSession({ scene, level }) {
  // 内部实体（由本模块统一创建/重置/更新）
  const collectibles = createCollectibles(scene);
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
    objective: '收集 3 个被掩埋的宝物',
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
    state.objective = '收集 3 个被掩埋的宝物';
  }

  function start(mode) {
    clearRun();
    state.mode = mode;
    state.state = GAME_STATE.PLAYING;
  }

  function restart() {
    // 保留当前模式，完整重置本局
    const mode = state.mode;
    clearRun();
    state.mode = mode;
    state.state = GAME_STATE.PLAYING;
  }

  function returnToMenu() {
    clearRun();
    state.mode = GAME_MODE.HUMAN;
    state.state = GAME_STATE.MENU;
  }

  function togglePause() {
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
    // 占位：非 PLAYING 不推进玩法；玩法态仅让晶体/hazard 视觉更新，
    // 不产生收集/伤害/胜利逻辑。真实玩法由 C 实现。
    if (state.state !== GAME_STATE.PLAYING) {
      return [];
    }

    collectibles.update(dt);
    hazards.update(dt, playerSnapshot);
    exit.update(dt);

    return [];
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
    collectibles.dispose();
    hazards.dispose();
    exit.dispose();
  }

  return { start, restart, returnToMenu, togglePause, update, getSnapshot, dispose };
}