(function () {
  "use strict";

  var Areas     = window.Kuku99.Areas;
  var GameState = window.Kuku99.GameState;

  var SE = {
    buttonDecide: { src: "assets/audio/se/se_button_decide_v01.mp3", volume: 0.55 },
    cancel:       { src: "assets/audio/se/se_cancel_v01.mp3",        volume: 0.45 }
  };

  var navigating = false;

  function playSE(name) {
    try { if (localStorage.getItem("kuku99_sound_enabled") === "0") return; } catch (e) {}
    var def = SE[name];
    if (!def) return;
    try {
      var audio = new Audio(def.src);
      audio.volume = def.volume;
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  function goToBattle(areaId, stage) {
    if (navigating) return;
    navigating = true;
    playSE("buttonDecide");
    setTimeout(function () {
      window.location.href = buildBattleUrl(areaId, stage);
    }, 120);
  }

  var STAGE_ORDER = ["normal1", "normal2", "normal3", "boss"];

  // 漆黒の塔は9ステージ構成のため専用の並び順を持つ。低層4戦＋高層4戦を実装済み。最上階(boss)は未実装。
  var STAGE_ORDER_BY_AREA = {
    shikkoku: ["stage1", "stage2", "stage3", "stage4", "stage5", "stage6", "stage7", "stage8"]
  };

  function getStageOrderForArea(areaDef) {
    return (areaDef && STAGE_ORDER_BY_AREA[areaDef.id]) || STAGE_ORDER;
  }

  var STAGE_LABEL = {
    normal1: "通常戦 1",
    normal2: "通常戦 2",
    normal3: "通常戦 3",
    boss:    "ぬし戦",
    stage1:  "第1戦",
    stage2:  "第2戦",
    stage3:  "第3戦",
    stage4:  "第4戦",
    stage5:  "第5戦",
    stage6:  "第6戦",
    stage7:  "第7戦",
    stage8:  "第8戦"
  };

  var STAGE_ENEMY_NAMES = {
    hajimari: { normal1: "スライム",         normal2: "コウモリ",     normal3: "ゴーレム" },
    soyokaze: { normal1: "リーフスライム",   normal2: "コノハモリ",   normal3: "モスゴーレム" },
    neppa:    { normal1: "フレイムスライム", normal2: "ヒノコモリ",   normal3: "マグマゴーレム" },
    sazanami: { normal1: "アクアスライム",   normal2: "シズクモリ",   normal3: "ナミゴーレム" },
    kodai:    { normal1: "ウルフ",           normal2: "グリフォン",   normal3: "タイタン",    boss: "ベヒーモス" },
    mayoi:    { normal1: "モスウルフ",       normal2: "リーフグリフォン", normal3: "フォレストタイタン" },
    shakunetsu: { normal1: "フレイムウルフ", normal2: "フレアグリフォン", normal3: "マグマタイタン" },
    shinkai:  { normal1: "アクアウルフ",     normal2: "シーグリフォン", normal3: "コーラルタイタン" },
    shikkoku: {
      stage1: "シャドウスライム",  stage2: "シャドウバット", stage3: "ダークゴーレム", stage4: "ダークドラゴン",
      stage5: "ナイトウルフ",      stage6: "ナイトグリフォン", stage7: "アビスタイタン", stage8: "アビスベヒーモス"
    }
  };

  function getStageEnemyName(areaDef, stage) {
    var areaNames = STAGE_ENEMY_NAMES[areaDef.id];
    if (stage === "boss") {
      return (areaNames && areaNames.boss) || (areaDef.name + "のぬし");
    }
    areaNames = areaNames || STAGE_ENEMY_NAMES.hajimari;
    return (areaNames && areaNames[stage]) || (STAGE_ENEMY_NAMES.hajimari[stage]) || "モンスター";
  }

  function parseParams() {
    var params = {};
    var search = location.search.slice(1);
    search.split("&").forEach(function (part) {
      var kv = part.split("=");
      if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
    });
    return params;
  }

  function buildBattleUrl(areaId, stage) {
    return "battle.html?areaId=" + encodeURIComponent(areaId) + "&stage=" + encodeURIComponent(stage);
  }

  // ステージが「解放済み」かを判定する
  // bossCleared 済みなら全ステージ解放。それ以外は stageOrder 上の直前ステージのクリア状況を見る。
  function isUnlocked(stage, progress, stageOrder) {
    if (progress.bossCleared) return true;
    var idx = stageOrder.indexOf(stage);
    if (idx <= 0) return true;
    var prevStage = stageOrder[idx - 1];
    if (prevStage === "boss") return !!progress.bossCleared;
    return !!(progress.normalCleared && progress.normalCleared[prevStage]);
  }

  function isCleared(stage, progress) {
    if (stage === "boss") return !!progress.bossCleared;
    return !!(progress.normalCleared && progress.normalCleared[stage]);
  }

  function renderStageList(areaDef, progress) {
    var listEl = document.getElementById("stage-list");
    listEl.innerHTML = "";
    var stageOrder = getStageOrderForArea(areaDef);

    stageOrder.forEach(function (stage) {
      var unlocked = isUnlocked(stage, progress, stageOrder);
      var cleared  = isCleared(stage, progress);

      var card = document.createElement("div");
      card.className = "stage-card" + (unlocked ? "" : " stage-locked");

      var labelEl = document.createElement("div");
      labelEl.className = "stage-card-label";
      labelEl.textContent = STAGE_LABEL[stage];

      var enemyEl = document.createElement("div");
      enemyEl.className = "stage-card-enemy";
      enemyEl.textContent = getStageEnemyName(areaDef, stage);

      var statusEl = document.createElement("div");
      statusEl.className = "stage-card-status";

      var btnEl = document.createElement("button");
      btnEl.className = "stage-card-btn";

      if (!unlocked) {
        statusEl.textContent = "🔒 未解放";
        statusEl.className += " status-locked";
        btnEl.style.display = "none";
      } else if (cleared) {
        statusEl.textContent = "✅ クリア済み";
        statusEl.className += " status-cleared";
        btnEl.textContent = "もう一回";
        btnEl.className += " btn-cleared";
        (function (s) {
          btnEl.addEventListener("click", function () {
            goToBattle(areaDef.id, s);
          });
        })(stage);
      } else {
        statusEl.textContent = "▶ 挑戦できる";
        statusEl.className += " status-available";
        btnEl.textContent = "バトルへ";
        btnEl.className += " btn-available";
        (function (s) {
          btnEl.addEventListener("click", function () {
            goToBattle(areaDef.id, s);
          });
        })(stage);
      }

      card.appendChild(labelEl);
      card.appendChild(enemyEl);
      card.appendChild(statusEl);
      if (btnEl.style.display !== "none") card.appendChild(btnEl);

      listEl.appendChild(card);
    });
  }

  function initBackLink() {
    var backLink = document.getElementById("stage-back-link");
    if (!backLink) return;
    backLink.addEventListener("click", function (event) {
      event.preventDefault();
      var href = backLink.href;
      playSE("cancel");
      setTimeout(function () {
        window.location.href = href;
      }, 120);
    });
  }

  function init() {
    initBackLink();
    var params = parseParams();
    var areaId = params.areaId || "hajimari";
    var areaDef = Areas.getAreaById(areaId);

    if (!areaDef) {
      document.body.textContent = "エリアが見つかりません: " + areaId;
      return;
    }

    var gameState = GameState.load();
    var progress  = GameState.getAreaProgress(gameState, areaId);

    document.getElementById("area-name").textContent = areaDef.name;
    document.title = areaDef.name + " - 九九カードバトル";

    renderStageList(areaDef, progress);
  }

  document.addEventListener("DOMContentLoaded", init);

  window.addEventListener("pageshow", function () {
    navigating = false;
  });
})();
