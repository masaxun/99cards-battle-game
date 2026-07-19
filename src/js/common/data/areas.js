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
      // 低層4戦（2026-07-09実装）＋高層4戦（2026-07-12実装）。最上階bossはfinalBossPhasesを使うため、enemyHpには個別登録しない。
      enemyHp: { stage1: 260, stage2: 340, stage3: 430, stage4: 540, stage5: 600, stage6: 700, stage7: 820, stage8: 980 },
      // 9の段中心・足し算カードなし・1×1ホーリー保証枠あり（要件定義書セクション70参照）。エリア単位の設定のため低層・高層(stage1〜8)双方に適用される。
      normalDeckComposition: { target: 18, holy: 1, other: 7, add: 0, sub: 4 },
      // ラスボス専用デッキ構成（第9戦のみ。stage1〜8のnormalDeckCompositionとは別枠。要件定義書セクション70参照）
      bossDeckComposition: { target: 23, holy: 1, other: 7, add: 0, sub: 4 },
      // ラスボス4フェーズ連戦データとして実装・参照済み（第9戦専用。要件定義書セクション70参照）
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
          phaseTransitionBgm: "assets/audio/bgm/bgm_battle_final_boss_phase2_v01.mp3", // battleUI.jsで堕天移行時のBGM切替に使用済み
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

  // ============================================================
  // ステージ構成・ステージ解放判定（stage.html／battle.htmlの単一ソース）
  // ============================================================

  var DEFAULT_STAGE_ORDER = ["normal1", "normal2", "normal3", "boss"];

  // 漆黒の塔は9ステージ構成のため専用の並び順を持つ。低層4戦＋高層4戦＋最上階(boss=最終決戦)を実装済み。
  var STAGE_ORDER_BY_AREA = {
    shikkoku: ["stage1", "stage2", "stage3", "stage4", "stage5", "stage6", "stage7", "stage8", "boss"]
  };

  // 呼び出し側が配列を書き換えても内部定数へ影響しないよう、常にコピーを返す。
  function getStageOrderForArea(areaDef) {
    var order = areaDef && STAGE_ORDER_BY_AREA[areaDef.id];
    return (order || DEFAULT_STAGE_ORDER).slice();
  }

  // ステージが「解放済み」かを判定する。
  // 存在しないstageはbossClearedの状態にかかわらず常にfalse（indexOf()が-1のケースを最優先で分離）。
  // 実在するstageは、bossCleared済みなら全ステージ解放。それ以外はステージ順上の直前ステージのクリア状況を見る。
  function isStageUnlocked(stage, progress, areaDef) {
    if (!progress) return false;

    var stageOrder = getStageOrderForArea(areaDef);
    var idx = stageOrder.indexOf(stage);

    if (idx === -1) return false;
    if (progress.bossCleared) return true;
    if (idx === 0) return true;

    var prevStage = stageOrder[idx - 1];
    return !!(progress.normalCleared && progress.normalCleared[prevStage]);
  }

  function isStageCleared(stage, progress) {
    if (!progress) return false;
    if (stage === "boss") return !!progress.bossCleared;
    return !!(progress.normalCleared && progress.normalCleared[stage]);
  }

  window.Kuku99 = window.Kuku99 || {};
  window.Kuku99.Areas = {
    LIST: AREA_LIST,
    getAreaById: getAreaById,
    isAreaUnlocked: isAreaUnlocked,
    getStageOrderForArea: getStageOrderForArea,
    isStageUnlocked: isStageUnlocked,
    isStageCleared: isStageCleared
  };
})();
