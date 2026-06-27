(function () {
  "use strict";

  // 九九81通りの正式読み
  var KUKU_READINGS = {
    "1x1": "いんいちがいち",
    "1x2": "いんにがに",
    "1x3": "いんさんがさん",
    "1x4": "いんしがし",
    "1x5": "いんごがご",
    "1x6": "いんろくがろく",
    "1x7": "いんしちがしち",
    "1x8": "いんはちがはち",
    "1x9": "いんくがく",

    "2x1": "にいちがに",
    "2x2": "ににんがし",
    "2x3": "にさんがろく",
    "2x4": "にしがはち",
    "2x5": "にごじゅう",
    "2x6": "にろくじゅうに",
    "2x7": "にしちじゅうし",
    "2x8": "にはちじゅうろく",
    "2x9": "にくじゅうはち",

    "3x1": "さんいちがさん",
    "3x2": "さんにがろく",
    "3x3": "さざんがく",
    "3x4": "さんしじゅうに",
    "3x5": "さんごじゅうご",
    "3x6": "さぶろくじゅうはち",
    "3x7": "さんしちにじゅういち",
    "3x8": "さんぱにじゅうし",
    "3x9": "さんくにじゅうしち",

    "4x1": "しいちがし",
    "4x2": "しにがはち",
    "4x3": "しさんじゅうに",
    "4x4": "ししじゅうろく",
    "4x5": "しごにじゅう",
    "4x6": "しろくにじゅうし",
    "4x7": "ししちにじゅうはち",
    "4x8": "しはさんじゅうに",
    "4x9": "しくさんじゅうろく",

    "5x1": "ごいちがご",
    "5x2": "ごにじゅう",
    "5x3": "ごさんじゅうご",
    "5x4": "ごしにじゅう",
    "5x5": "ごごにじゅうご",
    "5x6": "ごろくさんじゅう",
    "5x7": "ごしちさんじゅうご",
    "5x8": "ごはしじゅう",
    "5x9": "ごっくしじゅうご",

    "6x1": "ろくいちがろく",
    "6x2": "ろくにじゅうに",
    "6x3": "ろくさんじゅうはち",
    "6x4": "ろくしにじゅうし",
    "6x5": "ろくごさんじゅう",
    "6x6": "ろくろくさんじゅうろく",
    "6x7": "ろくしちしじゅうに",
    "6x8": "ろくはしじゅうはち",
    "6x9": "ろっくごじゅうし",

    "7x1": "しちいちがしち",
    "7x2": "しちにじゅうし",
    "7x3": "しちさんにじゅういち",
    "7x4": "しちしにじゅうはち",
    "7x5": "しちごさんじゅうご",
    "7x6": "しちろくしじゅうに",
    "7x7": "しちしちしじゅうく",
    "7x8": "しちはごじゅうろく",
    "7x9": "しちくろくじゅうさん",

    "8x1": "はちいちがはち",
    "8x2": "はちにじゅうろく",
    "8x3": "はっさんにじゅうし",
    "8x4": "はっしさんじゅうに",
    "8x5": "はちごしじゅう",
    "8x6": "はちろくしじゅうはち",
    "8x7": "はちしちごじゅうろく",
    "8x8": "はっぱろくじゅうし",
    "8x9": "はっくしちじゅうに",

    "9x1": "くいちがく",
    "9x2": "くにじゅうはち",
    "9x3": "くさんにじゅうしち",
    "9x4": "くしさんじゅうろく",
    "9x5": "くごしじゅうご",
    "9x6": "くろくごじゅうし",
    "9x7": "くしちろくじゅうさん",
    "9x8": "くはしちじゅうに",
    "9x9": "くくはちじゅういち"
  };

  // 九九の読み方(伝統的な唱え方)で使う数字読み。4=し、7=しち、9=く を使う。
  var KUKU_DIGIT = {
    1: "いち", 2: "に", 3: "さん", 4: "し", 5: "ご",
    6: "ろく", 7: "しち", 8: "はち", 9: "く"
  };

  // 通常の数の読み(足し算・引き算カード用)。4=よん、7=なな、9=きゅう を使う。
  var PLAIN_DIGIT = {
    0: "ぜろ", 1: "いち", 2: "に", 3: "さん", 4: "よん", 5: "ご",
    6: "ろく", 7: "なな", 8: "はち", 9: "きゅう"
  };

  // 1の段の回答前ヒント用プレフィックス(答え部分を伏せる)。
  var DAN1_YOMI_PREFIX = {
    1: "いんいち が",
    2: "いんに が",
    3: "いんさん が",
    4: "いんし が",
    5: "いんご が",
    6: "いんろく が",
    7: "いんしち が",
    8: "いんはち が",
    9: "いんく が"
  };

  // 段ごとの短いヒント(ミス時、答えそのものは教えない)。
  var HINTS_BY_DAN = {
    1: "1の段は、こたえがかける数とそのままおなじになるよ。たとえば 1×6 なら こたえも 6。",
    2: "2の段は、2ずつふえるよ。2, 4, 6, 8... のリズムを思い出そう。",
    3: "3の段は、3ずつふえるよ。3, 6, 9, 12... と数えてみよう。",
    4: "4の段は、4ずつふえるよ。4, 8, 12, 16... のリズムだよ。",
    5: "5の段は、こたえが5か0で終わるよ。",
    6: "6の段は、6ずつふえるよ。5の段にもう1セット足す考え方もできるよ。",
    7: "7の段はむずかしい段だよ。7ずつふえるリズムを少しずつ覚えよう。",
    8: "8の段は、8ずつふえるよ。4の段の2倍として考えることもできるよ。",
    9: "9の段は、十の位が1ずつ増えて、一の位が1ずつ減るパターンがあるよ。"
  };

  function numberToYomi(n, digitTable) {
    if (digitTable[n] !== undefined) return digitTable[n];
    var tens = Math.floor(n / 10);
    var ones = n % 10;
    var prefix = tens === 1 ? "じゅう" : digitTable[tens] + "じゅう";
    if (ones === 0) return prefix;
    return prefix + digitTable[ones];
  }

  function numberToYomiKuku(n) {
    return numberToYomi(n, KUKU_DIGIT);
  }

  function numberToYomiPlain(n) {
    return numberToYomi(n, PLAIN_DIGIT);
  }

  function getKukuReading(a, b) {
    return KUKU_READINGS[a + "x" + b] || "";
  }

  // KUKU_READINGSにない組み合わせ用の簡易読み
  function buildApproxKukuReading(card) {
    return KUKU_DIGIT[card.a] + KUKU_DIGIT[card.b] + " " + numberToYomiKuku(card.answer);
  }

  function formatExpression(card) {
    if (card.kind === "mul") return card.a + " × " + card.b + " = " + card.answer;
    if (card.kind === "add") return card.a + " + " + card.b + " = " + card.answer;
    return card.a + " - " + card.b + " = " + card.answer;
  }

  // 正解後の読み（答えまで含む）。かけ算は KUKU_READINGS を優先する。
  function getReading(card) {
    if (card.kind === "mul") {
      var reading = getKukuReading(card.a, card.b);
      if (reading) return reading;
      return buildApproxKukuReading(card);
    }
    if (card.kind === "add") {
      return numberToYomiPlain(card.a) + " たす " + numberToYomiPlain(card.b) + " は " + numberToYomiPlain(card.answer);
    }
    return numberToYomiPlain(card.a) + " ひく " + numberToYomiPlain(card.b) + " は " + numberToYomiPlain(card.answer);
  }

  // 回答前の読みヒント（答え部分は「？」で伏せる）。
  function getQuestionReading(card) {
    if (card.kind === "mul") {
      if (card.dan === 1 && DAN1_YOMI_PREFIX[card.b]) {
        return DAN1_YOMI_PREFIX[card.b] + " ？";
      }
      return KUKU_DIGIT[card.a] + KUKU_DIGIT[card.b] + " ？";
    }
    if (card.kind === "add") {
      return numberToYomiPlain(card.a) + " たす " + numberToYomiPlain(card.b) + " は ？";
    }
    return numberToYomiPlain(card.a) + " ひく " + numberToYomiPlain(card.b) + " は ？";
  }

  function getHint(dan) {
    return HINTS_BY_DAN[dan] || null;
  }

  window.Kuku99 = window.Kuku99 || {};
  window.Kuku99.Yomi = {
    formatExpression: formatExpression,
    getReading: getReading,
    getQuestionReading: getQuestionReading,
    getHint: getHint,
    numberToYomiPlain: numberToYomiPlain,
    numberToYomiKuku: numberToYomiKuku
  };
})();
