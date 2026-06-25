(function () {
  "use strict";

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

  // 1の段の正解読み(スペース区切り)。
  var DAN1_YOMI = {
    1: "いんいち が いち",
    2: "いんに が に",
    3: "いんさん が さん",
    4: "いんし が し",
    5: "いんご が ご",
    6: "いんろく が ろく",
    7: "いんしち が しち",
    8: "いんはち が はち",
    9: "いんく が く"
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

  // dan1以外の段は簡易的な読みで代用する。
  function buildApproxKukuReading(card) {
    return KUKU_DIGIT[card.a] + KUKU_DIGIT[card.b] + " " + numberToYomiKuku(card.answer);
  }

  function formatExpression(card) {
    if (card.kind === "mul") return card.a + " × " + card.b + " = " + card.answer;
    if (card.kind === "add") return card.a + " + " + card.b + " = " + card.answer;
    return card.a + " - " + card.b + " = " + card.answer;
  }

  // 正解後の読み（答えまで含む）。
  function getReading(card) {
    if (card.kind === "mul") {
      if (card.dan === 1 && DAN1_YOMI[card.b]) {
        return DAN1_YOMI[card.b];
      }
      return buildApproxKukuReading(card);
    }
    if (card.kind === "add") {
      return numberToYomiPlain(card.a) + " たす " + numberToYomiPlain(card.b) + " は " + numberToYomiPlain(card.answer);
    }
    return numberToYomiPlain(card.a) + " ひく " + numberToYomiPlain(card.b) + " は " + numberToYomiPlain(card.answer);
  }

  // 回答前の読みヒント（答え部分は「？」で伏せる）。
  // 1の段のみ正式読みを使い、「が」を含む。
  // 2〜9の段は現時点では簡易読み（数字読みの組み合わせ）。正式読みと「が」の扱いは各段の本実装時に追加する。
  function getQuestionReading(card) {
    if (card.kind === "mul") {
      if (card.dan === 1 && DAN1_YOMI_PREFIX[card.b]) {
        return DAN1_YOMI_PREFIX[card.b] + " ？";
      }
      // 2〜9の段は簡易読み（「が」なし）
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
