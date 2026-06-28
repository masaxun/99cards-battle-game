(function () {
  "use strict";

  // v0.1-alphaで実装済みなのは "hajimari" のみ。
  // 他8エリアはマップ表示・ロック判定用の最小データ(仕様20のHP値含む)だけ持ち、
  // implemented: false としてバトル開始不可にする。
  var AREA_LIST = [
    {
      id: "hajimari",
      name: "はじまりの道",
      rank: "lower",
      dan: 1,
      enemyType: "none",
      weakness: "none",
      playerElement: "none",
      enemyHp: { normal1: 50, normal2: 70, normal3: 95, boss: 140 },
      requiredBossAreaIds: [],
      implemented: true,
      mapPosition: { row: 2, col: 0 }
    },
    {
      id: "soyokaze",
      name: "そよ風の草原",
      rank: "lower",
      dan: 2,
      enemyType: "grass",
      weakness: "fire",
      playerElement: "fire",
      enemyHp: { normal1: 100, normal2: 130, normal3: 160, boss: 280 },
      requiredBossAreaIds: [],
      implemented: true,
      mapPosition: { row: 2, col: 1 }
    },
    {
      id: "neppa",
      name: "熱波の山麓",
      rank: "lower",
      dan: 3,
      enemyType: "fire",
      weakness: "water",
      playerElement: "water",
      enemyHp: { normal1: 120, normal2: 150, normal3: 180, boss: 320 },
      requiredBossAreaIds: [],
      implemented: false,
      mapPosition: { row: 2, col: 2 }
    },
    {
      id: "sazanami",
      name: "さざなみの浜辺",
      rank: "lower",
      dan: 4,
      enemyType: "water",
      weakness: "grass",
      playerElement: "grass",
      enemyHp: { normal1: 140, normal2: 180, normal3: 220, boss: 380 },
      requiredBossAreaIds: [],
      implemented: false,
      mapPosition: { row: 2, col: 3 }
    },
    {
      id: "kodai",
      name: "古代の遺跡",
      rank: "upper",
      dan: 5,
      enemyType: "none",
      weakness: "none",
      playerElement: "none",
      enemyHp: { normal1: 180, normal2: 230, normal3: 280, boss: 480 },
      requiredBossAreaIds: ["hajimari"],
      implemented: false,
      mapPosition: { row: 1, col: 0 }
    },
    {
      id: "mayoi",
      name: "迷いの森",
      rank: "upper",
      dan: 6,
      enemyType: "grass",
      weakness: "fire",
      playerElement: "fire",
      enemyHp: { normal1: 220, normal2: 280, normal3: 340, boss: 580 },
      requiredBossAreaIds: ["soyokaze"],
      implemented: false,
      mapPosition: { row: 1, col: 1 }
    },
    {
      id: "shakunetsu",
      name: "灼熱の火口",
      rank: "upper",
      dan: 7,
      enemyType: "fire",
      weakness: "water",
      playerElement: "water",
      enemyHp: { normal1: 240, normal2: 310, normal3: 380, boss: 650 },
      requiredBossAreaIds: ["neppa"],
      implemented: false,
      mapPosition: { row: 1, col: 2 }
    },
    {
      id: "shinkai",
      name: "深海の神殿",
      rank: "upper",
      dan: 8,
      enemyType: "water",
      weakness: "grass",
      playerElement: "grass",
      enemyHp: { normal1: 260, normal2: 340, normal3: 420, boss: 720 },
      requiredBossAreaIds: ["sazanami"],
      implemented: false,
      mapPosition: { row: 1, col: 3 }
    },
    {
      id: "shikkoku",
      name: "漆黒の塔",
      rank: "last",
      dan: 9,
      enemyType: "dark",
      weakness: "light",
      playerElement: "light",
      enemyHp: { normal1: 300, normal2: 380, normal3: 460, boss: 900 },
      requiredBossAreaIds: ["kodai", "mayoi", "shakunetsu", "shinkai"],
      implemented: false,
      mapPosition: { row: 0, col: 1.5 }
    }
  ];

  function getAreaById(areaId) {
    for (var i = 0; i < AREA_LIST.length; i++) {
      if (AREA_LIST[i].id === areaId) return AREA_LIST[i];
    }
    return null;
  }

  // requiredBossAreaIdsが空なら初期解放。すべてのIDでbossClearedがtrueなら解放。
  function isAreaUnlocked(state, areaDef) {
    if (!areaDef.requiredBossAreaIds || areaDef.requiredBossAreaIds.length === 0) {
      return true;
    }
    for (var i = 0; i < areaDef.requiredBossAreaIds.length; i++) {
      var requiredId = areaDef.requiredBossAreaIds[i];
      var progress = state.areas[requiredId];
      if (!progress || !progress.bossCleared) {
        return false;
      }
    }
    return true;
  }

  window.Kuku99 = window.Kuku99 || {};
  window.Kuku99.Areas = {
    LIST: AREA_LIST,
    getAreaById: getAreaById,
    isAreaUnlocked: isAreaUnlocked
  };
})();
