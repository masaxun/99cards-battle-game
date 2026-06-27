(function () {
  "use strict";

  var ELEMENT_BY_DAN = {
    1: "none", 2: "fire", 3: "water", 4: "grass",
    5: "none", 6: "fire", 7: "water", 8: "grass",
    9: "light"
  };

  // 通常戦/ボス戦の山札構成枚数(仕様18)。合計30枚。
  var NORMAL_COMPOSITION = { target: 10, related: 4, add: 8, sub: 5, other: 3 };
  var BOSS_COMPOSITION = { target: 15, add: 5, sub: 5, related: 3, other: 2 };

  var uidCounter = 0;
  function nextUid() {
    uidCounter += 1;
    return "c" + uidCounter;
  }

  function elementForDan(dan) {
    return ELEMENT_BY_DAN[dan] || "none";
  }

  function rankForDan(dan) {
    if (dan === 9) return "last";
    if (dan >= 5) return "upper";
    return "lower";
  }

  function factKeyForMul(a, b) {
    return a + "x" + b;
  }

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function shuffleArray(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function createMulCard(dan, n) {
    return {
      uid: nextUid(),
      kind: "mul",
      a: dan,
      b: n,
      answer: dan * n,
      element: elementForDan(dan),
      rank: rankForDan(dan),
      dan: dan,
      factKey: factKeyForMul(dan, n)
    };
  }

  // 足し算カード候補リスト: 繰り上がりあり・合計値高めを優先する
  var ADD_HIGH_PAIRS = [
    [3,9],[9,3],[4,8],[8,4],[5,7],[7,5],[6,6],
    [4,9],[9,4],[5,8],[8,5],[6,7],[7,6],
    [5,9],[9,5],[6,8],[8,6],[7,7],
    [6,9],[9,6],[7,8],[8,7],
    [7,9],[9,7],[8,8],
    [8,9],[9,8],
    [9,9]
  ];
  var ADD_MID_PAIRS = [
    [1,9],[9,1],[2,8],[8,2],[3,7],[7,3],[4,6],[6,4],[5,5],
    [2,9],[9,2],[3,8],[8,3],[4,7],[7,4],[5,6],[6,5]
  ];

  function createAddCard() {
    var r = Math.random();
    var a, b, pair;
    if (r < 0.70) {
      pair = ADD_HIGH_PAIRS[randomInt(0, ADD_HIGH_PAIRS.length - 1)];
      a = pair[0]; b = pair[1];
    } else if (r < 0.90) {
      pair = ADD_MID_PAIRS[randomInt(0, ADD_MID_PAIRS.length - 1)];
      a = pair[0]; b = pair[1];
    } else {
      a = randomInt(1, 9);
      b = randomInt(1, 9);
    }
    return {
      uid: nextUid(),
      kind: "add",
      a: a,
      b: b,
      answer: a + b,
      element: "none",
      rank: null,
      dan: null,
      factKey: "add:" + a + "+" + b
    };
  }

  // 通常回復カードの問題プール（答えが2〜9の二桁引き算。引く数は一桁・二桁両方あり）
  var NORMAL_SUB_PROBLEMS = [
    [11, 4], [11, 5], [11, 6], [11, 7], [11, 8], [11, 9],
    [12, 5], [12, 6], [12, 7], [12, 8], [12, 9],
    [13, 6], [13, 7], [13, 8], [13, 9],
    [14, 7], [14, 8], [14, 9],
    [15, 8], [15, 9],
    [16, 9],
    [18, 9], [18, 10], [18, 11], [18, 12], [18, 13], [18, 14]
  ];

  // difficulty: "normal"(ハート1回復) | "pinch"(ハート3回復、難しめ)
  function createSubCard(difficulty) {
    var diff = difficulty === "pinch" ? "pinch" : "normal";
    var a, b;
    if (diff === "pinch") {
      a = randomInt(11, 18);
      b = randomInt(2, 9);
    } else {
      var pair = NORMAL_SUB_PROBLEMS[randomInt(0, NORMAL_SUB_PROBLEMS.length - 1)];
      a = pair[0];
      b = pair[1];
    }
    return {
      uid: nextUid(),
      kind: "sub",
      a: a,
      b: b,
      answer: a - b,
      element: "none",
      rank: null,
      dan: null,
      difficulty: diff,
      healAmount: diff === "pinch" ? 3 : 1,
      factKey: "sub:" + a + "-" + b
    };
  }

  // ハート2以下の時、手札の引き算回復カードを「ピンチ回復」として使う選択をした場合に
  // 同じカードの問題を難しめに差し替える。
  function regenerateAsPinch(card) {
    var a = randomInt(11, 18);
    var b = randomInt(2, 9);
    card.a = a;
    card.b = b;
    card.answer = a - b;
    card.difficulty = "pinch";
    card.healAmount = 3;
    card.factKey = "sub:" + a + "-" + b;
    return card;
  }

  function buildTargetDanCards(dan, count) {
    var cards = [];
    var factors = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (var i = 0; i < count; i++) {
      cards.push(createMulCard(dan, factors[i % factors.length]));
    }
    return cards;
  }

  function findAreasByElement(element, excludeAreaId) {
    var list = window.Kuku99.Areas.LIST;
    var result = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== excludeAreaId && list[i].playerElement === element) {
        result.push(list[i]);
      }
    }
    return result;
  }

  // 同属性・関連段カード: 自分と同じ属性で別の段を持つエリアから出題する。
  // 見つからない場合は足し算カードで代用する。
  function buildRelatedElementCards(areaDef, count) {
    var candidates = findAreasByElement(areaDef.playerElement, areaDef.id);
    if (candidates.length === 0) {
      return buildAddCards(count);
    }
    var cards = [];
    for (var i = 0; i < count; i++) {
      var area = candidates[randomInt(0, candidates.length - 1)];
      var factor = randomInt(1, 9);
      cards.push(createMulCard(area.dan, factor));
    }
    return cards;
  }

  // 他属性かけ算カード: 自分と異なる属性のエリアから出題する。
  function buildOtherElementCards(areaDef, count) {
    var list = window.Kuku99.Areas.LIST;
    var candidates = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== areaDef.id && list[i].playerElement !== areaDef.playerElement) {
        candidates.push(list[i]);
      }
    }
    if (candidates.length === 0) {
      return buildAddCards(count);
    }
    var cards = [];
    for (var i = 0; i < count; i++) {
      var area = candidates[randomInt(0, candidates.length - 1)];
      var factor = randomInt(1, 9);
      cards.push(createMulCard(area.dan, factor));
    }
    return cards;
  }

  function buildAddCards(count) {
    var cards = [];
    for (var i = 0; i < count; i++) {
      cards.push(createAddCard());
    }
    return cards;
  }

  function buildSubCards(count) {
    var cards = [];
    for (var i = 0; i < count; i++) {
      cards.push(createSubCard("normal"));
    }
    return cards;
  }

  // stageType: "normal" | "boss"
  function buildDeck(areaDef, stageType) {
    var comp = stageType === "boss" ? BOSS_COMPOSITION : NORMAL_COMPOSITION;
    var cards = [];
    cards = cards.concat(buildTargetDanCards(areaDef.dan, comp.target));
    cards = cards.concat(buildRelatedElementCards(areaDef, comp.related));
    cards = cards.concat(buildAddCards(comp.add));
    cards = cards.concat(buildSubCards(comp.sub));
    cards = cards.concat(buildOtherElementCards(areaDef, comp.other));
    return shuffleArray(cards);
  }

  function getComboMultiplier(combo) {
    if (combo <= 1) return 1.00;
    if (combo === 2) return 1.05;
    if (combo === 3) return 1.10;
    if (combo === 4) return 1.15;
    return 1.20;
  }

  // 基礎ダメージ(カードの答え) + 弱点ボーナス + コンボボーナス。熟練度補正なし。
  function calcDamage(card, areaDef, combo) {
    var base = card.answer;

    if (card.kind === "mul") {
      var defenderIsHigh = areaDef.rank === "upper" || areaDef.rank === "last";
      if (card.rank === "lower" && defenderIsHigh) {
        base = Math.round(base * 0.5);
      }
    }

    var isWeakness = card.kind === "mul" && card.element !== "none" && card.element === areaDef.weakness;
    var weaknessBonus = isWeakness ? Math.round(base * 0.5) : 0;
    var comboBonus = Math.round(base * (getComboMultiplier(combo) - 1));

    return base + weaknessBonus + comboBonus;
  }

  window.Kuku99 = window.Kuku99 || {};
  window.Kuku99.Cards = {
    elementForDan: elementForDan,
    rankForDan: rankForDan,
    createMulCard: createMulCard,
    createAddCard: createAddCard,
    createSubCard: createSubCard,
    regenerateAsPinch: regenerateAsPinch,
    buildDeck: buildDeck,
    calcDamage: calcDamage,
    getComboMultiplier: getComboMultiplier,
    shuffleArray: shuffleArray,
    randomInt: randomInt
  };
})();
