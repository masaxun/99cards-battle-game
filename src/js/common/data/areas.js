(function () {
  "use strict";

  // 実装済み下級4エリア（hajimari / soyokaze / neppa / sazanami）＋上級1エリア（kodai）。
  // 未実装の上級エリアとラストエリアはマップ表示・ロック判定用の最小データのみ。
  var AREA_LIST = [
    {
      id: "hajimari",
      name: "はじまりの道",
      rank: "lower",
      dan: 1,
      enemyType: "none",
      weakness: "none",
      playerElement: "none",
      enemyHp: { normal1: 50, normal2: 75, normal3: 105, boss: 160 },
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
      enemyHp: { normal1: 100, normal2: 130, normal3: 170, boss: 240 },
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
      enemyHp: { normal1: 120, normal2: 170, normal3: 250, boss: 340 },
      requiredBossAreaIds: [],
      implemented: true,
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
      enemyHp: { normal1: 140, normal2: 220, normal3: 300, boss: 430 },
      requiredBossAreaIds: [],
      implemented: true,
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
      implemented: true,
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
      enemyHp: { normal1: 270, normal2: 320, normal3: 380, boss: 590 },
      requiredBossAreaIds: ["soyokaze"],
      implemented: true,
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
      enemyHp: { normal1: 340, normal2: 420, normal3: 510, boss: 880 },
      requiredBossAreaIds: ["neppa"],
      implemented: true,
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
      enemyHp: { normal1: 380, normal2: 480, normal3: 580, boss: 1000 },
      requiredBossAreaIds: ["sazanami"],
      implemented: true,
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
      // 低層4戦（2026-07-09実装）＋高層4戦（2026-07-12実装）。最上階(boss)は未実装のため意図的に未登録。
      enemyHp: { stage1: 260, stage2: 340, stage3: 430, stage4: 540, stage5: 600, stage6: 700, stage7: 820, stage8: 980 },
      // 9の段中心・足し算カードなし・1×1ホーリー保証枠あり（要件定義書セクション70参照）。エリア単位の設定のため低層・高層(stage1〜8)双方に適用される。
      normalDeckComposition: { target: 18, holy: 1, other: 7, add: 0, sub: 4 },
      // ラスボス専用デッキ構成（第9戦のみ。stage1〜8のnormalDeckCompositionとは別枠。要件定義書セクション70参照）
      bossDeckComposition: { target: 23, holy: 1, other: 7, add: 0, sub: 4 },
      // ラスボス4フェーズ連戦データ（第9戦専用。実装フェーズ0：データのみ追加、参照コードは未実装。要件定義書セクション70参照）
      finalBossPhases: [
        {
          key: "grass",
          name: "零積神 ククノミコト（草の姿）",
          enemyType: "grass",
          weaknessType: "light",
          hp: 1000,
          atkDans: [2, 6],
          hasAbyssWall: { requiredCount: 2 },
          grassRegen: { rate: 0.03, interval: 4 },
          actionProbs: {
            normal: [
              { type: "bossAttack", weight: 40 },
              { type: "intimidate", weight: 15 },
              { type: "powerUp", weight: 20 },
              { type: "opening", weight: 5 },
              { type: "zeroVoid", weight: 20 }
            ],
            wallActive: [
              { type: "bossAttack", weight: 50 },
              { type: "intimidate", weight: 20 },
              { type: "powerUp", weight: 25 },
              { type: "opening", weight: 5 },
              { type: "zeroVoid", weight: 0 }
            ]
          }
        },
        {
          key: "fire",
          name: "零積神 ククノミコト（火の姿）",
          enemyType: "fire",
          weaknessType: "light",
          hp: 1100,
          atkDans: [3, 7],
          hasAbyssWall: { requiredCount: 2 },
          actionProbs: {
            normal: [
              { type: "bossAttack", weight: 40 },
              { type: "intimidate", weight: 15 },
              { type: "powerUp", weight: 20 },
              { type: "opening", weight: 5 },
              { type: "zeroVoid", weight: 20 }
            ],
            wallActive: [
              { type: "bossAttack", weight: 50 },
              { type: "intimidate", weight: 20 },
              { type: "powerUp", weight: 25 },
              { type: "opening", weight: 5 },
              { type: "zeroVoid", weight: 0 }
            ]
          }
        },
        {
          key: "water",
          name: "零積神 ククノミコト（水の姿）",
          enemyType: "water",
          weaknessType: "light",
          hp: 1100,
          atkDans: [4, 8],
          hasAbyssWall: { requiredCount: 3 },
          actionProbs: {
            normal: [
              { type: "bossAttack", weight: 40 },
              { type: "intimidate", weight: 15 },
              { type: "powerUp", weight: 20 },
              { type: "opening", weight: 5 },
              { type: "zeroVoid", weight: 20 }
            ],
            wallActive: [
              { type: "bossAttack", weight: 50 },
              { type: "intimidate", weight: 20 },
              { type: "powerUp", weight: 25 },
              { type: "opening", weight: 5 },
              { type: "zeroVoid", weight: 0 }
            ]
          }
        },
        {
          key: "dark",
          name: "堕天 ククノモクズ",
          enemyType: "dark",
          weaknessType: "light",
          hp: 1400,
          atkDans: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          zeroPrefixedQuestions: true, // 0付き問題の出題（未実装、フラグのみ）
          hasAbyssWall: null,
          phaseTransitionBgm: "assets/audio/bgm/bgm_battle_final_boss_phase2_v01.mp3", // 変身演出開始時に切り替える設定項目のみ。再生処理は未実装
          actionProbs: {
            normal: [
              { type: "bossAttack", weight: 40 },
              { type: "intimidate", weight: 10 },
              { type: "powerUp", weight: 15 },
              { type: "opening", weight: 5 },
              { type: "zeroVoid", weight: 15 },
              { type: "zeroCrisis", weight: 15 }
            ]
          }
        }
      ],
      requiredBossAreaIds: ["kodai", "mayoi", "shakunetsu", "shinkai"],
      implemented: true,
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
