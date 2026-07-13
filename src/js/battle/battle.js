(function () {
  "use strict";

  var Cards = window.Kuku99.Cards;
  var Yomi = window.Kuku99.Yomi;
  var GameState = window.Kuku99.GameState;

  // ============================================================
  // 敵行動確率テーブル
  // ============================================================

  var NORMAL_ENEMY_PROBS = {
    normal1: [  // スライム: 攻撃少なめ、無駄行動多め
      { type: "none",    weight: 50 },
      { type: "opening", weight: 15 },
      { type: "guard",   weight: 10 },
      { type: "counter", weight: 25 }
    ],
    normal2: [  // バット: 攻撃普通
      { type: "none",    weight: 30 },
      { type: "opening", weight: 15 },
      { type: "guard",   weight: 20 },
      { type: "counter", weight: 35 }
    ],
    normal3: [  // ゴーレム: ガード高め・力ためあり
      { type: "none",    weight: 5 },
      { type: "opening", weight: 10 },
      { type: "guard",   weight: 35 },
      { type: "counter", weight: 35 },
      { type: "powerUp", weight: 15 }
    ]
  };

  var BOSS_ENEMY_PROBS = [  // ドラゴン: 攻撃多め・力ため強め
    { type: "none",       weight: 5 },
    { type: "bossAttack", weight: 50 },
    { type: "guard",      weight: 15 },
    { type: "powerUp",    weight: 20 },
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

  // 上級通常敵行動テーブル（none なし）。intimidateは上級敵らしさの軸として少し出やすめに調整。
  var UPPER_ENEMY_PROBS = {
    normal1: [  // ウルフ: バランス型
      { type: "counter",    weight: 34 },
      { type: "guard",      weight: 20 },
      { type: "opening",    weight: 16 },
      { type: "powerUp",    weight: 15 },
      { type: "intimidate", weight: 15 }
    ],
    normal2: [  // グリフォン: 攻撃寄り
      { type: "counter",    weight: 38 },
      { type: "guard",      weight: 17 },
      { type: "opening",    weight: 12 },
      { type: "powerUp",    weight: 18 },
      { type: "intimidate", weight: 15 }
    ],
    normal3: [  // タイタン: ガード・力ため強め
      { type: "counter",    weight: 30 },
      { type: "guard",      weight: 29 },
      { type: "powerUp",    weight: 22 },
      { type: "opening",    weight: 4 },
      { type: "intimidate", weight: 15 }
    ],
    // 漆黒の塔 低層4戦（2026-07-09）。フォールバックに頼らず個別定義。闇侵食・闇バリアは未実装のため素の行動傾向のみ。
    stage1: [  // シャドウスライム: 上級normal1相当のバランス型
      { type: "counter",    weight: 34 },
      { type: "guard",      weight: 20 },
      { type: "opening",    weight: 16 },
      { type: "powerUp",    weight: 15 },
      { type: "intimidate", weight: 15 }
    ],
    stage2: [  // シャドウバット: 上級normal2相当の攻撃寄り
      { type: "counter",    weight: 38 },
      { type: "guard",      weight: 17 },
      { type: "opening",    weight: 12 },
      { type: "powerUp",    weight: 18 },
      { type: "intimidate", weight: 15 }
    ],
    stage3: [  // ダークゴーレム: 上級normal3相当のガード・力ため強め
      { type: "counter",    weight: 30 },
      { type: "guard",      weight: 29 },
      { type: "powerUp",    weight: 22 },
      { type: "opening",    weight: 4 },
      { type: "intimidate", weight: 15 }
    ],
    stage4: [  // ダークドラゴン: 低層の締め。normal3よりやや攻撃的だがboss未満に抑制
      { type: "counter",    weight: 36 },
      { type: "guard",      weight: 24 },
      { type: "powerUp",    weight: 22 },
      { type: "opening",    weight: 3 },
      { type: "intimidate", weight: 15 }
    ],
    // 漆黒の塔 高層4戦（2026-07-12）。アビスウォールの存在感を強めるため低層よりguard/counterの比重を高めに調整。
    stage5: [  // ナイトウルフ: normal1よりやや強め
      { type: "counter",    weight: 36 },
      { type: "guard",      weight: 18 },
      { type: "opening",    weight: 12 },
      { type: "powerUp",    weight: 18 },
      { type: "intimidate", weight: 16 }
    ],
    stage6: [  // ナイトグリフォン: normal2より攻撃寄り
      { type: "counter",    weight: 40 },
      { type: "guard",      weight: 15 },
      { type: "opening",    weight: 10 },
      { type: "powerUp",    weight: 20 },
      { type: "intimidate", weight: 15 }
    ],
    stage7: [  // アビスタイタン: normal3より重め
      { type: "counter",    weight: 34 },
      { type: "guard",      weight: 24 },
      { type: "opening",    weight: 4 },
      { type: "powerUp",    weight: 24 },
      { type: "intimidate", weight: 14 }
    ],
    stage8: [  // アビスベヒーモス: 高層締め。ボス寄りだがstage扱い（bossAttackではなくcounter）
      { type: "counter",    weight: 38 },
      { type: "guard",      weight: 18 },
      { type: "opening",    weight: 6 },
      { type: "powerUp",    weight: 20 },
      { type: "intimidate", weight: 18 }
    ]
  };

  // 上級ボス行動テーブル（none なし）。intimidateは上級敵らしさの軸として少し出やすめに調整。
  var UPPER_BOSS_ENEMY_PROBS = [  // ベヒーモス: 攻撃多め
    { type: "bossAttack",  weight: 35 },
    { type: "guard",       weight: 20 },
    { type: "powerUp",     weight: 17 },
    { type: "opening",     weight: 8 },
    { type: "intimidate",  weight: 20 }
  ];

  // ============================================================
  // ユーティリティ
  // ============================================================

  function isAdvancedArea(areaDef) {
    return areaDef && (areaDef.rank === "upper" || areaDef.rank === "last");
  }

  // 攻撃ミス時のハート減少量（rank に応じて分岐）
  function getEnemyAttackHpDamage(session, attack) {
    var advanced = isAdvancedArea(session.areaDef);
    if (attack.kind === "boss") {
      return advanced ? (attack.powered ? 5 : 3) : (attack.powered ? 3 : 2);
    }
    return advanced ? (attack.powered ? 3 : 2) : (attack.powered ? 2 : 1);
  }

  // 力ため後の難問優先: 7,8,9 → 4,6 → ランダム
  function pickHardB() {
    var r = Math.random();
    if (r < 0.60) return [7, 8, 9][Math.floor(Math.random() * 3)];
    if (r < 0.85) return [4, 6][Math.floor(Math.random() * 2)];
    return Cards.randomInt(1, 9);
  }

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

  // 会心率: sub(回復)は0、add(足し算)は5%、ホーリー(1×1)は100%、mul(かけ算)は1を含む場合に高率
  function getCriticalRate(card) {
    if (card.kind === "sub") return 0;
    if (card.kind === "add") return 0.05;
    if (isHolyCard(card)) return 1.0;
    var a = card.a, b = card.b;
    var hasOne = (a === 1 || b === 1);
    if (!hasOne) return 0.05;
    var other = (a === 1) ? b : a;
    if (other === 1) return 0.80;
    if (other <= 4) return 0.60;
    return 0.40;
  }

  // 特殊カード判定
  function isHolyCard(card) {
    return card.kind === "mul" && card.a === 1 && card.b === 1;
  }

  function isMeteorCard(card) {
    return card.kind === "mul" && card.a === 9 && card.b === 9;
  }

  // ホーリー専用属性ボーナス: 通常の弱点属性計算とは別枠（会心100%化とあわせて none:21 / grass・fire・water:31〜32 / dark:42 相当になる）
  var HOLY_BASE_DAMAGE = 21;
  var HOLY_BONUS_RATE = { none: 0, grass: 0.5, fire: 0.5, water: 0.5, dark: 1.0 };
  function getHolyBonusRate(enemyType) {
    return HOLY_BONUS_RATE.hasOwnProperty(enemyType) ? HOLY_BONUS_RATE[enemyType] : 0;
  }

  // ============================================================
  // セッション生成
  // ============================================================

  // アビスウォール破壊に必要な異なる段数。stage4〜stage8はすべて2種類版（2026-07-12、stage8を3→2に変更。
  // アビスベヒーモス戦の重さ・ラスボス草/火形態との統一を理由に見直し。ラスボスfinalBossPhasesは
  // areas.js側で別管理のため、この変更・このテーブルはラスボス側の値には影響しない）。
  var ABYSS_WALL_REQUIRED_COUNT = {
    shikkoku: { stage4: 2, stage5: 2, stage6: 2, stage7: 2, stage8: 2 }
  };

  function getAbyssWallRequiredCount(areaDef, stage) {
    var areaTable = ABYSS_WALL_REQUIRED_COUNT[areaDef.id];
    return (areaTable && areaTable[stage]) || 0;
  }

  function createBattleSession(areaDef, stage, gameState) {
    var stageType = stage === "boss" ? "boss" : "normal";
    // ラスボス（漆黒の塔第9戦）判定: finalBossPhasesを持つエリアのbossステージのみ対象。
    // 既存の8エリア・漆黒の塔stage1〜8はfinalBossPhasesを持たないため常にfalseになる。
    var isFinalBoss = stage === "boss" && !!(areaDef.finalBossPhases && areaDef.finalBossPhases.length);

    var deck = Cards.buildDeck(areaDef, stageType);
    var hand = [];
    for (var i = 0; i < 5; i++) {
      hand.push(deck.shift());
    }

    var enemyHp, abyssWallRequired, initialDeckSize;
    if (isFinalBoss) {
      var phase0 = areaDef.finalBossPhases[0];
      enemyHp = phase0.hp;
      abyssWallRequired = (phase0.hasAbyssWall && phase0.hasAbyssWall.requiredCount) || 0;
      // ラスボス専用35枚デッキは手札配布後の残数(30)を表示分母にする（要件定義書セクション70）。
      // 既存エリアの「総デッキ数を分母にする」挙動とは意図的に異なる。
      initialDeckSize = deck.length;
    } else {
      enemyHp = areaDef.enemyHp[stage];
      abyssWallRequired = getAbyssWallRequiredCount(areaDef, stage);
      initialDeckSize = 30;
    }

    var session = {
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
      initialDeckSize: initialDeckSize,
      regenCounter: 0,
      enemyState: {
        guard: false,
        powerUp: false,    // ボス専用: 次のボス攻撃を強化
        opening: false,    // 次のプレイヤー行動1回だけ有効
        lastActionWasCounter: false,  // ザコ反撃連続防止
        intimidateLocked: [],  // 威嚇でロック中の手札uid（上級敵専用）
        // アビスウォール（漆黒の塔専用）。active な間のみ機能する。requiredCount=0のエリア/ステージではnull。
        abyssWall: abyssWallRequired > 0 ? {
          active: true,
          requiredCount: abyssWallRequired,
          usedDans: [],    // 正解済みの異なる段（重複追加しない）
          broken: false    // requiredCount分そろったら true（以後復活しない）
        } : null
      },
      pendingAttack: null, // { question, kind:"boss"|"counter", powered:bool }
      battleLog: [],
      ended: false,
      outcome: null
    };

    if (isFinalBoss) {
      session.finalBossPhaseIndex = 0;             // 現在のフェーズ番号（0=草, 1=火, 2=水, 3=堕天）
      session.finalBossPhases = areaDef.finalBossPhases; // areaDef.finalBossPhasesへの参照（areaDef自体は書き換えない）
    }

    return session;
  }

  // ============================================================
  // ラスボス4フェーズ連戦（漆黒の塔第9戦専用）
  // ============================================================
  // session.finalBossPhaseIndexの有無でラスボス戦かどうかを判定する。既存areaDef（8エリア＋
  // 漆黒の塔stage1〜8）はこのプロパティを持たないため、以下のヘルパーは常に「ラスボス戦ではない」
  // 側の分岐（従来通りareaDef.enemyType/areaDef.weaknessを返す）を通り、既存挙動に影響しない。

  function isFinalBossBattle(session) {
    return session.finalBossPhaseIndex !== undefined;
  }

  function getCurrentFinalBossPhase(session) {
    if (!isFinalBossBattle(session)) return null;
    return session.finalBossPhases[session.finalBossPhaseIndex];
  }

  // ホーリー属性ボーナス等、敵タイプに応じた計算で使う。ラスボス戦以外は従来通りareaDef.enemyTypeを返す。
  function getCurrentEnemyType(session) {
    var phase = getCurrentFinalBossPhase(session);
    return phase ? phase.enemyType : session.areaDef.enemyType;
  }

  // 弱点ボーナス計算で使う。ラスボス戦以外は従来通りareaDef.weaknessを返す。
  // 全形態光属性弱点のため現状はareaDef.weaknessと同値だが、将来フェーズ別に弱点が変わっても
  // 壊れないよう、ラスボス関連のダメージ計算はこのヘルパー経由に統一する。
  function getCurrentWeaknessType(session) {
    var phase = getCurrentFinalBossPhase(session);
    return phase ? phase.weaknessType : session.areaDef.weakness;
  }

  // 中間フェーズ（草・火・水）のHPが0になった際に次フェーズへ切り替える。
  // 山札・手札・捨て札を破棄し、bossDeckComposition比率で新規35枚デッキ（手札5+山札30）を
  // 作り直す。敵の一時状態（guard/powerUp/opening/intimidateLocked/pendingAttack/abyssWall）と
  // regenCounter・comboもリセットする。ハート(session.hp)は一切変更しない（持ち越し、+1回復は未実装）。
  function advanceFinalBossPhase(session) {
    var previousIndex = session.finalBossPhaseIndex;
    var previousPhase = session.finalBossPhases[previousIndex];
    session.finalBossPhaseIndex += 1;
    var nextPhase = session.finalBossPhases[session.finalBossPhaseIndex];

    session.enemyHp = nextPhase.hp;
    session.enemyMaxHp = nextPhase.hp;
    session.regenCounter = 0;

    session.enemyState.guard = false;
    session.enemyState.powerUp = false;
    session.enemyState.opening = false;
    session.enemyState.lastActionWasCounter = false;
    session.enemyState.intimidateLocked = [];
    var requiredCount = (nextPhase.hasAbyssWall && nextPhase.hasAbyssWall.requiredCount) || 0;
    session.enemyState.abyssWall = requiredCount > 0
      ? { active: true, requiredCount: requiredCount, usedDans: [], broken: false }
      : null;
    session.pendingAttack = null;

    var freshDeck = Cards.buildDeck(session.areaDef, "boss");
    var newHand = [];
    for (var i = 0; i < 5; i++) { newHand.push(freshDeck.shift()); }
    session.deck = freshDeck;
    session.hand = newHand;
    session.trash = [];
    session.combo = 0;
    session.initialDeckSize = freshDeck.length; // 新フェーズも30/30表示に戻す

    return {
      phaseAdvanced: true,
      previousPhaseIndex: previousIndex,
      currentPhaseIndex: session.finalBossPhaseIndex,
      previousPhase: previousPhase,
      currentPhase: nextPhase,
      deckRefilled: true,
      handRedealt: true
    };
  }

  // 敵HPが0になった直後に呼ぶ。ラスボス戦かつ次フェーズが残っていればadvanceFinalBossPhase()を
  // 実行してphaseTransition情報を返す。それ以外（通常エリア／ラスボス最終フェーズ）はnullを返し、
  // 呼び出し側（playCard）が従来通りcheckBattleEnd()で勝敗判定する。
  function tryAdvanceFinalBossPhase(session) {
    if (!isFinalBossBattle(session)) return null;
    if (session.enemyHp > 0) return null;
    if (session.finalBossPhaseIndex >= session.finalBossPhases.length - 1) return null;
    return advanceFinalBossPhase(session);
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

  // ガードは「次のプレイヤー行動1回」で消費される一時防御。メテオ貫通時も消費する。
  function clearGuardAfterPlayerAction(session) {
    session.enemyState.guard = false;
  }

  // アビスウォール軽減: 未破壊なら最終ダメージを70%軽減（最終ダメージの30%を通す、最低1）。
  // 通常ガードとは別種の防御のため、メテオ・ホーリーであっても軽減を受ける（両者を貫通しない）。
  // かけ算カードで初めて使う段はusedDansへ追加し、requiredCountに達したらbrokenにする（復活しない）。
  // 引き算・足し算カードはカウントに寄与しない（このカードが呼ばれるのはmul/addの攻撃時のみ）。
  function applyAbyssWallDefense(session, card, finalDamage) {
    var wall = session.enemyState.abyssWall;
    if (!wall || !wall.active || wall.broken) {
      return { finalDamage: finalDamage, reduced: false, reductionAmount: 0, newDan: false, justBroken: false };
    }
    var reducedDamage = finalDamage > 0 ? Math.max(1, Math.ceil(finalDamage * 0.3)) : 0;
    var newDan = false;
    var justBroken = false;
    if (card.kind === "mul" && wall.usedDans.indexOf(card.dan) === -1) {
      wall.usedDans.push(card.dan);
      newDan = true;
      if (wall.usedDans.length >= wall.requiredCount) {
        wall.broken = true;
        justBroken = true;
      }
    }
    return {
      finalDamage: reducedDamage,
      reduced: true,
      reductionAmount: finalDamage - reducedDamage,
      newDan: newDan,
      justBroken: justBroken
    };
  }

  function refillHand(session) {
    var newCards = [];
    // null スロット（使用済みカード位置）を同スロットで補充
    for (var i = 0; i < session.hand.length; i++) {
      if (session.hand[i] === null && session.deck.length > 0) {
        var newCard = session.deck.shift();
        session.hand[i] = newCard;
        newCards.push(newCard);
      }
    }
    // 山札切れで補充できなかった null スロットを除去
    session.hand = session.hand.filter(function (c) { return c !== null; });
    // 手札交換など手札が 5 枚未満の場合は末尾に補充
    while (session.hand.length < 5 && session.deck.length > 0) {
      var nc = session.deck.shift();
      session.hand.push(nc);
      newCards.push(nc);
    }
    return newCards;
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
  // 草属性リジェネ
  // ============================================================

  // ラスボス戦は現在フェーズが草のときだけリジェネ対象（getCurrentEnemyType経由）。
  // 通常エリアは従来通りareaDef.enemyType固定判定のまま（既存挙動に影響しない）。
  function isGrassRegenArea(session) {
    if (isFinalBossBattle(session)) {
      return getCurrentEnemyType(session) === "grass";
    }
    var area = session.areaDef;
    return area && area.enemyType === "grass";
  }

  function maybeApplyEnemyRegen(session) {
    if (!isGrassRegenArea(session)) return null;
    if (session.ended || session.enemyHp <= 0) return null;

    session.regenCounter = (session.regenCounter || 0) + 1;

    // ラスボス草形態はareas.js finalBossPhases[0].grassRegen（rate/interval）専用値を使う。
    // 既存の上級草属性エリア（7%/3行動）とは別枠。areaDef.rank等の既存分岐には触れない。
    var interval, regenRate;
    if (isFinalBossBattle(session)) {
      var phase = getCurrentFinalBossPhase(session);
      var cfg = phase && phase.grassRegen;
      interval = (cfg && cfg.interval) || 4;
      regenRate = (cfg && cfg.rate) || 0.03;
    } else {
      interval = 3;
      var area = session.areaDef;
      regenRate = (area.rank === "upper" || area.rank === "last") ? 0.07 : 0.05;
    }

    if (session.regenCounter % interval !== 0) return null;
    if (session.enemyHp >= session.enemyMaxHp) return null;

    var before = session.enemyHp;
    var heal = Math.max(1, Math.ceil(session.enemyMaxHp * regenRate));
    session.enemyHp = Math.min(session.enemyMaxHp, session.enemyHp + heal);

    var actualHeal = session.enemyHp - before;
    if (actualHeal <= 0) return null;

    return {
      type: "enemyRegen",
      heal: actualHeal,
      beforeHp: before,
      afterHp: session.enemyHp
    };
  }

  // ============================================================
  // 敵行動
  // ============================================================

  // プレイヤー行動後に毎回呼ぶ。sessionを更新しつつ行動結果オブジェクトを返す。
  function triggerEnemyAction(session) {
    if (session.ended) return { type: "none", label: null };

    var state = session.enemyState;
    var stage = session.stage;
    var advanced = isAdvancedArea(session.areaDef);

    var chosen;

    // 力ため後は攻撃を強制（抽選しない）
    if (state.powerUp) {
      chosen = stage === "boss" ? "bossAttack" : "counter";
    } else {
      var probs;
      if (advanced) {
        probs = stage === "boss"
          ? UPPER_BOSS_ENEMY_PROBS
          : (UPPER_ENEMY_PROBS[stage] || UPPER_ENEMY_PROBS.normal1);
      } else {
        probs = stage === "boss"
          ? BOSS_ENEMY_PROBS
          : (NORMAL_ENEMY_PROBS[stage] || NORMAL_ENEMY_PROBS.normal1);
      }

      // 制約チェック付き抽選（最大10回リトライ）
      // アビスウォール未破壊中は、通常ガードとの役割重複・演出の重なりを避けるため guard を候補から除外する
      // （テーブル自体からguardを削除せず、抽選時の制約として実装。破壊後は通常どおりguardを選べる）。
      var abyssWallBlocksGuard = !!(state.abyssWall && state.abyssWall.active && !state.abyssWall.broken);
      chosen = "none";
      for (var t = 0; t < 10; t++) {
        var candidate = weightedRandom(probs);
        if (candidate === "guard"      && (state.guard || abyssWallBlocksGuard)) continue;
        if (candidate === "opening"    && state.opening) continue;
        if (candidate === "powerUp"    && state.powerUp) continue;
        if (candidate === "intimidate" && (state.intimidateLocked.length > 0 || session.hand.length < 2)) continue;
        chosen = candidate;
        break;
      }

      // 上級エリアでは none を許さない: fallback として攻撃を選ぶ
      if (advanced && chosen === "none") {
        chosen = stage === "boss" ? "bossAttack" : "counter";
      }
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
      if (stage === "boss") {
        result.label = advanced
          ? "ボスが力をためた！ 次のこうげきをミスするとハート-5"
          : "ボスが力をためた！ 次のこうげきをミスするとハート-3";
      } else {
        result.label = advanced
          ? "敵が力をためた！ 次のこうげきをミスするとハート-3"
          : "敵が力をためた！ 次のこうげきをミスするとハート-2";
      }

    } else if (chosen === "opening") {
      state.opening = true;
      state.lastActionWasCounter = false;
      result.label = "敵が隙を見せた！ " + dan + "の段のかけ算で正解するとダメージ+50%";

    } else if (chosen === "intimidate") {
      state.lastActionWasCounter = false;
      var targetLockCount = stage === "boss" ? 3 : 2;
      // 最低1枚は使用可能カードを残す
      var lockableCount = Math.max(0, session.hand.length - 1);
      var lockCount = Math.min(targetLockCount, lockableCount);
      var lockCandidates = session.hand.map(function (c) { return c.uid; });
      for (var si = lockCandidates.length - 1; si > 0; si--) {
        var sj = Math.floor(Math.random() * (si + 1));
        var tmp = lockCandidates[si];
        lockCandidates[si] = lockCandidates[sj];
        lockCandidates[sj] = tmp;
      }
      state.intimidateLocked = lockCandidates.slice(0, lockCount);
      result.lockedCount = state.intimidateLocked.length;
      // ラベルは敵名を知るUI側（showEnemyAction）で組み立てる

    } else if (chosen === "counter" || chosen === "bossAttack") {
      var isPowered = state.powerUp;  // 力ため後の攻撃は常にpowered
      var bVal = isPowered ? pickHardB() : Cards.randomInt(1, 9);
      var q = Cards.createMulCard(dan, bVal);
      session.pendingAttack = {
        question: q,
        kind: chosen === "counter" ? "counter" : "boss",
        powered: isPowered
      };
      state.lastActionWasCounter = (chosen === "counter");
      result.question = q;
      result.powered = isPowered;

      if (chosen === "counter") {
        result.label = isPowered ? "敵が力をこめた反撃！" : "敵の反撃！";
      } else if (isPowered) {
        result.label = "力をこめた強力なこうげき！";
      } else {
        result.label = "ボスの強力なこうげき！";
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
    if (session.enemyState.intimidateLocked.indexOf(cardUid) !== -1) return { error: "card-intimidate-locked" };

    var card = session.hand[index];
    session.hand[index] = null;
    var correct = checkAnswer(card, answerInput);

    // 威嚇ロック: 使用可能カードを1枚使ったら解除
    if (session.enemyState.intimidateLocked.length > 0) {
      session.enemyState.intimidateLocked = [];
    }

    // 隙あり: プレイヤー行動1回でリセット（正誤・種類問わず）
    var hadOpening = session.enemyState.opening;
    session.enemyState.opening = false;

    var logEntry;

    if (correct) {
      session.combo += 1;

      if (card.kind === "mul" || card.kind === "add") {
        // 基礎ダメージ = カードの答え（熟練度補正なし）
        var baseRawDamage = card.answer;

        // ランク補正: 低ランクカードで高ランク相手を攻撃すると半減
        var lowDanReduced = false;
        if (card.kind === "mul") {
          var defenderIsHigh = session.areaDef.rank === "upper" || session.areaDef.rank === "last";
          if (card.rank === "lower" && defenderIsHigh) {
            baseRawDamage = Math.round(baseRawDamage * 0.5);
            lowDanReduced = true;
          }
        }

        // 上級エリアへの足し算攻撃半減（引き算回復は対象外）
        var addAdvancedReduced = false;
        if (card.kind === "add") {
          var addDefenderIsHigh = session.areaDef.rank === "upper" || session.areaDef.rank === "last";
          if (addDefenderIsHigh) {
            baseRawDamage = Math.round(baseRawDamage * 0.5);
            addAdvancedReduced = true;
          }
        }

        // 弱点ボーナス: 基礎ダメージにだけ適用（足し算カードは弱点なし）
        var isWeakness = card.kind === "mul" && card.element !== "none" && card.element === getCurrentWeaknessType(session);
        var weaknessBonusAmount = isWeakness ? Math.round(baseRawDamage * 0.5) : 0;

        // コンボボーナス: 基礎ダメージ基準で加算
        var comboBonusAmount = Math.round(baseRawDamage * (Cards.getComboMultiplier(session.combo) - 1));

        // 隙ありボーナス: 対象段のかけ算カードで正解したとき+50%（基礎ダメージ基準）
        var openingBonus = hadOpening && card.kind === "mul" && card.dan === session.areaDef.dan;
        var openingBonusAmount = openingBonus ? Math.round(baseRawDamage * 0.5) : 0;

        // 会心判定: +10ダメージ（ホーリー1×1は会心確定・2回判定）
        var critRate = getCriticalRate(card);
        var isHoly = isHolyCard(card);
        var isMeteor = isMeteorCard(card);
        var criticalCount;
        if (isHoly) {
          criticalCount = (Math.random() < critRate ? 1 : 0) + (Math.random() < critRate ? 1 : 0);
        } else {
          criticalCount = Math.random() < critRate ? 1 : 0;
        }
        var critical = criticalCount > 0;
        var criticalBonusAmount = criticalCount * 10;

        // ホーリー専用属性ボーナス: 通常の弱点計算(weaknessBonusAmount)とは別枠。敵タイプ(enemyType)基準。
        var holyBonusRate = isHoly ? getHolyBonusRate(getCurrentEnemyType(session)) : 0;
        var holyBonusAmount = isHoly ? Math.round(HOLY_BASE_DAMAGE * holyBonusRate) : 0;

        // ガード軽減: 会心より先に適用（メテオ9×9はガードを貫通するが、ガード状態は消費する）
        var guardActive = session.enemyState.guard;
        var guardMult = 1.0;
        if (guardActive && !isMeteor) {
          guardMult = session.stage === "boss" ? 0.5 : 0.7;
        }
        clearGuardAfterPlayerAction(session);

        // 会心ボーナス・ホーリー属性ボーナスはガード後に加算（ガードで気持ちよさを削らない）
        var preGuardDamage = baseRawDamage + weaknessBonusAmount + comboBonusAmount + openingBonusAmount;
        var guardedDamage = Math.round(preGuardDamage * guardMult);
        var finalDamage = guardedDamage + criticalBonusAmount + holyBonusAmount;
        if (finalDamage < 1) finalDamage = 1;
        var guardReductionAmount = guardActive && !isMeteor ? preGuardDamage - guardedDamage : 0;

        // アビスウォール軽減（通常ガードとは別枠。メテオ・ホーリーも軽減対象、ダメージ計算の最後段で適用）
        var abyssWallResult = applyAbyssWallDefense(session, card, finalDamage);
        finalDamage = abyssWallResult.finalDamage;

        session.enemyHp = Math.max(0, session.enemyHp - finalDamage);
        logEntry = buildLogEntry(card, true, answerInput, {
          damage: finalDamage,
          baseDamage: baseRawDamage,
          openingBonus: openingBonus,
          guardActive: guardActive,
          guardMult: guardMult,
          comboAtHit: session.combo,
          damageBreakdown: {
            formulaResult: card.answer,
            baseRawDamage: baseRawDamage,
            addAdvancedReduced: addAdvancedReduced,
            lowDanReduced: lowDanReduced,
            weakness: isWeakness,
            weaknessBonusAmount: weaknessBonusAmount,
            comboBonusAmount: comboBonusAmount,
            openingBonus: openingBonus,
            openingBonusAmount: openingBonusAmount,
            holy: isHoly,
            holyBonusRate: holyBonusRate,
            holyBonusAmount: holyBonusAmount,
            criticalCount: criticalCount,
            critical: critical,
            criticalRate: critRate,
            criticalBonusAmount: criticalBonusAmount,
            meteor: isMeteor,
            ignoreGuard: isMeteor && guardActive,
            guardActive: guardActive,
            guardMult: guardMult,
            guardReductionAmount: guardReductionAmount,
            abyssWallReduced: abyssWallResult.reduced,
            abyssWallReductionAmount: abyssWallResult.reductionAmount,
            abyssWallNewDan: abyssWallResult.newDan,
            abyssWallJustBroken: abyssWallResult.justBroken,
            abyssWallDan: card.dan,
            finalDamage: finalDamage
          }
        });
      } else {
        // sub: 回復。攻撃ではないが、プレイヤー行動1回としてガードは解除する
        session.hp = Math.min(session.maxHp, session.hp + card.healAmount);
        logEntry = buildLogEntry(card, true, answerInput, { heal: card.healAmount });
        clearGuardAfterPlayerAction(session);
      }
      session.trash.push(card);

    } else {
      session.hp -= 1;
      session.combo = 0;
      // 不正解でダメージを与えなくても、プレイヤー行動1回としてガードは解除する
      var hint = card.kind === "mul" ? Yomi.getHint(card.dan) : null;
      logEntry = buildLogEntry(card, false, answerInput, { hint: hint });
      returnCardToDeck(session, card);
      clearGuardAfterPlayerAction(session);
    }

    session.battleLog.push(logEntry);

    // ラスボス戦：中間フェーズ（草/火/水）のHP0はrefillHand()より先に判定する。
    // 判定後にadvanceFinalBossPhase()が山札・手札を丸ごと作り直すため、既存手札への補充は無駄になり、
    // newCardsに次フェーズの手札には存在しないuidが混ざるのを避けるため、この順序にしている。
    var phaseTransition = tryAdvanceFinalBossPhase(session);
    var newCards = phaseTransition ? [] : refillHand(session);
    if (!phaseTransition) {
      checkBattleEnd(session);
    }

    var enemyAction = null;
    if (!session.ended && !phaseTransition) {
      enemyAction = triggerEnemyAction(session);
    }

    var regenResult = null;
    if (!session.ended && !phaseTransition) {
      regenResult = maybeApplyEnemyRegen(session);
    }

    return {
      correct: correct,
      ended: session.ended,
      outcome: session.outcome,
      logEntry: logEntry,
      enemyAction: enemyAction,
      enemyRegen: regenResult,
      newCards: newCards,
      phaseTransition: phaseTransition
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
      hpDamage = getEnemyAttackHpDamage(session, attack);
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
    session.enemyState.intimidateLocked = [];  // 手札チェンジで威嚇ロック解除
    clearGuardAfterPlayerAction(session);  // 手札チェンジもプレイヤー行動1回としてガード解除
    refillHand(session);
    checkBattleEnd(session);

    var enemyAction = null;
    if (!session.ended) {
      enemyAction = triggerEnemyAction(session);
    }

    var regenResult = null;
    if (!session.ended) {
      regenResult = maybeApplyEnemyRegen(session);
    }

    return { ended: session.ended, outcome: session.outcome, enemyAction: enemyAction, enemyRegen: regenResult };
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
    } else {
      if (session.outcome === "win") {
        GameState.setNormalCleared(gameState, areaDef.id, session.stage);
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
    finalizeBattle: finalizeBattle,
    isFinalBossBattle: isFinalBossBattle,
    getCurrentFinalBossPhase: getCurrentFinalBossPhase,
    getCurrentEnemyType: getCurrentEnemyType,
    getCurrentWeaknessType: getCurrentWeaknessType
  };
})();
