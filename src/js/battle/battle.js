(function () {
  "use strict";

  var Cards = window.Kuku99.Cards;
  var Yomi = window.Kuku99.Yomi;
  var GameState = window.Kuku99.GameState;

  // ============================================================
  // 敵行動確率テーブル
  // ============================================================

  var NORMAL_ENEMY_PROBS = {
    normal1: [
      { type: "none",    weight: 50 },
      { type: "opening", weight: 25 },
      { type: "guard",   weight: 15 },
      { type: "counter", weight: 10 }
    ],
    normal2: [
      { type: "none",    weight: 45 },
      { type: "opening", weight: 20 },
      { type: "guard",   weight: 20 },
      { type: "counter", weight: 15 }
    ],
    normal3: [
      { type: "none",    weight: 40 },
      { type: "opening", weight: 15 },
      { type: "guard",   weight: 25 },
      { type: "counter", weight: 20 }
    ]
  };

  var BOSS_ENEMY_PROBS = [
    { type: "none",       weight: 15 },
    { type: "bossAttack", weight: 45 },
    { type: "guard",      weight: 20 },
    { type: "powerUp",    weight: 10 },
    { type: "opening",    weight: 10 }
  ];

  // 将来用ラスボス定義(漆黒の塔)
  var LAST_BOSS_ENEMY_PROBS = [ // eslint-disable-line no-unused-vars
    { type: "none",       weight:  5 },
    { type: "bossAttack", weight: 60 },
    { type: "guard",      weight: 15 },
    { type: "powerUp",    weight: 15 },
    { type: "opening",    weight:  5 }
  ];

  // ============================================================
  // ユーティリティ
  // ============================================================

  function weightedRandom(probs) {
    var total = 0;
    for (var i = 0; i < probs.length; i++) total += probs[i].weight;
    var r = Math.floor(Math.random() * total);
    var cum = 0;
    for (var j = 0; j < probs.length; j++) {
      cum += probs[j].weight;
      if (r < cum) return probs[j].type;
    }
    return probs[probs.length - 1].type;
  }

  // ============================================================
  // セッション生成
  // ============================================================

  function createBattleSession(areaDef, stage, gameState) {
    var stageType = stage === "boss" ? "boss" : "normal";
    var deck = Cards.buildDeck(areaDef, stageType);
    var hand = [];
    for (var i = 0; i < 5; i++) {
      hand.push(deck.shift());
    }
    var enemyHp = areaDef.enemyHp[stage];

    return {
      areaDef: areaDef,
      stage: stage,
      gameState: gameState,
      hp: 5,
      maxHp: 5,
      enemyHp: enemyHp,
      enemyMaxHp: enemyHp,
      deck: deck,
      hand: hand,
      trash: [],
      combo: 0,
      initialDeckSize: 30,
      enemyState: {
        guard: false,
        powerUp: false,    // ボス専用: 次のボス攻撃を強化
        opening: false,    // 次のプレイヤー行動1回だけ有効
        lastActionWasCounter: false  // ザコ反撃連続防止
      },
      pendingAttack: null, // { question, kind:"boss"|"counter", powered:bool }
      battleLog: [],
      ended: false,
      outcome: null
    };
  }

  // ============================================================
  // 内部ヘルパー
  // ============================================================

  function checkAnswer(card, answerInput) {
    return Number(answerInput) === card.answer;
  }

  function returnCardToDeck(session, card) {
    var deck = session.deck;
    var backHalfStart = Math.floor(deck.length / 2);
    var insertIndex = backHalfStart + Math.floor(Math.random() * (deck.length - backHalfStart + 1));
    deck.splice(insertIndex, 0, card);
  }

  function refillHand(session) {
    while (session.hand.length < 5 && session.deck.length > 0) {
      session.hand.push(session.deck.shift());
    }
  }

  function checkBattleEnd(session) {
    if (session.ended) return;
    if (session.enemyHp <= 0) {
      session.ended = true;
      session.outcome = "win";
      return;
    }
    if (session.hp <= 0) {
      session.ended = true;
      session.outcome = session.stage === "boss" ? "lose" : "retreat";
      return;
    }
    if (session.deck.length === 0 && session.hand.length === 0) {
      session.ended = true;
      session.outcome = session.stage === "boss" ? "lose" : "retreat";
      return;
    }
  }

  function buildLogEntry(card, correct, answerInput, extra) {
    var entry = {
      timestamp: Date.now(),
      uid: card.uid,
      kind: card.kind,
      element: card.element || null,
      a: card.a,
      b: card.b,
      answer: card.answer,
      factKey: card.factKey,
      dan: card.dan,
      correct: correct,
      answerInput: answerInput
    };
    for (var key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) {
        entry[key] = extra[key];
      }
    }
    return entry;
  }

  // ============================================================
  // 敵行動
  // ============================================================

  // プレイヤー行動後に毎回呼ぶ。sessionを更新しつつ行動結果オブジェクトを返す。
  function triggerEnemyAction(session) {
    if (session.ended) return { type: "none", label: null };

    var state = session.enemyState;
    var stage = session.stage;

    var probs = stage === "boss"
      ? BOSS_ENEMY_PROBS
      : (NORMAL_ENEMY_PROBS[stage] || NORMAL_ENEMY_PROBS.normal1);

    // 制約チェック付き抽選（最大10回リトライ）
    var chosen = "none";
    for (var t = 0; t < 10; t++) {
      var candidate = weightedRandom(probs);
      if (candidate === "counter" && state.lastActionWasCounter) continue;
      if (candidate === "guard"   && state.guard)               continue;
      if (candidate === "opening" && state.opening)             continue;
      if (candidate === "powerUp" && state.powerUp)             continue;
      chosen = candidate;
      break;
    }

    var result = { type: chosen, label: null, question: null, powered: false };
    var dan = session.areaDef.dan;

    if (chosen === "guard") {
      state.guard = true;
      state.lastActionWasCounter = false;
      result.label = stage === "boss"
        ? "ボスがガードした！ 次の攻撃ダメージを50%にする"
        : "敵がガードした！ 次の攻撃ダメージを70%にする";

    } else if (chosen === "powerUp") {
      state.powerUp = true;
      state.lastActionWasCounter = false;
      result.label = "ボスが力をためた！ 次のこうげきをミスするとハート-2";

    } else if (chosen === "opening") {
      state.opening = true;
      state.lastActionWasCounter = false;
      result.label = "敵が隙を見せた！ " + dan + "の段のかけ算で正解するとダメージ+50%";

    } else if (chosen === "counter" || chosen === "bossAttack") {
      var isPowered = chosen === "bossAttack" && state.powerUp;
      var q = Cards.createMulCard(dan, Cards.randomInt(1, 9));
      session.pendingAttack = {
        question: q,
        kind: chosen === "counter" ? "counter" : "boss",
        powered: isPowered
      };
      state.lastActionWasCounter = (chosen === "counter");
      result.question = q;
      result.powered = isPowered;
      if (chosen === "counter") {
        result.label = "敵の反撃！";
      } else if (isPowered) {
        result.label = "ボスの強いこうげき！";
      } else {
        result.label = "ボスのこうげき！";
      }

    } else {
      // none
      state.lastActionWasCounter = false;
    }

    return result;
  }

  // ============================================================
  // プレイヤー行動
  // ============================================================

  function playCard(session, cardUid, answerInput) {
    if (session.ended) return { error: "battle-ended" };
    if (session.pendingAttack) return { error: "enemy-attack-pending" };

    var index = -1;
    for (var i = 0; i < session.hand.length; i++) {
      if (session.hand[i].uid === cardUid) { index = i; break; }
    }
    if (index === -1) return { error: "card-not-found" };

    var card = session.hand.splice(index, 1)[0];
    var correct = checkAnswer(card, answerInput);

    // 隙あり: プレイヤー行動1回でリセット（正誤・種類問わず）
    var hadOpening = session.enemyState.opening;
    session.enemyState.opening = false;

    var logEntry;

    if (correct) {
      session.combo += 1;

      if (card.kind === "mul" || card.kind === "add") {
        var masteryLevel = card.kind === "mul"
          ? GameState.getMastery(session.gameState, card.factKey).level
          : 1;
        var baseDamage = Cards.calcDamage(card, session.areaDef, masteryLevel, session.combo);

        // 隙ありボーナス: 対象段のかけ算カードで正解したとき+50%
        var openingBonus = hadOpening && card.kind === "mul" && card.dan === session.areaDef.dan;

        // ガード軽減: 攻撃が当たったら解除
        var guardActive = session.enemyState.guard;
        var guardMult = 1.0;
        if (guardActive) {
          guardMult = session.stage === "boss" ? 0.5 : 0.7;
          session.enemyState.guard = false;
        }

        var preGuardDamage = openingBonus ? Math.round(baseDamage * 1.5) : baseDamage;
        var finalDamage = Math.round(preGuardDamage * guardMult);
        if (finalDamage < 1) finalDamage = 1;

        // UI表示用の補正内訳（計算結果と最終ダメージを分離して表示するため）
        var noComboBase = Cards.calcDamage(card, session.areaDef, masteryLevel, 1);
        var comboBonusAmount = (session.combo >= 2) ? baseDamage - noComboBase : 0;
        var openingBonusAmount = openingBonus ? preGuardDamage - baseDamage : 0;
        var guardReductionAmount = guardActive ? preGuardDamage - finalDamage : 0;

        session.enemyHp = Math.max(0, session.enemyHp - finalDamage);
        logEntry = buildLogEntry(card, true, answerInput, {
          damage: finalDamage,
          baseDamage: baseDamage,
          openingBonus: openingBonus,
          guardActive: guardActive,
          guardMult: guardMult,
          comboAtHit: session.combo,
          damageBreakdown: {
            formulaResult: card.answer,
            comboBonusAmount: comboBonusAmount,
            openingBonusAmount: openingBonusAmount,
            guardReductionAmount: guardReductionAmount,
            finalDamage: finalDamage
          }
        });
      } else {
        // sub: 回復。ガードは維持したまま（攻撃ではないため）
        session.hp = Math.min(session.maxHp, session.hp + card.healAmount);
        logEntry = buildLogEntry(card, true, answerInput, { heal: card.healAmount });
      }
      session.trash.push(card);

    } else {
      session.hp -= 1;
      session.combo = 0;
      // ミスではガードは解除しない
      var hint = card.kind === "mul" ? Yomi.getHint(card.dan) : null;
      logEntry = buildLogEntry(card, false, answerInput, { hint: hint });
      returnCardToDeck(session, card);
    }

    session.battleLog.push(logEntry);
    refillHand(session);
    checkBattleEnd(session);

    var enemyAction = null;
    if (!session.ended) {
      enemyAction = triggerEnemyAction(session);
    }

    return {
      correct: correct,
      ended: session.ended,
      outcome: session.outcome,
      logEntry: logEntry,
      enemyAction: enemyAction
    };
  }

  // 敵攻撃（ボス攻撃・ザコ反撃）への解答
  function resolveEnemyAttack(session, answerInput) {
    if (session.ended) return { error: "battle-ended" };
    if (!session.pendingAttack) return { error: "no-pending-attack" };

    var attack = session.pendingAttack;
    var question = attack.question;
    var correct = checkAnswer(question, answerInput);
    var hpDamage = 0;

    if (!correct) {
      hpDamage = attack.powered ? 2 : 1;
      session.hp -= hpDamage;
      session.combo = 0;
    }
    // 正解時はコンボ維持（増やさない）

    // 力ため状態は攻撃解決後に解除
    if (attack.powered) {
      session.enemyState.powerUp = false;
    }

    var logEntry = buildLogEntry(question, correct, answerInput, {
      isBossAttack: attack.kind === "boss",
      isCounter: attack.kind === "counter",
      powered: attack.powered,
      hpDamage: hpDamage
    });
    session.battleLog.push(logEntry);
    session.pendingAttack = null;

    checkBattleEnd(session);

    return {
      correct: correct,
      ended: session.ended,
      outcome: session.outcome,
      logEntry: logEntry,
      hpDamage: hpDamage,
      powered: attack.powered
    };
  }

  // 旧名の後方互換エイリアス
  function resolveBossAttack(session, answerInput) {
    return resolveEnemyAttack(session, answerInput);
  }

  function changeHand(session) {
    if (session.ended) return { error: "battle-ended" };
    if (session.pendingAttack) return { error: "enemy-attack-pending" };
    if (session.hp < 2) return { error: "not-enough-hp" };

    session.hp -= 1;
    session.deck = Cards.shuffleArray(session.deck.concat(session.hand));
    session.hand = [];
    session.enemyState.opening = false;  // 手札チェンジで隙あり解除
    refillHand(session);
    checkBattleEnd(session);

    var enemyAction = null;
    if (!session.ended) {
      enemyAction = triggerEnemyAction(session);
    }

    return { ended: session.ended, outcome: session.outcome, enemyAction: enemyAction };
  }

  // バトル終了時に1回だけ呼ぶ
  function finalizeBattle(session) {
    var gameState = session.gameState;
    var areaDef = session.areaDef;

    session.battleLog.forEach(function (entry) {
      if (entry.kind === "mul" && !entry.isBossAttack && !entry.isCounter) {
        GameState.recordCardResult(gameState, entry.factKey, entry.dan, entry.correct);
      }
      GameState.appendLearningLog(gameState, {
        timestamp: entry.timestamp,
        areaId: areaDef.id,
        stage: session.stage,
        kind: entry.isBossAttack ? "bossAttack" : entry.isCounter ? "counter" : entry.kind,
        a: entry.a,
        b: entry.b,
        answer: entry.answer,
        answerInput: entry.answerInput,
        correct: entry.correct,
        damage: entry.damage || null,
        heal: entry.heal || null
      });
    });

    if (session.stage === "boss") {
      if (session.outcome === "win") {
        GameState.setBossCleared(gameState, areaDef.id);
      } else {
        GameState.setBossReached(gameState, areaDef.id);
      }
    }

    GameState.save(gameState);

    // まちがえた問題: 手札カードのみ（ボス攻撃・反撃は除く）
    var mistakes = session.battleLog.filter(function (entry) {
      return entry.correct === false && !entry.isBossAttack && !entry.isCounter;
    });

    return {
      outcome: session.outcome,
      areaId: areaDef.id,
      stage: session.stage,
      finalHp: session.hp,
      finalEnemyHp: session.enemyHp,
      mistakes: mistakes
    };
  }

  window.Kuku99 = window.Kuku99 || {};
  window.Kuku99.Battle = {
    createBattleSession: createBattleSession,
    playCard: playCard,
    resolveEnemyAttack: resolveEnemyAttack,
    resolveBossAttack: resolveBossAttack,
    changeHand: changeHand,
    finalizeBattle: finalizeBattle
  };
})();
