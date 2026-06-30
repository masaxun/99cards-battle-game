(function () {
  "use strict";

  var Areas     = window.Kuku99.Areas;
  var GameState = window.Kuku99.GameState;

  var ELEMENT_LABEL = {
    none: "─", fire: "火", water: "水", grass: "草", light: "光", dark: "闇"
  };

  var SE = {
    buttonDecide: { src: "assets/audio/se/se_button_decide_v01.mp3", volume: 0.55 }
  };

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

  var RANK_GROUPS = [
    { rank: "lower", label: "下級エリア" },
    { rank: "upper", label: "上級エリア" },
    { rank: "last",  label: "ラスト" }
  ];

  var navigating = false;

  function goToStage(areaId) {
    if (navigating) return;
    navigating = true;
    playSE("buttonDecide");
    setTimeout(function () {
      window.location.href = "stage.html?areaId=" + encodeURIComponent(areaId);
    }, 120);
  }

  function getProgressLabel(progress) {
    if (progress.bossCleared) return { text: "ぬし撃破済み", cls: "prog-boss-cleared" };
    if (progress.bossReached) return { text: "ぬし到達",     cls: "prog-boss-reached" };
    var nc = progress.normalCleared;
    if (nc && Object.keys(nc).length > 0) return { text: "挑戦中", cls: "prog-in-progress" };
    return { text: "未挑戦", cls: "prog-none" };
  }

  function elemClass(element) {
    return "elem-" + (element || "none");
  }

  function renderAreaCard(areaDef, progress) {
    var card = document.createElement("div");
    var isImpl = !!areaDef.implemented;
    card.className = "area-card " + (isImpl ? "area-available" : "area-locked");

    // 上段: エリア名 + 段バッジ
    var headerRow = document.createElement("div");
    headerRow.className = "area-card-header";

    var nameEl = document.createElement("div");
    nameEl.className = "area-card-name";
    nameEl.textContent = areaDef.name;

    var danEl = document.createElement("div");
    danEl.className = "area-card-dan " + elemClass(areaDef.playerElement);
    danEl.textContent = areaDef.dan + "段";

    headerRow.appendChild(nameEl);
    headerRow.appendChild(danEl);

    // 中段: 属性 / 弱点
    var metaRow = document.createElement("div");
    metaRow.className = "area-card-meta";
    var enemyLabel = ELEMENT_LABEL[areaDef.enemyType] || "─";
    var weakLabel  = ELEMENT_LABEL[areaDef.weakness]  || "─";
    metaRow.innerHTML =
      '<span class="meta-label">属性</span>' +
      '<span class="meta-value ' + elemClass(areaDef.enemyType) + '">' + enemyLabel + '</span>' +
      '<span class="meta-sep">│</span>' +
      '<span class="meta-label">弱点</span>' +
      '<span class="meta-value ' + elemClass(areaDef.weakness) + '">' + weakLabel + '</span>';

    // 下段: 進行状態 or 準備中
    var footRow = document.createElement("div");
    footRow.className = "area-card-foot";

    if (!isImpl) {
      var lockEl = document.createElement("span");
      lockEl.className = "prog-locked";
      lockEl.textContent = "準備中";
      footRow.appendChild(lockEl);
    } else {
      var prog = getProgressLabel(progress);
      var progEl = document.createElement("span");
      progEl.className = "area-prog " + prog.cls;
      progEl.textContent = prog.text;

      var btnEl = document.createElement("button");
      btnEl.className = "area-card-btn";
      btnEl.textContent = "選択";
      (function (id) {
        btnEl.addEventListener("click", function () { goToStage(id); });
      })(areaDef.id);

      footRow.appendChild(progEl);
      footRow.appendChild(btnEl);
    }

    card.appendChild(headerRow);
    card.appendChild(metaRow);
    card.appendChild(footRow);
    return card;
  }

  function init() {
    var list      = Areas.LIST;
    var gameState = GameState.load();
    var content   = document.getElementById("area-content");

    RANK_GROUPS.forEach(function (group) {
      var grouped = list.filter(function (a) { return a.rank === group.rank; });
      if (grouped.length === 0) return;

      var section = document.createElement("div");
      section.className = "area-section";

      var heading = document.createElement("div");
      heading.className = "area-section-heading";
      heading.textContent = group.label;
      section.appendChild(heading);

      var grid = document.createElement("div");
      grid.className = "area-grid";

      grouped.forEach(function (areaDef) {
        var progress = GameState.getAreaProgress(gameState, areaDef.id);
        grid.appendChild(renderAreaCard(areaDef, progress));
      });

      section.appendChild(grid);
      content.appendChild(section);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
