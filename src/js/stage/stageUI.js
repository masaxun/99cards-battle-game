(function () {
  "use strict";

  var Areas     = window.Kuku99.Areas;
  var GameState = window.Kuku99.GameState;

  var SE = {
    buttonDecide: { src: "assets/audio/se/se_button_decide_v01.mp3", volume: 0.55 }
  };

  var navigating = false;

  function playSE(name) {
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

  var STAGE_LABEL = {
    normal1: "通常戦 1",
    normal2: "通常戦 2",
    normal3: "通常戦 3",
    boss:    "ぬし戦"
  };

  var STAGE_ENEMY = {
    normal1: "スライム",
    normal2: "バット",
    normal3: "ゴーレム"
  };

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
  // bossCleared 済みなら全ステージ解放
  function isUnlocked(stage, progress) {
    if (progress.bossCleared) return true;
    if (stage === "normal1") return true;
    if (stage === "normal2") return !!(progress.normalCleared && progress.normalCleared.normal1);
    if (stage === "normal3") return !!(progress.normalCleared && progress.normalCleared.normal2);
    if (stage === "boss")    return !!(progress.normalCleared && progress.normalCleared.normal3);
    return false;
  }

  function isCleared(stage, progress) {
    if (stage === "boss") return !!progress.bossCleared;
    return !!(progress.normalCleared && progress.normalCleared[stage]);
  }

  function renderStageList(areaDef, progress) {
    var listEl = document.getElementById("stage-list");
    listEl.innerHTML = "";

    STAGE_ORDER.forEach(function (stage) {
      var unlocked = isUnlocked(stage, progress);
      var cleared  = isCleared(stage, progress);

      var card = document.createElement("div");
      card.className = "stage-card" + (unlocked ? "" : " stage-locked");

      var labelEl = document.createElement("div");
      labelEl.className = "stage-card-label";
      labelEl.textContent = STAGE_LABEL[stage];

      var enemyEl = document.createElement("div");
      enemyEl.className = "stage-card-enemy";
      enemyEl.textContent = (stage === "boss") ? areaDef.name + "のぬし" : (STAGE_ENEMY[stage] || "モンスター");

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

  function init() {
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
})();
