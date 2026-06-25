(function () {
  "use strict";

  var STATE_VERSION = 1;
  var LEARNING_LOG_MAX = 300;

  // 成功回数のしきい値(暫定案)。配列は降順で、最初に条件を満たしたLvを採用する。
  var MASTERY_THRESHOLDS = [
    { level: 5, minSuccess: 10 },
    { level: 4, minSuccess: 6 },
    { level: 3, minSuccess: 3 },
    { level: 2, minSuccess: 1 },
    { level: 1, minSuccess: 0 }
  ];

  function getDefaultState() {
    return {
      version: STATE_VERSION,
      areas: {},
      mastery: {},
      learningLog: []
    };
  }

  function load() {
    var stored = window.Kuku99.Storage.load();
    if (!stored || typeof stored !== "object") {
      return getDefaultState();
    }
    // 欠けているフィールドはデフォルトで補う(将来のバージョン差分にも耐える)
    var defaults = getDefaultState();
    return {
      version: stored.version || defaults.version,
      areas: stored.areas || defaults.areas,
      mastery: stored.mastery || defaults.mastery,
      learningLog: Array.isArray(stored.learningLog) ? stored.learningLog : defaults.learningLog
    };
  }

  function save(state) {
    return window.Kuku99.Storage.save(state);
  }

  function reset() {
    window.Kuku99.Storage.clear();
    return getDefaultState();
  }

  function ensureAreaEntry(state, areaId) {
    if (!state.areas[areaId]) {
      state.areas[areaId] = { bossReached: false, bossCleared: false };
    }
    return state.areas[areaId];
  }

  function getAreaProgress(state, areaId) {
    return state.areas[areaId] || { bossReached: false, bossCleared: false };
  }

  function setBossReached(state, areaId) {
    var entry = ensureAreaEntry(state, areaId);
    entry.bossReached = true;
  }

  function setBossCleared(state, areaId) {
    var entry = ensureAreaEntry(state, areaId);
    entry.bossReached = true;
    entry.bossCleared = true;
  }

  function computeMasteryLevel(successCount) {
    for (var i = 0; i < MASTERY_THRESHOLDS.length; i++) {
      if (successCount >= MASTERY_THRESHOLDS[i].minSuccess) {
        return MASTERY_THRESHOLDS[i].level;
      }
    }
    return 1;
  }

  function ensureMasteryEntry(state, factKey, dan) {
    if (!state.mastery[factKey]) {
      state.mastery[factKey] = {
        factKey: factKey,
        dan: dan,
        successCount: 0,
        usedCount: 0,
        level: 1
      };
    }
    return state.mastery[factKey];
  }

  function getMastery(state, factKey) {
    return state.mastery[factKey] || { factKey: factKey, successCount: 0, usedCount: 0, level: 1 };
  }

  // correctだった場合だけsuccessCountを進める。usedCountは使用するたび(正誤問わず)進める。
  function recordCardResult(state, factKey, dan, correct) {
    var entry = ensureMasteryEntry(state, factKey, dan);
    entry.usedCount += 1;
    if (correct) {
      entry.successCount += 1;
    }
    entry.level = computeMasteryLevel(entry.successCount);
    return entry;
  }

  function appendLearningLog(state, entry) {
    state.learningLog.push(entry);
    if (state.learningLog.length > LEARNING_LOG_MAX) {
      state.learningLog.splice(0, state.learningLog.length - LEARNING_LOG_MAX);
    }
  }

  window.Kuku99 = window.Kuku99 || {};
  window.Kuku99.GameState = {
    LEARNING_LOG_MAX: LEARNING_LOG_MAX,
    getDefaultState: getDefaultState,
    load: load,
    save: save,
    reset: reset,
    getAreaProgress: getAreaProgress,
    setBossReached: setBossReached,
    setBossCleared: setBossCleared,
    getMastery: getMastery,
    recordCardResult: recordCardResult,
    computeMasteryLevel: computeMasteryLevel,
    appendLearningLog: appendLearningLog
  };
})();
