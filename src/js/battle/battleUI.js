(function () {
  "use strict";

  var Battle = window.Kuku99.Battle;
  var Areas = window.Kuku99.Areas;
  var Cards = window.Kuku99.Cards;
  var GameState = window.Kuku99.GameState;
  var Yomi = window.Kuku99.Yomi;

  var session = null;
  var selectedCardUid = null;
  var finalized = false;
  var feedbackTimer = null;
  var enemyMsgTimer = null;
  var interactionLocked = false;
  var feedbackPersistent = false;
  var resultPrimaryUrl = "battle.html";
  var resultSecondaryUrl = "battle.html";
  var resultStageUrl = "stage.html?areaId=hajimari";
  var enemyStateEffectsVisible = false;
  var bgmStarted = false;
  var bgmAudio = null;
  var battleStarted = false;
  var burnAgeMap = {};
  var darkCorruptAgeMap = {};
  var corruptFinalFlashUidMap = {};
  var newlyHolyUidMap = {};
  var darkWeakenedUidMap = {};
  var darkVanishedFlashUidMap = {};
  var abyssWallSummoned = false;
  var abyssWallBrokenAnimated = false;
  var newCardUidMap = {};
  var usedCardUidMap = {};
  var waveCounter = 0;
  var waveNewCardUidMap = {};
  var zeroCrisisChangedUidMap = {};
  var idlePauseCount = 0;
  var soundEnabled = (function () {
    try { return localStorage.getItem("kuku99_sound_enabled") !== "0"; } catch (e) { return true; }
  })();
  var menuOpen = false;

  // ============================================================
  // SE / BGM
  // ============================================================

  var SE = {
    cardSelect:    { src: "assets/audio/se/se_card_select_v01.mp3",        volume: 0.45 },
    buttonDecide:  { src: "assets/audio/se/se_button_decide_v01.mp3",      volume: 0.55 },
    correct:       { src: "assets/audio/se/se_correct_v01.mp3",            volume: 0.60 },
    wrong:         { src: "assets/audio/se/se_wrong_v01.mp3",              volume: 0.50 },
    hit:           { src: "assets/audio/se/se_hit_v01.mp3",                volume: 0.60 },
    special:       { src: "assets/audio/se/se_special_v01.mp3",            volume: 0.65 },
    heal:          { src: "assets/audio/se/se_heal_v01.mp3",               volume: 0.60 },
    victory:       { src: "assets/audio/se/se_victory_v01.mp3",            volume: 0.70 },
    enemyAttack:   { src: "assets/audio/se/se_enemy_attack_v01.mp3",       volume: 0.65 },
    enemyPowerUp:  { src: "assets/audio/se/se_enemy_power_up_v01.mp3",     volume: 0.55 },
    enemyGuard:    { src: "assets/audio/se/se_enemy_guard_v01.mp3",        volume: 0.55 },
    evade:         { src: "assets/audio/se/se_evade_v01.mp3",              volume: 0.60 },
    playerDamage:  { src: "assets/audio/se/se_player_damage_v01.mp3",      volume: 0.60 },
    criticalHit:   { src: "assets/audio/se/se_critical_hit_v01.mp3",        volume: 0.70 },
    defeat:        { src: "assets/audio/se/se_defeat_v01.mp3",              volume: 0.70 },
    enemyRegen:    { src: "assets/audio/se/se_enemy_regen_v01.mp3",         volume: 0.55 },
    holyUltimate:   { src: "assets/audio/se/se_holy_ultimate_v01.mp3",        volume: 0.70 },
    meteorUltimate: { src: "assets/audio/se/se_meteor_ultimate_v01.mp3",     volume: 0.70 },
    enemyIntimidateNormal: { src: "assets/audio/se/se_enemy_intimidate_v01.mp3", volume: 0.60 },
    enemyIntimidateBoss:   { src: "assets/audio/se/se_boss_intimidate_v01.mp3",  volume: 0.65 },
    abyssWall:             { src: "assets/audio/se/se_abyss_wall_v01.mp3",       volume: 0.65 },
    zeroVoidWarning:       { src: "assets/audio/se/se_zero_void_warning_v01.mp3", volume: 0.60 },
    zeroVoidNullify:       { src: "assets/audio/se/se_zero_void_nullify_v01.mp3", volume: 0.65 },
    zeroCrisis:            { src: "assets/audio/se/se_zero_crisis_v01.mp3",       volume: 0.65 }
  };

  function playSE(name) {
    if (!soundEnabled) return;
    var def = SE[name];
    if (!def) return;
    try {
      var audio = new Audio(def.src);
      audio.volume = def.volume;
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  var BGM = {
    normal:         { src: "assets/audio/bgm/bgm_battle_normal_v01.mp3?v=20260703-normalbgm2",          volume: 0.24 },
    boss:           { src: "assets/audio/bgm/bgm_battle_boss_v01.mp3",                                  volume: 0.24 },
    advancedNormal: { src: "assets/audio/bgm/bgm_battle_advanced_normal_v01.mp3?v=20260703-kodai2",     volume: 0.24 },
    advancedBoss:   { src: "assets/audio/bgm/bgm_battle_advanced_boss_v01.mp3?v=20260703-kodai2",       volume: 0.24 },
    shikkokuLow:    { src: "assets/audio/bgm/bgm_battle_black_tower_lower_v01.mp3",                     volume: 0.24 },
    shikkokuHigh:   { src: "assets/audio/bgm/bgm_battle_black_tower_upper_v01.mp3",                     volume: 0.24 },
    // 最上階（第9戦・ラスボス）：草/火/水（零積神ククノミコト）共通曲と、堕天ククノモクズ専用曲
    finalBoss:      { src: "assets/audio/bgm/bgm_battle_final_boss_v01.mp3",                            volume: 0.24 },
    finalBossPhase2:{ src: "assets/audio/bgm/bgm_battle_final_boss_phase2_v01.mp3",                     volume: 0.24 }
  };

  var SHIKKOKU_LOW_STAGES = { stage1: true, stage2: true, stage3: true, stage4: true };
  var SHIKKOKU_HIGH_STAGES = { stage5: true, stage6: true, stage7: true, stage8: true };

  function isAdvancedArea(areaDef) {
    return areaDef && (areaDef.rank === "upper" || areaDef.rank === "last");
  }

  function getBgmKeyForStage(stage, areaDef) {
    if (areaDef && areaDef.id === "shikkoku" && stage === "boss" && areaDef.finalBossPhases) {
      // ラスボス戦：現在フェーズがphaseTransitionBgmを持つ（＝堕天）なら専用曲、
      // それ以外（草/火/水共通）は通常のラスボス曲。session未生成時（呼び出し前）はfinalBossを返す。
      if (session && Battle.isFinalBossBattle(session)) {
        var phase = Battle.getCurrentFinalBossPhase(session);
        if (phase && phase.phaseTransitionBgm) return "finalBossPhase2";
      }
      return "finalBoss";
    }
    if (areaDef && areaDef.id === "shikkoku" && SHIKKOKU_LOW_STAGES[stage]) {
      return "shikkokuLow";
    }
    if (areaDef && areaDef.id === "shikkoku" && SHIKKOKU_HIGH_STAGES[stage]) {
      return "shikkokuHigh";
    }
    var advanced = isAdvancedArea(areaDef);
    if (stage === "boss") return advanced ? "advancedBoss" : "boss";
    return advanced ? "advancedNormal" : "normal";
  }

  // 堕天ククノモクズ移行時に一度だけ呼ぶ。現在再生中のBGMをフェードアウト→堕天専用曲へ差し替え
  // →フェードイン。サウンドOFF中やBGM未開始（bgmStarted=false）の場合は何もしない
  // （ON復帰時・次回起動時はgetBgmKeyForStage()が現在フェーズを見て堕天曲を正しく選ぶため、
  // ここで特別なフラグを保持する必要はない）。
  function switchToFinalBossPhase2Bgm() {
    if (!soundEnabled) return;
    if (!bgmStarted || !bgmAudio) return;
    var def = BGM.finalBossPhase2;
    if (!def) return;
    fadeOutBGM(500, function () {
      try {
        bgmAudio = new Audio(def.src);
        bgmAudio.volume = 0;
        bgmAudio.loop = true;
        var p = bgmAudio.play();
        if (p && p.then) {
          p.then(function () { fadeInBGM(def.volume, 900); }).catch(function () { bgmAudio = null; });
        } else {
          fadeInBGM(def.volume, 900);
        }
      } catch (e) {}
    });
  }

  function fadeInBGM(targetVolume, duration) {
    if (!bgmAudio) return;
    var steps = 20;
    var interval = duration / steps;
    var increment = targetVolume / steps;
    var count = 0;
    var timer = setInterval(function () {
      count++;
      try { bgmAudio.volume = Math.min(targetVolume, bgmAudio.volume + increment); } catch (e) {}
      if (count >= steps) clearInterval(timer);
    }, interval);
  }

  function startBGMOnce() {
    if (bgmStarted) return;
    if (!soundEnabled) return;
    var key = getBgmKeyForStage(session.stage, session.areaDef);
    var def = BGM[key];
    if (!def) return;
    try {
      bgmAudio = new Audio(def.src);
      bgmAudio.volume = 0;
      bgmAudio.loop = true;
      var p = bgmAudio.play();
      if (p && p.then) {
        p.then(function () {
          bgmStarted = true;
          fadeInBGM(def.volume, 1400);
        }).catch(function () {
          bgmAudio = null;
        });
      } else {
        bgmStarted = true;
        fadeInBGM(def.volume, 1400);
      }
    } catch (e) {}
  }

  function stopBGM() {
    if (!bgmAudio) return;
    try {
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
    } catch (e) {}
  }

  function fadeOutBGM(duration, callback) {
    if (!bgmAudio) {
      if (callback) callback();
      return;
    }
    var startVolume = bgmAudio.volume;
    var steps = 20;
    var interval = duration / steps;
    var decrement = startVolume / steps;
    var count = 0;
    var timer = setInterval(function () {
      count++;
      try { bgmAudio.volume = Math.max(0, bgmAudio.volume - decrement); } catch (e) {}
      if (count >= steps) {
        clearInterval(timer);
        stopBGM();
        if (callback) callback();
      }
    }, interval);
  }

  // ============================================================
  // プリロード（Netlify等での初回演出の読み込み遅延対策）
  // ============================================================

  // バトル中に発生する演出画像（頻度の低いホーリー/メテオ/威嚇/力ため等を優先）
  var BATTLE_PRELOAD_IMAGES = [
    "assets/images/effects/effect_enemy_attack_normal_v01.png",
    "assets/images/effects/effect_enemy_attack_strong_v01.png",
    "assets/images/effects/effect_enemy_intimidate_v01.png",
    "assets/images/effects/effect_opening_marker_v01.png",
    "assets/images/effects/effect_guard_barrier_v01.png",
    "assets/images/effects/effect_power_up_aura_back_v01.png",
    "assets/images/effects/effect_power_up_spark_front_v01.png",
    "assets/images/effects/effect_enemy_regen_back_v01.png",
    "assets/images/effects/effect_enemy_regen_front_v01.png",
    "assets/images/effects/effect_player_heal_v01.png",
    "assets/images/effects/spells/holy/fx_holy_circle_v01.png",
    "assets/images/effects/spells/holy/fx_holy_pillar_v01.png",
    "assets/images/effects/spells/meteor/fx_meteor_circle_v01.png",
    "assets/images/effects/spells/meteor/fx_meteor_fall_v01.png",
    "assets/images/effects/spells/meteor/fx_meteor_impact_v01.png"
  ];

  function preloadImage(src) {
    try {
      var img = new Image();
      img.onerror = function () {};
      img.src = src;
    } catch (e) {}
  }

  // session作成後・バトル開始モーダル表示時に呼ぶ（ユーザー操作不要）
  function preloadBattleImages() {
    BATTLE_PRELOAD_IMAGES.forEach(preloadImage);
    // アビスウォール画像は容量が大きいため、実際に使うステージ（アビスウォール有効時）のみ追加プリロードする
    if (session.enemyState.abyssWall && session.enemyState.abyssWall.active) {
      Object.keys(ABYSS_WALL_STAGE_IMAGES_BY_REQUIRED).forEach(function (key) {
        ABYSS_WALL_STAGE_IMAGES_BY_REQUIRED[key].forEach(preloadImage);
      });
      preloadImage(ABYSS_WALL_BREAK_IMAGE);
    }
    // ラスボス専用画像（4形態）・最上階背景（草火水共通＋堕天専用）・ゼロ・ヴォイド・ゼロ・クライシスは
    // 容量が大きい/使用頻度が低いため、ラスボス戦のときだけ追加プリロードする
    // （堕天移行はバトル開始時点では未確定だが、移行直後の読み込み待ちを防ぐため開始時点で先読みする）。
    if (Battle.isFinalBossBattle(session)) {
      Object.keys(FINAL_BOSS_IMAGE_PATHS).forEach(function (key) {
        preloadImage(FINAL_BOSS_IMAGE_PATHS[key]);
      });
      preloadImage(FINAL_BOSS_BG_IMAGE);
      preloadImage(FINAL_BOSS_BG_IMAGE_DARK);
      preloadImage(ZERO_VOID_IMAGE_WARNING);
      preloadImage(ZERO_VOID_IMAGE_ACTIVE);
      preloadImage(ZERO_VOID_IMAGE_BREAK);
      preloadImage(ZERO_CRISIS_IMAGE);
    }
  }

  function preloadAudio(src) {
    try {
      var audio = new Audio();
      audio.preload = "auto";
      audio.src = src;
      if (audio.load) audio.load();
    } catch (e) {}
  }

  // STARTボタン押下後（ユーザー操作後）に呼ぶ。iOS Safariの自動再生制限のためplay()はしない
  function preloadBattleAudio() {
    Object.keys(SE).forEach(function (key) {
      preloadAudio(SE[key].src);
    });
    // ラスボス戦：草〜水共通曲は既にstartBGMOnce()側で読み込まれるが、堕天専用曲は
    // 切替タイミングでの再生遅延を防ぐため、開始時点で事前読み込みしておく
    if (Battle.isFinalBossBattle(session)) {
      preloadAudio(BGM.finalBoss.src);
      preloadAudio(BGM.finalBossPhase2.src);
    }
  }

  // ============================================================
  // 定数
  // ============================================================

  var ELEMENT_ICONS = { fire: "🔥", water: "💧", grass: "🌱", light: "⭐", none: "✨" };

  function isHolyCard(card) {
    return card.kind === "mul" && card.a === 1 && card.b === 1;
  }

  function isMeteorCard(card) {
    return card.kind === "mul" && card.a === 9 && card.b === 9;
  }

  function isMobile() {
    return window.innerWidth <= 640 || ('ontouchstart' in window);
  }

  // iOSのキーボード閉じアニメーションが長引く端末でもスクロール復帰が間に合うよう、
  // 複数回リトライする（250msまでの2回だと戻り切らない実機があったため延長）。
  var MOBILE_SCROLL_RESTORE_DELAYS = [50, 150, 300, 500];

  function restoreMobileScroll() {
    if (!isMobile()) return;
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    MOBILE_SCROLL_RESTORE_DELAYS.forEach(function (ms) {
      setTimeout(function () {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, ms);
    });
  }

  function updateAnsweringClass() {
    var screen = document.getElementById("battle-screen");
    var answerHidden = document.getElementById("answer-panel").classList.contains("hidden");
    var attackHidden = document.getElementById("enemy-attack-panel").classList.contains("hidden");
    if (!answerHidden || !attackHidden) {
      screen.classList.add("is-answering");
    } else {
      screen.classList.remove("is-answering");
    }
  }

  var ENEMY_IMAGE_PATHS = {
    hajimari: {
      normal1: "assets/images/enemies/slime/enemy_normal1_slime_none_v01.png",
      normal2: "assets/images/enemies/bat/enemy_normal2_bat_none_v01.png",
      normal3: "assets/images/enemies/golem/enemy_normal3_golem_none_v01.png",
      boss:    "assets/images/enemies/dragon/enemy_boss_dragon_none_v01.png"
    },
    soyokaze: {
      normal1: "assets/images/enemies/slime/enemy_normal1_slime_grass_v01.png",
      normal2: "assets/images/enemies/bat/enemy_normal2_bat_grass_v01.png",
      normal3: "assets/images/enemies/golem/enemy_normal3_golem_grass_v01.png",
      boss:    "assets/images/enemies/dragon/enemy_boss_dragon_grass_v01.png"
    },
    neppa: {
      normal1: "assets/images/enemies/slime/enemy_normal1_slime_fire_v01.png",
      normal2: "assets/images/enemies/bat/enemy_normal2_bat_fire_v01.png",
      normal3: "assets/images/enemies/golem/enemy_normal3_golem_fire_v01.png",
      boss:    "assets/images/enemies/dragon/enemy_boss_dragon_fire_v01.png"
    },
    sazanami: {
      normal1: "assets/images/enemies/slime/enemy_normal1_slime_water_v01.png",
      normal2: "assets/images/enemies/bat/enemy_normal2_bat_water_v01.png",
      normal3: "assets/images/enemies/golem/enemy_normal3_golem_water_v01.png",
      boss:    "assets/images/enemies/dragon/enemy_boss_dragon_water_v01.png"
    },
    kodai: {
      normal1: "assets/images/enemies/wolf/enemy_normal1_wolf_none_v01.png",
      normal2: "assets/images/enemies/griffin/enemy_normal2_griffin_none_v01.png",
      normal3: "assets/images/enemies/titan/enemy_normal3_titan_none_v01.png",
      boss:    "assets/images/enemies/behemoth/enemy_boss_behemoth_none_v01.png"
    },
    mayoi: {
      normal1: "assets/images/enemies/wolf/enemy_normal1_wolf_grass_v01.png",
      normal2: "assets/images/enemies/griffin/enemy_normal2_griffin_grass_v01.png",
      normal3: "assets/images/enemies/titan/enemy_normal3_titan_grass_v01.png",
      boss:    "assets/images/enemies/behemoth/enemy_boss_behemoth_grass_v01.png"
    },
    shakunetsu: {
      normal1: "assets/images/enemies/wolf/enemy_normal1_wolf_fire_v01.png",
      normal2: "assets/images/enemies/griffin/enemy_normal2_griffin_fire_v01.png",
      normal3: "assets/images/enemies/titan/enemy_normal3_titan_fire_v01.png",
      boss:    "assets/images/enemies/behemoth/enemy_boss_behemoth_fire_v01.png"
    },
    shinkai: {
      normal1: "assets/images/enemies/wolf/enemy_normal1_wolf_water_v01.png",
      normal2: "assets/images/enemies/griffin/enemy_normal2_griffin_water_v01.png",
      normal3: "assets/images/enemies/titan/enemy_normal3_titan_water_v01.png",
      boss:    "assets/images/enemies/behemoth/enemy_boss_behemoth_water_v01.png"
    },
    shikkoku: {
      stage1: "assets/images/enemies/slime/enemy_normal1_slime_dark_v01.png",
      stage2: "assets/images/enemies/bat/enemy_normal2_bat_dark_v01.png",
      stage3: "assets/images/enemies/golem/enemy_normal3_golem_dark_v01.png",
      stage4: "assets/images/enemies/dragon/enemy_boss_dragon_dark_v01.png",
      stage5: "assets/images/enemies/wolf/enemy_normal1_wolf_dark_v01.png",
      stage6: "assets/images/enemies/griffin/enemy_normal2_griffin_dark_v01.png",
      stage7: "assets/images/enemies/titan/enemy_normal3_titan_dark_v01.png",
      stage8: "assets/images/enemies/behemoth/enemy_boss_behemoth_dark_v01.png"
    }
  };

  // ラスボス（漆黒の塔第9戦）専用の敵画像。areas.jsのfinalBossPhasesには画像パスの設定項目が
  // 存在しないため（調査確認済み）、ここでphase.enemyTypeをキーにしたテーブルとして持つ。
  // 通常ステージのENEMY_IMAGE_PATHSとは別枠のため、既存エリア・stage1〜8には影響しない。
  var FINAL_BOSS_IMAGE_PATHS = {
    grass: "assets/images/enemies/final_boss/enemy_final_boss_kukunomikoto_grass_v01.png",
    fire:  "assets/images/enemies/final_boss/enemy_final_boss_kukunomikoto_fire_v01.png",
    water: "assets/images/enemies/final_boss/enemy_final_boss_kukunomikoto_water_v01.png",
    dark:  "assets/images/enemies/final_boss/enemy_final_boss_kukunomokuzu_dark_v01.png"
  };
  var FINAL_BOSS_BG_IMAGE = "assets/images/backgrounds/battle/bg_battle_shikkoku_top_v01.webp";
  // 堕天ククノモクズ専用背景（崩壊した最上階）。草/火/水はFINAL_BOSS_BG_IMAGE（共通）のまま。
  var FINAL_BOSS_BG_IMAGE_DARK = "assets/images/backgrounds/battle/bg_battle_shikkoku_final_v01.webp";

  // ゼロ・ヴォイド専用画像（ラスボス専用行動）。予告・発動中・破裂の3種。
  var ZERO_VOID_IMAGE_WARNING = "assets/images/effects/effect_enemy_zero_void_warning_v01.png";
  var ZERO_VOID_IMAGE_ACTIVE  = "assets/images/effects/effect_enemy_zero_void_active_v01.png";
  var ZERO_VOID_IMAGE_BREAK   = "assets/images/effects/effect_enemy_zero_void_break_v01.png";

  // ゼロ・クライシス専用画像（堕天ククノモクズ専用行動）。
  var ZERO_CRISIS_IMAGE = "assets/images/effects/effect_enemy_zero_crisis_v01.png";

  var STAGE_FALLBACK_SPRITES = {
    normal1: "👾", normal2: "🦇", normal3: "🪨", boss: "🐉",
    stage1: "👻", stage2: "🦇", stage3: "🪨", stage4: "🐲",
    stage5: "🐺", stage6: "🦅", stage7: "🗿", stage8: "👹"
  };
  var STAGE_LABELS  = { normal1: "通常戦1", normal2: "通常戦2", normal3: "通常戦3", boss: "ぬし戦" };

  var ENEMY_NAMES = {
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

  function getEnemyName(areaDef, stage) {
    // ラスボス（漆黒の塔第9戦）：現在フェーズの名称を返す（草/火/水/堕天）。専用画像はrenderEnemySprite()で切替済み。
    if (stage === "boss" && session && Battle.isFinalBossBattle(session)) {
      var finalPhase = Battle.getCurrentFinalBossPhase(session);
      if (finalPhase) return finalPhase.name;
    }
    var areaNames = ENEMY_NAMES[areaDef.id];
    if (stage === "boss") {
      return (areaNames && areaNames.boss) || (areaDef.name + "のぬし");
    }
    areaNames = areaNames || ENEMY_NAMES.hajimari;
    return (areaNames && areaNames[stage]) || (ENEMY_NAMES.hajimari[stage]) || "モンスター";
  }

  var IDLE_REACTIONS_NORMAL = [
    "敵がうなった",
    "敵がにらんだ",
    "敵が静かに動いた"
  ];
  var IDLE_REACTIONS_BOSS = [
    "ボスがうなった",
    "ボスが低くうなり声をあげた",
    "ボスが静かに力をためている…"
  ];

  var BATTLE_STAGE_TITLES = {
    normal1: "Battle 1",
    normal2: "Battle 2",
    normal3: "Battle 3",
    boss:    "Boss Battle",
    stage1:  "Battle 1",
    stage2:  "Battle 2",
    stage3:  "Battle 3",
    stage4:  "Battle 4",
    stage5:  "Battle 5",
    stage6:  "Battle 6",
    stage7:  "Battle 7",
    stage8:  "Battle 8"
  };

  var AREA_DESCRIPTIONS = {
    none:  "カードをえらんで、バトルスタート！",
    grass: "🌿 自然の力で、敵がときどき回復する！\n早めに攻めよう！",
    fire:  "🔥 手札のカードが少しずつ燃えていく！\n燃え尽きる前にカードを使おう！",
    water: "🌊 数ターンごとに波が手札を流す！\n使いたいカードは早めに使おう！",
    light: "カードをえらんで、バトルスタート！",
    dark:  "🌑 闇が手札の力を吸い取る！\n同じカードを残し続けると、ホーリー以外は弱くなったり消えたりする！"
  };

  var ELEMENT_FLASH_CLASS = {
    fire:  "flash-fire",
    water: "flash-water",
    grass: "flash-grass",
    light: "flash-light",
    none:  "flash-white"
  };

  // ============================================================
  // サウンド管理 / バトル中メニュー
  // ============================================================

  function setSoundEnabled(val) {
    soundEnabled = val;
    try { localStorage.setItem("kuku99_sound_enabled", val ? "1" : "0"); } catch (e) {}
    if (!val) {
      stopBGM();
      bgmStarted = false;
      bgmAudio = null;
    } else if (battleStarted && !bgmStarted) {
      startBGMOnce();
    }
  }

  function updateSoundBtn() {
    var btn = document.getElementById("sound-toggle-btn");
    if (btn) btn.textContent = soundEnabled ? "🔊 サウンド OFF にする" : "🔇 サウンド ON にする";
  }

  function openMenu() {
    menuOpen = true;
    document.getElementById("battle-menu-popover").classList.remove("hidden");
  }

  function closeMenu() {
    menuOpen = false;
    document.getElementById("battle-menu-popover").classList.add("hidden");
  }

  function onBattleMenuBtn(e) {
    e.stopPropagation();
    if (menuOpen) closeMenu(); else openMenu();
  }

  function onSoundToggle(e) {
    e.stopPropagation();
    setSoundEnabled(!soundEnabled);
    updateSoundBtn();
    closeMenu();
  }

  function onReturnToStage(e) {
    e.stopPropagation();
    closeMenu();
    document.getElementById("battle-menu-confirm-overlay").classList.remove("hidden");
  }

  function onConfirmReturn() {
    var areaId = session ? session.areaDef.id : "hajimari";
    window.location.href = buildStageUrl(areaId);
  }

  function onCancelReturn() {
    document.getElementById("battle-menu-confirm-overlay").classList.add("hidden");
  }

  // ============================================================
  // 初期化
  // ============================================================

  function getParams() {
    var search = location.search.slice(1);
    var result = {};
    if (!search) return result;
    search.split("&").forEach(function (pair) {
      var eq = pair.indexOf("=");
      if (eq > 0) {
        result[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1));
      }
    });
    return result;
  }

  function init() {
    var params = getParams();
    var areaId = params.areaId || "hajimari";
    var stage  = params.stage  || "normal1";

    if (!normalizeBattleUrl(areaId, stage, params)) {
      return;
    }

    var gameState = GameState.load();
    var areaDef   = Areas.getAreaById(areaId);
    if (!areaDef) {
      document.body.textContent = "エリアが見つかりません: " + areaId;
      return;
    }

    session = Battle.createBattleSession(areaDef, stage, gameState);

    if (params.debugCards) {
      applyDebugCards(session, params.debugCards);
    }

    applyBattleBg(areaId, stage);

    document.getElementById("submit-answer-btn").addEventListener("click", onSubmitAnswer);
    document.getElementById("cancel-btn").addEventListener("click", onCancelCard);
    document.getElementById("change-hand-btn").addEventListener("click", onChangeHand);
    document.getElementById("submit-attack-btn").addEventListener("click", onSubmitAttack);
    document.getElementById("result-back-btn").addEventListener("click", onResultBack);
    document.getElementById("result-retry-btn").addEventListener("click", onResultRetry);
    document.getElementById("result-stage-btn").addEventListener("click", onResultStageSelect);

    document.getElementById("answer-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") onSubmitAnswer();
    });
    document.getElementById("attack-answer-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") onSubmitAttack();
    });
    document.getElementById("battle-start-btn").addEventListener("click", onBattleStart);

    document.getElementById("battle-menu-btn").addEventListener("click", onBattleMenuBtn);
    document.getElementById("battle-menu-popover").addEventListener("click", function (e) { e.stopPropagation(); });
    document.getElementById("sound-toggle-btn").addEventListener("click", onSoundToggle);
    document.getElementById("return-stage-btn").addEventListener("click", onReturnToStage);
    document.getElementById("battle-menu-confirm-ok").addEventListener("click", onConfirmReturn);
    document.getElementById("battle-menu-confirm-cancel").addEventListener("click", onCancelReturn);
    document.addEventListener("click", function () { if (menuOpen) closeMenu(); });

    updateSoundBtn();

    render();
    resetToPlaceholder();
    showBattleStartModal();
  }

  // ============================================================
  // デバッグ：初期手札差し替え（debugCards URLパラメータ専用）
  // ============================================================

  function applyDebugCards(session, debugCardsParam) {
    var specs = debugCardsParam.split(",");
    var debugCards = [];
    var usedSpecs = [];

    for (var i = 0; i < specs.length && debugCards.length < 5; i++) {
      var spec = specs[i].trim();
      var match = spec.match(/^(\d+)[xX](\d+)$/);
      if (!match) continue;
      var a = parseInt(match[1], 10);
      var b = parseInt(match[2], 10);
      if (a < 1 || a > 9 || b < 1 || b > 9) continue;
      debugCards.push(Cards.createMulCard(a, b));
      usedSpecs.push(a + "x" + b);
    }

    if (debugCards.length === 0) return;

    console.info("[DEBUG CARDS]", usedSpecs);

    // 手札の先頭からデバッグカードに差し替える（押し出されたカードは破棄）
    // 山札・合計枚数は変わらない（手札5枚・山札25枚を維持）
    for (var j = 0; j < debugCards.length; j++) {
      session.hand[j] = debugCards[j];
    }
  }

  // ============================================================
  // 背景
  // ============================================================

  function applyBattleBg(areaId, stage) {
    var el = document.getElementById("battle-screen");
    el.classList.remove(
      "battle-bg-hajimari", "battle-bg-hajimari-boss",
      "battle-bg-soyokaze", "battle-bg-soyokaze-boss",
      "battle-bg-neppa",    "battle-bg-neppa-boss",
      "battle-bg-sazanami", "battle-bg-sazanami-boss",
      "battle-bg-kodai",    "battle-bg-kodai-boss",
      "battle-bg-mayoi",    "battle-bg-mayoi-boss",
      "battle-bg-shakunetsu", "battle-bg-shakunetsu-boss",
      "battle-bg-shinkai",  "battle-bg-shinkai-boss",
      "battle-bg-shikkoku-low", "battle-bg-shikkoku-high",
      "battle-bg-shikkoku-top", "battle-bg-shikkoku-final"
    );
    var isBoss = (stage === "boss");
    if (areaId === "hajimari") {
      el.classList.add(isBoss ? "battle-bg-hajimari-boss" : "battle-bg-hajimari");
    } else if (areaId === "soyokaze") {
      el.classList.add(isBoss ? "battle-bg-soyokaze-boss" : "battle-bg-soyokaze");
    } else if (areaId === "neppa") {
      el.classList.add(isBoss ? "battle-bg-neppa-boss" : "battle-bg-neppa");
    } else if (areaId === "sazanami") {
      el.classList.add(isBoss ? "battle-bg-sazanami-boss" : "battle-bg-sazanami");
    } else if (areaId === "kodai") {
      el.classList.add(isBoss ? "battle-bg-kodai-boss" : "battle-bg-kodai");
    } else if (areaId === "mayoi") {
      el.classList.add(isBoss ? "battle-bg-mayoi-boss" : "battle-bg-mayoi");
    } else if (areaId === "shakunetsu") {
      el.classList.add(isBoss ? "battle-bg-shakunetsu-boss" : "battle-bg-shakunetsu");
    } else if (areaId === "shinkai") {
      el.classList.add(isBoss ? "battle-bg-shinkai-boss" : "battle-bg-shinkai");
    } else if (areaId === "shikkoku" && SHIKKOKU_LOW_STAGES[stage]) {
      // 低層4戦は背景1種のみ
      el.classList.add("battle-bg-shikkoku-low");
    } else if (areaId === "shikkoku" && SHIKKOKU_HIGH_STAGES[stage]) {
      el.classList.add("battle-bg-shikkoku-high");
    } else if (areaId === "shikkoku" && stage === "boss") {
      // 最上階（第9戦・ラスボス）。堕天ククノモクズ形態だけ専用背景へ切り替える
      // （フェーズ番号のハードコードではなく、enemyTypeで判定する）。
      el.classList.add(isDarkFinalBossPhase() ? "battle-bg-shikkoku-final" : "battle-bg-shikkoku-top");
    }
  }

  // ラスボス戦かつ現在フェーズが堕天（enemyType==="dark"）かどうか。session未生成時はfalse。
  function isDarkFinalBossPhase() {
    if (!session || !Battle.isFinalBossBattle(session)) return false;
    var phase = Battle.getCurrentFinalBossPhase(session);
    return !!(phase && phase.enemyType === "dark");
  }

  // ============================================================
  // 描画
  // ============================================================

  function render() {
    // 背景はUIローカル変数へキャッシュせず、毎回session（現在フェーズ）から再判定する
    // （堕天専用背景切替・サウンド設定変更後の再描画などでも常に正しい状態になるようにするため）。
    applyBattleBg(session.areaDef.id, session.stage);
    renderEnemyHP();
    renderEnemySprite();
    renderEnemyAttackPanel();
    renderHand();
    renderPlayerSection();
    renderCombo();
    renderAnswerPanel();
  }

  function renderEnemyHP() {
    var hp    = session.enemyHp;
    var maxHp = session.enemyMaxHp;
    var pct   = maxHp > 0 ? Math.max(0, Math.round(hp / maxHp * 100)) : 0;
    document.getElementById("enemy-hp-fill").style.width = pct + "%";
    document.getElementById("enemy-hp-text").textContent = hp + " / " + maxHp;
  }

  function renderEnemyHPValue(hp, maxHp) {
    var pct = maxHp > 0 ? Math.max(0, Math.round(hp / maxHp * 100)) : 0;
    document.getElementById("enemy-hp-fill").style.width = pct + "%";
    document.getElementById("enemy-hp-text").textContent = hp + " / " + maxHp;
  }

  function renderEnemySprite() {
    var stage = session.stage;
    var section = document.getElementById("enemy-sprite-section");
    section.classList.remove(
      "enemy-stage-normal1", "enemy-stage-normal2", "enemy-stage-normal3", "enemy-stage-boss",
      "enemy-stage-stage1", "enemy-stage-stage2", "enemy-stage-stage3", "enemy-stage-stage4",
      "enemy-stage-stage5", "enemy-stage-stage6", "enemy-stage-stage7", "enemy-stage-stage8"
    );
    section.classList.add("enemy-stage-" + stage);
    section.classList.remove("enemy-rank-lower", "enemy-rank-upper", "enemy-rank-last");
    section.classList.add("enemy-rank-" + (session.areaDef.rank || "lower"));
    var spriteEl = document.getElementById("enemy-sprite");
    var areaId = session.areaDef.id;
    var finalPhase = Battle.isFinalBossBattle(session) ? Battle.getCurrentFinalBossPhase(session) : null;
    var areaImgs = ENEMY_IMAGE_PATHS[areaId] || ENEMY_IMAGE_PATHS.hajimari;
    var imgPath = finalPhase
      ? FINAL_BOSS_IMAGE_PATHS[finalPhase.enemyType]
      : ((areaImgs && areaImgs[stage]) || (ENEMY_IMAGE_PATHS.hajimari[stage]));

    var wrapEl = document.getElementById("enemy-sprite-wrap");
    if (wrapEl) {
      var idleClasses = ENEMY_IDLE_SPECIES.concat(FINAL_BOSS_IDLE_SPECIES).map(function (s) { return "enemy-idle-" + s; });
      wrapEl.classList.remove.apply(wrapEl.classList, idleClasses);
      var species = null;
      if (finalPhase) {
        species = finalPhase.enemyType === "dark" ? "kukunomokuzu" : "kukunomikoto";
      } else if (imgPath) {
        for (var i = 0; i < ENEMY_IDLE_SPECIES.length; i++) {
          if (imgPath.indexOf("/enemies/" + ENEMY_IDLE_SPECIES[i] + "/") !== -1) {
            species = ENEMY_IDLE_SPECIES[i];
            break;
          }
        }
      }
      if (species) {
        wrapEl.classList.add("enemy-idle-" + species);
      }
    }

    if (imgPath) {
      var img = document.createElement("img");
      img.className = "enemy-image" + (stage === "boss" ? " enemy-boss" : "");
      img.src = imgPath;
      img.alt = getEnemyName(session.areaDef, stage);
      img.onerror = (function (fallback) {
        return function () { spriteEl.textContent = fallback; };
      })(STAGE_FALLBACK_SPRITES[stage] || "👾");
      spriteEl.innerHTML = "";
      spriteEl.appendChild(img);
    } else {
      spriteEl.textContent = STAGE_FALLBACK_SPRITES[stage] || "👾";
    }

    var nameEl = document.getElementById("enemy-name");
    nameEl.textContent = getEnemyName(session.areaDef, stage);

    var badgesEl = document.getElementById("enemy-badges");
    var badges = [];
    if (session.enemyState.guard)   badges.push("🛡 ガード");
    if (session.enemyState.powerUp) badges.push("🔥 力ため");
    if (session.enemyState.opening) badges.push("✨ 隙あり");
    if (session.enemyState.intimidateLocked && session.enemyState.intimidateLocked.length > 0) badges.push("😤 威嚇中");
    if (session.enemyState.abyssWall && session.enemyState.abyssWall.active && !session.enemyState.abyssWall.broken) {
      badges.push("🧱 アビスウォール");
    }
    // 予告演出が終わるまではバッジも常設アウラ(renderEnemyEffects)と同じくenemyStateEffectsVisible
    // でゲートし、先出しにならないようにする（他の既存バッジは意図的に変更しない）。
    if (session.enemyState.zeroVoidActive && enemyStateEffectsVisible) badges.push("🌀 ゼロ・ヴォイド");
    badgesEl.textContent = badges.join("  ");
    badgesEl.className = badges.length > 0 ? "badges-visible" : "";

    renderEnemyEffects();
    renderAbyssWallEffect();
  }

  function renderEnemyEffects() {
    var backEl    = document.getElementById("enemy-effect-back");
    var frontEl   = document.getElementById("enemy-effect-front");
    var sparkEl   = document.getElementById("enemy-power-spark-effect");
    var openingEl = document.getElementById("enemy-opening-effect");

    if (enemyStateEffectsVisible && session.enemyState.powerUp) {
      backEl.className = "enemy-state-effect effect-power-up";
      backEl.src = "assets/images/effects/effect_power_up_aura_back_v01.png";
    } else {
      backEl.className = "enemy-state-effect hidden";
      backEl.removeAttribute("src");
    }

    if (enemyStateEffectsVisible && session.enemyState.guard) {
      frontEl.className = "enemy-state-effect effect-guard";
      frontEl.src = "assets/images/effects/effect_guard_barrier_v01.png";
    } else {
      frontEl.className = "enemy-state-effect hidden";
      frontEl.removeAttribute("src");
    }

    if (sparkEl) {
      if (enemyStateEffectsVisible && session.enemyState.powerUp) {
        sparkEl.className = "enemy-power-spark-effect";
        sparkEl.src = "assets/images/effects/effect_power_up_spark_front_v01.png";
      } else {
        sparkEl.className = "enemy-power-spark-effect hidden";
        sparkEl.removeAttribute("src");
      }
    }

    if (openingEl) {
      if (enemyStateEffectsVisible && session.enemyState.opening) {
        openingEl.src = "assets/images/effects/effect_opening_marker_v01.png";
        openingEl.classList.remove("hidden");
      } else {
        openingEl.classList.add("hidden");
        openingEl.removeAttribute("src");
      }
    }

    var zeroVoidActiveEl = document.getElementById("enemy-zero-void-active-effect");
    if (zeroVoidActiveEl) {
      if (enemyStateEffectsVisible && session.enemyState.zeroVoidActive) {
        zeroVoidActiveEl.src = ZERO_VOID_IMAGE_ACTIVE;
        zeroVoidActiveEl.classList.remove("hidden");
        zeroVoidActiveEl.classList.add("zero-void-active-visible");
      } else {
        zeroVoidActiveEl.classList.remove("zero-void-active-visible");
        zeroVoidActiveEl.classList.add("hidden");
        zeroVoidActiveEl.removeAttribute("src");
      }
    }
  }

  // ============================================================
  // アビスウォール（漆黒の塔専用・防御ギミック）
  // ============================================================

  // 破壊に必要な段数ごとの画像段階（0種正解〜requiredCount-1種正解まで）。
  // 破壊直前・破壊演出（最終段）は共通で05を使う（triggerAbyssWallBreak参照）。
  // 3種類版のエントリは、2026-07-12にstage8が3→2種類版へ変更されたため現在は未使用（将来
  // 別ステージで3種類版が必要になった場合に備えて残置。テーブルに追加するだけで拡張できる）。
  var ABYSS_WALL_STAGE_IMAGES_BY_REQUIRED = {
    2: [
      "assets/images/effects/effect_enemy_abyss_wall01_v01.png", // 0種正解（未破壊）
      "assets/images/effects/effect_enemy_abyss_wall03_v01.png"  // 1種正解
    ],
    3: [
      "assets/images/effects/effect_enemy_abyss_wall01_v01.png", // 0種正解（未破壊）
      "assets/images/effects/effect_enemy_abyss_wall02_v01.png", // 1種正解
      "assets/images/effects/effect_enemy_abyss_wall04_v01.png"  // 2種正解
    ]
  };
  var ABYSS_WALL_BREAK_IMAGE = "assets/images/effects/effect_enemy_abyss_wall05_v01.png";
  // 登場演出のタイミング定数。「敵の下から闇のエネルギーがせり上がってくる」ことを認識させるため、
  // START直後に即展開するのではなく、一拍(ABYSS_WALL_SUMMON_DELAY_MS)置いてから登場アニメーションを開始する。
  var ABYSS_WALL_SUMMON_DELAY_MS = 400;
  var ABYSS_WALL_SUMMON_ANIM_MS = 1080;

  function getAbyssWallStageImage(wall) {
    var stages = ABYSS_WALL_STAGE_IMAGES_BY_REQUIRED[wall.requiredCount] || ABYSS_WALL_STAGE_IMAGES_BY_REQUIRED[2];
    var idx = Math.min(wall.usedDans.length, stages.length - 1);
    return stages[idx];
  }

  // 通常描画（毎render時に呼ぶ）。summon演出・破壊演出はそれぞれ専用関数が一度だけ制御する。
  function renderAbyssWallEffect() {
    var el = document.getElementById("enemy-abyss-wall-effect");
    if (!el) return;
    var wall = session.enemyState.abyssWall;

    if (!wall || !wall.active || !abyssWallSummoned) {
      el.className = "enemy-abyss-wall-effect hidden";
      el.removeAttribute("src");
      return;
    }

    if (wall.broken) {
      // 破壊演出は triggerAbyssWallBreak() が一度だけ制御する。未着手ならここで起動する。
      if (!abyssWallBrokenAnimated) {
        triggerAbyssWallBreak();
      }
      return; // 表示中のclassName/srcは triggerAbyssWallBreak 側のタイマーに委ねる
    }

    el.src = getAbyssWallStageImage(wall);
    el.className = "enemy-abyss-wall-effect abyss-wall-visible";
  }

  // START直後に一度だけ呼ぶ：下からせり出す登場演出
  function triggerAbyssWallSummon() {
    var wall = session.enemyState.abyssWall;
    if (!wall || !wall.active || abyssWallSummoned) return;
    abyssWallSummoned = true;
    var el = document.getElementById("enemy-abyss-wall-effect");
    if (!el) return;
    el.src = getAbyssWallStageImage(wall);
    el.className = "enemy-abyss-wall-effect abyss-wall-visible abyss-wall-summon";
    playSE("abyssWall");
    setTimeout(function () {
      var el2 = document.getElementById("enemy-abyss-wall-effect");
      if (el2) el2.classList.remove("abyss-wall-summon");
    }, ABYSS_WALL_SUMMON_ANIM_MS);
  }

  // broken検知後に一度だけ呼ぶ：破壊直前画像(05)を短く見せてから非表示にする
  function triggerAbyssWallBreak() {
    if (abyssWallBrokenAnimated) return;
    abyssWallBrokenAnimated = true;
    var el = document.getElementById("enemy-abyss-wall-effect");
    if (!el) return;
    el.src = ABYSS_WALL_BREAK_IMAGE;
    el.className = "enemy-abyss-wall-effect abyss-wall-visible abyss-wall-breaking";
    playSE("abyssWall");
    setTimeout(function () {
      var el2 = document.getElementById("enemy-abyss-wall-effect");
      if (el2) {
        el2.className = "enemy-abyss-wall-effect hidden";
        el2.removeAttribute("src");
      }
    }, 600);
  }

  function renderEnemyAttackPanel() {
    var panel = document.getElementById("enemy-attack-panel");
    if (session.pendingAttack) {
      var att = session.pendingAttack;
      var q   = att.question;

      var advanced = session.areaDef && (session.areaDef.rank === "upper" || session.areaDef.rank === "last");
      var labelText, hpWarning;
      if (att.kind === "counter") {
        if (att.powered) {
          labelText = "⚡ 力をこめた反撃！";
          hpWarning = advanced ? "ミスするとハート-3" : "ミスするとハート-2";
        } else {
          labelText = "⚡ 敵が反撃してきた！";
          hpWarning = advanced ? "ミスするとハート-2" : "ミスするとハート-1";
        }
      } else {
        if (att.powered) {
          labelText = "💥 力をこめた強力なこうげき！";
          hpWarning = advanced ? "ミスするとハート-5" : "ミスするとハート-3";
        } else {
          labelText = "💥 ボスの強力なこうげき！";
          hpWarning = advanced ? "ミスするとハート-3" : "ミスするとハート-2";
        }
      }

      document.getElementById("attack-label").textContent = labelText;
      document.getElementById("attack-hp-warning").textContent = hpWarning;
      document.getElementById("attack-question").innerHTML = buildFormulaLayoutHtml(q.a, q.b, "mul");
      document.getElementById("attack-reading").innerHTML = buildReadingLayoutHtml(q.a, q.b, "mul");
      document.getElementById("attack-answer-input").value = "";
      panel.classList.remove("hidden");
      if (!isMobile()) document.getElementById("attack-answer-input").focus();
    } else {
      panel.classList.add("hidden");
    }
    updateAnsweringClass();
  }

  function renderHand() {
    var handEl = document.getElementById("hand-cards");
    handEl.innerHTML = "";
    var locked = !!session.pendingAttack || session.ended || interactionLocked || !battleStarted;
    var hasOpening = session.enemyState.opening;
    var intimidateLocked = session.enemyState.intimidateLocked || [];

    session.hand.forEach(function (card) {
      var div = document.createElement("div");
      var classes = ["card", "card-" + card.kind];
      var isIntimidateLocked = intimidateLocked.indexOf(card.uid) !== -1;

      if (card.kind === "mul" && card.element && card.element !== "none") {
        classes.push("element-" + card.element);
      }

      // カード背景画像クラス
      if (card.kind === "mul") {
        classes.push("card-bg-mul-" + (card.element || "none"));
      } else if (card.kind === "add") {
        classes.push("card-bg-add");
      } else if (card.kind === "sub") {
        classes.push("card-bg-heal");
      }

      // 特殊カード発光（背景画像は変えず、外枠の薄い発光のみ上乗せ）
      if (card.kind === "mul") {
        if (isHolyCard(card)) {
          classes.push("card-special-holy");
        } else if (isMeteorCard(card)) {
          classes.push("card-special-meteor");
        }
      }

      if (card.uid === selectedCardUid) classes.push("card-selected");
      if (locked) classes.push("card-disabled");
      if (isIntimidateLocked) classes.push("card-intimidate-locked");

      var isTargetMul = hasOpening && card.kind === "mul" && card.dan === session.areaDef.dan;
      if (isTargetMul && !locked) classes.push("card-opening-highlight");

      div.className = classes.join(" ");

      // 特殊/上級カードoverlay（属性背景の上、闇侵食/炎上オーバーレイの下）。
      // ホーリー/メテオは専用overlayを優先し、上級overlayとは重ねない。背景画像自体は変更しない。
      if (card.kind === "mul") {
        var rarityOverlayClass = null;
        if (isHolyCard(card)) {
          rarityOverlayClass = "card-overlay-holy";
        } else if (isMeteorCard(card)) {
          rarityOverlayClass = "card-overlay-meteor";
        } else if (card.rank === "upper") {
          rarityOverlayClass = "card-overlay-upper";
        }
        if (rarityOverlayClass) {
          var rarityDiv = document.createElement("div");
          rarityDiv.className = "card-rarity-overlay " + rarityOverlayClass;
          div.appendChild(rarityDiv);
        }
      }

      // 炎上オーバーレイ（火属性エリアのみ、burnAge 1 以上）
      if (isFireArea()) {
        var rawAge = burnAgeMap[card.uid] || 0;
        var visualAge = getBurnVisualAge(rawAge);
        if (visualAge >= 1) {
          var burnDiv = document.createElement("div");
          burnDiv.className = "card-burn-overlay burn-age-" + visualAge + " burn-fade-in";
          div.appendChild(burnDiv);
        }
        if (rawAge >= getBurnoutThreshold()) {
          div.classList.add("card-burning-out");
        }
      }

      // 闇侵食オーバーレイ（闇属性エリアのみ、1×1ホーリーは対象外）
      // 通常はage(1〜4)に応じてdark01〜04。変化直前フラッシュ中(corruptFinalFlashUidMap)だけdark05+corrupting-out。
      if (isDarkArea() && !isHolyCard(card)) {
        var inFinalFlash = card.uid in corruptFinalFlashUidMap;
        var rawCorruptAge = darkCorruptAgeMap[card.uid] || 0;
        var visualCorruptAge = inFinalFlash ? 5 : getDarkCorruptVisualAge(rawCorruptAge);
        if (visualCorruptAge >= 1) {
          var corruptDiv = document.createElement("div");
          corruptDiv.className = "card-corrupt-overlay corrupt-age-" + visualCorruptAge + " corrupt-fade-in";
          div.appendChild(corruptDiv);
        }
        if (inFinalFlash) {
          div.classList.add("card-corrupting-out");
        }
      }

      // ホーリー化演出（闇侵食で1×1ホーリーに変化した直後、白く発光）
      if (card.uid in newlyHolyUidMap) {
        div.classList.add("card-holy-transform-flash");
      }

      // 闇侵食の弱化/消滅（補充）演出（黒紫フラッシュ。ホーリー化とは別枠のため重ならない）
      if (card.uid in darkWeakenedUidMap || card.uid in darkVanishedFlashUidMap) {
        div.classList.add("card-dark-weaken-flash");
      }

      // 補充カード演出（燃え尽き後の新規補充カード）
      // newCardUidMap には 0 始まりの順序インデックスが入るため in 演算子で存在確認
      if (card.uid in newCardUidMap) {
        div.classList.add("card-new-dealt");
        var dealDelay = newCardUidMap[card.uid] * 70; // 70ms ずつ左→右にスタガー
        if (dealDelay > 0) div.style.animationDelay = dealDelay + "ms";
      }

      // 通常カード使用後の補充演出
      if (card.uid in usedCardUidMap) {
        div.classList.add("card-replaced-after-use");
      }

      // 波リフレッシュ後の新カード演出（左から順にスタガー）
      if (card.uid in waveNewCardUidMap) {
        div.classList.add("card-wave-dealt");
        var waveDelay = waveNewCardUidMap[card.uid] * 70;
        if (waveDelay > 0) div.style.animationDelay = waveDelay + "ms";
      }

      // ゼロ・クライシスで弱体化された直後のカード（赤紫フラッシュ。UIDを維持しているため
      // 威嚇ロック・闇侵食ageなど他のUID基準状態とは独立して重ねられる）
      if (card.uid in zeroCrisisChangedUidMap) {
        div.classList.add("card-zero-crisis-changed");
      }

      var badgeDiv = document.createElement("div");
      badgeDiv.className = "card-badge";
      badgeDiv.textContent = cardBadgeText(card);
      div.appendChild(badgeDiv);

      var questionDiv = document.createElement("div");
      questionDiv.className = "card-formula";
      questionDiv.textContent = cardFormula(card);
      div.appendChild(questionDiv);

      // 威嚇ロック中は暗転オーバーレイ + ×表示（タップ不可）
      if (isIntimidateLocked) {
        var lockOverlay = document.createElement("div");
        lockOverlay.className = "card-intimidate-lock";
        lockOverlay.textContent = "×";
        div.appendChild(lockOverlay);
      }

      if (!locked && !isIntimidateLocked) {
        (function (uid) {
          div.addEventListener("click", function () { onSelectCard(uid); });
        })(card.uid);
      }

      handEl.appendChild(div);
    });
  }

  function renderPlayerSection() {
    var heartsEl = document.getElementById("hearts-area");
    heartsEl.innerHTML = "";
    for (var i = 0; i < session.maxHp; i++) {
      var span = document.createElement("span");
      span.className = "heart";
      span.textContent = i < session.hp ? "❤️" : "🖤";
      heartsEl.appendChild(span);
    }

    var total = session.initialDeckSize;
    var remaining = session.deck.length;
    var deckIconSlots = 6;
    var filled = remaining > 0 ? Math.ceil(remaining / 5) : 0;
    if (filled > deckIconSlots) filled = deckIconSlots;
    var html = "<span class='deck-label'>山札</span>";
    for (var gi = 0; gi < deckIconSlots; gi++) {
      html += "<span class='deck-pip " + (gi < filled ? "filled" : "empty") + "'></span>";
    }
    html += "<span class='deck-number'>" + remaining + "/" + total + "</span>";
    document.getElementById("deck-count").innerHTML = html;

    document.getElementById("change-hand-btn").disabled =
      !battleStarted || session.hp < 2 || !!session.pendingAttack || session.ended || interactionLocked;

    updateDangerOverlay();
  }

  function renderCombo() {
    document.getElementById("feedback-combo").textContent = "";
  }

  function renderAnswerPanel() {
    var panel = document.getElementById("answer-panel");
    if (!selectedCardUid || !!session.pendingAttack || session.ended) {
      panel.classList.add("hidden");
      selectedCardUid = null;
      updateAnsweringClass();
      return;
    }
    var card = findInHand(selectedCardUid);
    if (!card) {
      panel.classList.add("hidden");
      selectedCardUid = null;
      updateAnsweringClass();
      return;
    }
    document.getElementById("selected-question").innerHTML = buildFormulaLayoutHtml(card.a, card.b, card.kind);
    document.getElementById("selected-reading").innerHTML = buildReadingLayoutHtml(card.a, card.b, card.kind);

    var btn = document.getElementById("submit-answer-btn");
    btn.classList.remove("action-mul", "action-add", "action-sub");
    if (card.kind === "mul") {
      btn.textContent = "ひっさつ！";
      btn.classList.add("action-mul");
    } else if (card.kind === "add") {
      btn.textContent = "こうげき！";
      btn.classList.add("action-add");
    } else {
      btn.textContent = "かいふく！";
      btn.classList.add("action-sub");
    }

    panel.classList.remove("hidden");
    updateAnsweringClass();
  }

  // ============================================================
  // 式・読みHTML生成
  // ============================================================

  function buildFormulaLayoutHtml(a, b, kind) {
    var op = kind === "mul" ? "×" : kind === "add" ? "+" : "−";
    return [
      "<div class='formula-layout'>",
      "<span class='formula-part formula-left'>" + a + "</span>",
      "<span class='formula-part formula-op'>" + op + "</span>",
      "<span class='formula-part formula-right'>" + b + "</span>",
      "<span class='formula-part formula-eq'>=</span>",
      "</div>"
    ].join("");
  }

  function buildReadingLayoutHtml(a, b, kind) {
    var readA, readB, readEq;
    if (kind === "mul") {
      readA  = Yomi.numberToYomiKuku(a);
      readB  = Yomi.numberToYomiKuku(b);
      readEq = "？";
    } else {
      readA  = Yomi.numberToYomiPlain(a);
      readB  = Yomi.numberToYomiPlain(b);
      readEq = "は？";
    }
    return [
      "<div class='formula-reading-layout'>",
      "<span class='reading-part reading-left'>"  + readA  + "</span>",
      "<span class='reading-part reading-op'></span>",
      "<span class='reading-part reading-right'>" + readB  + "</span>",
      "<span class='reading-part reading-eq'>"    + readEq + "</span>",
      "</div>"
    ].join("");
  }

  // ============================================================
  // カード表示ヘルパー
  // ============================================================

  function cardBadgeText(card) {
    if (card.kind === "mul") {
      if (isHolyCard(card)) return "🌟 ホーリー";
      if (isMeteorCard(card)) return "☄️ メテオ";
      var icon = ELEMENT_ICONS[card.element] || "✨";
      return icon + " " + (card.rank === "upper" ? "強必殺" : "必殺");
    }
    if (card.kind === "add") return "⚔️ 攻撃";
    return "❤️ 回復";
  }

  function cardFormula(card) {
    if (card.kind === "mul") return card.a + " × " + card.b;
    if (card.kind === "add") return card.a + " + " + card.b;
    return card.a + " - " + card.b;
  }

  function comboBonus(combo) {
    if (combo >= 5) return 20;
    if (combo === 4) return 15;
    if (combo === 3) return 10;
    if (combo === 2) return 5;
    return 0;
  }

  function buildComboStatusText(combo) {
    if (combo < 2) return "";
    return combo + "連続コンボ継続中！（ダメージ+" + comboBonus(combo) + "%）";
  }

  var ELEMENT_NAMES = { fire: "火属性", water: "水属性", grass: "草属性", light: "光属性", none: "無属性" };

  function buildCardDescription(card) {
    if (card.kind === "mul") {
      if (isHolyCard(card)) return "🌟 1×1 ホーリー！ 会心判定が2回！";
      if (isMeteorCard(card)) return "☄️ 9×9 メテオ！ 敵のガードを貫通！";
      var ename = ELEMENT_NAMES[card.element] || "無属性";
      return ename + "の必殺技で攻撃";
    }
    if (card.kind === "add") return "たし算カードで攻撃";
    return "ひき算カードで回復";
  }

  function showSelectedCardFeedback(card) {
    var f = document.getElementById("feedback-formula");
    var readEl = document.getElementById("feedback-reading");
    f.textContent = buildCardDescription(card);
    f.className   = "";
    readEl.textContent = "";
    readEl.className   = "";

    var correctionParts = [];
    var isWeakness = card.kind === "mul" && card.element !== "none" && card.element === session.areaDef.weakness;
    if (isWeakness) {
      correctionParts.push("弱点！ダメージ+50%");
    }
    var areaRankForLowDan = session.areaDef.rank;
    if (card.kind === "mul" && card.rank === "lower" && (areaRankForLowDan === "upper" || areaRankForLowDan === "last")) {
      correctionParts.push("低い段の攻撃は上級敵では威力半減");
    }
    if (card.kind === "mul" && (card.a === 1 || card.b === 1) && !isHolyCard(card)) {
      correctionParts.push("1が入ったかけ算は会心率UP！");
    }
    if (card.kind === "add") {
      var areaRank = session.areaDef.rank;
      if (areaRank === "upper" || areaRank === "last") {
        correctionParts.push("上級敵は-50%");
      }
    }
    var comboText = buildComboStatusText(session.combo);
    if (comboText) correctionParts.push(comboText);
    document.getElementById("feedback-correction").textContent = correctionParts.join(" / ");
    document.getElementById("feedback-hint").textContent = "";
  }

  function findInHand(uid) {
    for (var i = 0; i < session.hand.length; i++) {
      if (session.hand[i].uid === uid) return session.hand[i];
    }
    return null;
  }

  // ============================================================
  // 演出
  // ============================================================

  function flashScreen(kind, element) {
    var cls;
    if (kind === "sub") {
      cls = "flash-green";
    } else if (kind === "mul") {
      cls = ELEMENT_FLASH_CLASS[element] || "flash-white";
    } else {
      cls = "flash-white";
    }
    var overlay = document.getElementById("flash-overlay");
    overlay.classList.remove(cls);
    void overlay.offsetWidth;
    overlay.classList.add(cls);
    setTimeout(function () { overlay.classList.remove(cls); }, 500);
  }

  function flashMiss() {
    var overlay = document.getElementById("flash-overlay");
    overlay.classList.remove("flash-miss");
    void overlay.offsetWidth;
    overlay.classList.add("flash-miss");
    setTimeout(function () { overlay.classList.remove("flash-miss"); }, 400);
  }

  var ENEMY_IDLE_SPECIES = ["slime", "bat", "golem", "dragon", "wolf", "griffin", "titan", "behemoth"];
  // ラスボス専用待機モーション種別。草/火/水（零積神ククノミコト）は共通の浮遊モーション、
  // 堕天（ククノモクズ）は専用の不規則な震えモーション。画像パスがfinal_boss/配下のため
  // ENEMY_IDLE_SPECIESのディレクトリ名判定では拾えず、phase.enemyTypeで直接判定する。
  var FINAL_BOSS_IDLE_SPECIES = ["kukunomikoto", "kukunomokuzu"];

  function pauseIdleAnimation() {
    var wrapEl = document.getElementById("enemy-sprite-wrap");
    if (!wrapEl) return;
    idlePauseCount++;
    wrapEl.classList.add("enemy-idle-paused");
  }

  function resumeIdleAnimation() {
    var wrapEl = document.getElementById("enemy-sprite-wrap");
    if (!wrapEl) return;
    idlePauseCount = Math.max(0, idlePauseCount - 1);
    if (idlePauseCount === 0) {
      wrapEl.classList.remove("enemy-idle-paused");
    }
  }

  function shakeEnemySprite() {
    pauseIdleAnimation();
    var el = document.getElementById("enemy-sprite");
    el.classList.remove("enemy-shake");
    void el.offsetWidth;
    el.classList.add("enemy-shake");
    setTimeout(function () {
      el.classList.remove("enemy-shake");
      resumeIdleAnimation();
    }, 550);
  }

  // CSSのkf-enemy-defeated(0.8s)と一致させる
  var ENEMY_DEFEAT_EFFECT_MS = 800;

  // 敵HP0（勝利）時のみ呼ぶ撃退演出。白フラッシュ→震え→沈み込み縮小→フェードアウトを#enemy-sprite自体のCSSアニメーションで行う。
  // 敗北/撤退時は呼ばない。ホーリー/メテオとどめの場合は、それらの演出完了後に呼ぶ想定（呼び出し側で制御）。
  function playEnemyDefeatEffect(callback) {
    var el = document.getElementById("enemy-sprite");
    if (!el) { if (callback) callback(); return; }
    pauseIdleAnimation();
    el.classList.remove("enemy-defeated");
    void el.offsetWidth;
    el.classList.add("enemy-defeated");
    setTimeout(function () {
      el.classList.remove("enemy-defeated");
      resumeIdleAnimation();
      if (callback) callback();
    }, ENEMY_DEFEAT_EFFECT_MS);
  }

  function shakeScreen() {
    var el = document.getElementById("battle-screen");
    el.classList.remove("screen-shake");
    void el.offsetWidth;
    el.classList.add("screen-shake");
    setTimeout(function () { el.classList.remove("screen-shake"); }, 400);
  }

  function flashPlayerDamage() {
    var overlay = document.getElementById("flash-overlay");
    overlay.classList.remove("flash-player-damage");
    void overlay.offsetWidth;
    overlay.classList.add("flash-player-damage");
    setTimeout(function () { overlay.classList.remove("flash-player-damage"); }, 450);
  }

  function playPlayerDamageFeedback() {
    setTimeout(function () { playSE("playerDamage"); }, 100);
    shakeScreen();
    flashPlayerDamage();
  }

  function flashCritical() {
    var overlay = document.getElementById("flash-overlay");
    overlay.classList.remove("flash-critical");
    void overlay.offsetWidth;
    overlay.classList.add("flash-critical");
    setTimeout(function () { overlay.classList.remove("flash-critical"); }, 520);
  }

  function showPlayerHealEffect() {
    var el = document.getElementById("player-heal-effect");
    if (!el) return;
    el.classList.remove("hidden", "heal-animate");
    void el.offsetWidth;
    el.classList.add("heal-animate");
    setTimeout(function () {
      el.classList.remove("heal-animate");
      el.classList.add("hidden");
    }, 750);
  }

  function showEnemyAttackEffect(powered) {
    var el = document.getElementById("enemy-attack-effect");
    if (!el) return;
    pauseIdleAnimation();
    el.src = powered
      ? "assets/images/effects/effect_enemy_attack_strong_v01.png"
      : "assets/images/effects/effect_enemy_attack_normal_v01.png";
    el.classList.remove("hidden", "attack-normal", "attack-strong", "attack-animate");
    el.classList.add(powered ? "attack-strong" : "attack-normal");
    void el.offsetWidth;
    el.classList.add("attack-animate");
    setTimeout(function () {
      el.classList.remove("attack-normal", "attack-strong", "attack-animate");
      el.classList.add("hidden");
      resumeIdleAnimation();
    }, 700);
  }

  function showEnemyIntimidateEffect() {
    var el = document.getElementById("enemy-intimidate-effect");
    if (!el) return;
    pauseIdleAnimation();
    el.src = "assets/images/effects/effect_enemy_intimidate_v01.png";
    el.classList.remove("hidden", "intimidate-animate");
    void el.offsetWidth;
    el.classList.add("intimidate-animate");
    setTimeout(function () {
      el.classList.remove("intimidate-animate");
      el.classList.add("hidden");
      resumeIdleAnimation();
    }, 900);
  }

  // ゼロ・ヴォイド発動予告（敵行動として選ばれた瞬間、showEnemyAction()と同じタイミングで一度だけ再生）
  // 予告演出が完了してからcallbackを呼ぶ（発動中の常設表示・操作再開はcallback側の責務）。
  // 予告完了前にactive画像・操作再開を先出ししないよう、呼び出し側は必ずcallback待ちで繋ぐこと。
  function showEnemyZeroVoidWarningEffect(callback) {
    playSE("zeroVoidWarning");

    var el = document.getElementById("enemy-zero-void-warning-effect");
    if (!el) {
      if (callback) callback();
      return;
    }

    pauseIdleAnimation();
    el.src = ZERO_VOID_IMAGE_WARNING;
    el.classList.remove("hidden", "zero-void-warning-animate");
    void el.offsetWidth;
    el.classList.add("zero-void-warning-animate");

    setTimeout(function () {
      el.classList.remove("zero-void-warning-animate");
      el.classList.add("hidden");
      el.removeAttribute("src");
      resumeIdleAnimation();

      if (callback) callback();
    }, 900);
  }

  // ゼロ・ヴォイドの解決演出（無効化/貫通いずれの場合も、発動状態が終わったことを示す共通の破裂演出）。
  // 無効化時のみse_zero_void_nullifyを鳴らす。貫通時はホーリー本体の演出音が既に鳴っているため鳴らさない。
  function showEnemyZeroVoidBreakEffect(nullified) {
    if (nullified) playSE("zeroVoidNullify");

    // 攻撃で解決した通常ヒットの場合、この関数はrender()より前（同一同期処理内）に呼ばれるため、
    // 常設active表示が消えるより先にbreak演出が始まってしまう。ここで明示的に閉じ、
    // warning/active/breakが同時表示にならないようにする（バッジ自体は次のrender()で消える）。
    var activeEl = document.getElementById("enemy-zero-void-active-effect");
    if (activeEl) {
      activeEl.classList.remove("zero-void-active-visible");
      activeEl.classList.add("hidden");
      activeEl.removeAttribute("src");
    }

    var el = document.getElementById("enemy-zero-void-break-effect");
    if (!el) return;
    el.src = ZERO_VOID_IMAGE_BREAK;
    el.classList.remove("hidden", "zero-void-break-animate");
    void el.offsetWidth;
    el.classList.add("zero-void-break-animate");
    setTimeout(function () {
      el.classList.remove("zero-void-break-animate");
      el.classList.add("hidden");
    }, 700);
  }

  // ゼロ・クライシス演出時間（CSSのkf-zero-crisis-approachと一致させる）。
  var ZERO_CRISIS_APPROACH_MS = 1300;

  // 敵付近に小さく出現→プレイヤー側へ迫るように拡大→フェードアウト、の一連。
  // カードデータ自体はbattle.js側で既に変化済み（このタイミングでは何も書き換えない）。
  // 演出完了後にcallbackを呼ぶ（手札再描画・変化フラッシュ・操作再開はcallback側の責務）。
  function showEnemyZeroCrisisEffect(callback) {
    playSE("zeroCrisis");

    var el = document.getElementById("enemy-zero-crisis-effect");
    if (!el) {
      if (callback) callback();
      return;
    }

    pauseIdleAnimation();
    el.src = ZERO_CRISIS_IMAGE;
    el.classList.remove("hidden", "zero-crisis-approach");
    void el.offsetWidth;
    el.classList.add("zero-crisis-approach");

    setTimeout(function () {
      el.classList.remove("zero-crisis-approach");
      el.classList.add("hidden");
      el.removeAttribute("src");
      resumeIdleAnimation();

      if (callback) callback();
    }, ZERO_CRISIS_APPROACH_MS);
  }

  // 対象カードの変化メッセージ＋短いフラッシュ表示。beforeCard/afterCardはbattle.js側の
  // triggerEnemyAction()が値コピーで返したもの（カード参照そのものではない）。
  function showZeroCrisisCardChangeEffect(action) {
    var before = action.beforeCard, after = action.afterCard;
    if (before && after) {
      var opBefore = before.kind === "add" ? " + " : before.kind === "sub" ? " - " : " × ";
      var opAfter  = after.kind  === "add" ? " + " : after.kind  === "sub" ? " - " : " × ";
      showInfoFeedback(
        before.a + opBefore + before.b + " が " + after.a + opAfter + after.b + " に変えられた！"
      );
    }
    if (action.targetUid) {
      zeroCrisisChangedUidMap[action.targetUid] = true;
      renderHand();
      setTimeout(function () {
        delete zeroCrisisChangedUidMap[action.targetUid];
        renderHand();
      }, 700);
    }
  }

  function animateRegenLayer(el, src) {
    if (!el) return;
    el.src = src;
    el.classList.remove("hidden", "regen-animate");
    void el.offsetWidth;
    el.classList.add("regen-animate");
    setTimeout(function () {
      el.classList.remove("regen-animate");
      el.classList.add("hidden");
    }, 1000);
  }

  function showEnemyRegenEffect() {
    pauseIdleAnimation();
    setTimeout(function () { resumeIdleAnimation(); }, 1000);
    animateRegenLayer(
      document.getElementById("enemy-regen-effect-back"),
      "assets/images/effects/effect_enemy_regen_back_v01.png"
    );
    animateRegenLayer(
      document.getElementById("enemy-regen-effect-front"),
      "assets/images/effects/effect_enemy_regen_front_v01.png"
    );
  }

  function playHolyUltimateEffect(callback) {
    playSE("holyUltimate");

    var circle = document.getElementById("holy-effect-circle");
    var pillar = document.getElementById("holy-effect-pillar");

    if (!circle || !pillar) {
      if (callback) callback();
      return;
    }

    pauseIdleAnimation();

    circle.src = "assets/images/effects/spells/holy/fx_holy_circle_v01.png";
    pillar.src = "assets/images/effects/spells/holy/fx_holy_pillar_v01.png";

    circle.classList.remove("hidden", "holy-circle-animate");
    pillar.classList.remove("hidden", "holy-pillar-animate");
    void circle.offsetWidth;
    void pillar.offsetWidth;

    circle.classList.add("holy-circle-animate");

    setTimeout(function () {
      pillar.classList.add("holy-pillar-animate");
    }, 350);

    setTimeout(function () {
      circle.classList.add("hidden");
      pillar.classList.add("hidden");
      circle.classList.remove("holy-circle-animate");
      pillar.classList.remove("holy-pillar-animate");
      circle.removeAttribute("src");
      pillar.removeAttribute("src");
      resumeIdleAnimation();
      if (callback) callback();
    }, 1700);
  }

  function playMeteorUltimateEffect(callback) {
    playSE("meteorUltimate");

    var circle = document.getElementById("meteor-effect-circle");
    var fall   = document.getElementById("meteor-effect-fall");
    var impact = document.getElementById("meteor-effect-impact");

    if (!circle || !fall || !impact) {
      if (callback) callback();
      return;
    }

    pauseIdleAnimation();

    circle.src = "assets/images/effects/spells/meteor/fx_meteor_circle_v01.png";
    fall.src   = "assets/images/effects/spells/meteor/fx_meteor_fall_v01.png";
    impact.src = "assets/images/effects/spells/meteor/fx_meteor_impact_v01.png";

    circle.classList.remove("hidden", "meteor-circle-animate");
    fall.classList.remove("hidden", "meteor-fall-animate");
    impact.classList.remove("hidden", "meteor-impact-animate");
    void circle.offsetWidth;
    void fall.offsetWidth;
    void impact.offsetWidth;

    // 0ms: 魔法陣フェードイン開始
    circle.classList.add("meteor-circle-animate");

    // 450ms: 隕石落下開始
    setTimeout(function () {
      fall.classList.add("meteor-fall-animate");
    }, 450);

    // 1050ms: 着弾 → 隕石を非表示 → 爆発表示
    setTimeout(function () {
      fall.classList.add("hidden");
      fall.classList.remove("meteor-fall-animate");
      impact.classList.add("meteor-impact-animate");
    }, 1050);

    // 2100ms: 全て非表示 → コールバック
    setTimeout(function () {
      circle.classList.add("hidden");
      impact.classList.add("hidden");
      circle.classList.remove("meteor-circle-animate");
      impact.classList.remove("meteor-impact-animate");
      circle.removeAttribute("src");
      fall.removeAttribute("src");
      impact.removeAttribute("src");
      resumeIdleAnimation();
      if (callback) callback();
    }, 2100);
  }

  function showEnemyRegenMessage(regen) {
    var msgEl = document.getElementById("enemy-action-msg");
    var textEl = document.getElementById("enemy-action-text");
    if (!msgEl || !textEl || !regen) return;

    textEl.textContent = "🌿 敵が自然の力で " + regen.heal + " 回復した！";
    msgEl.className = "enemy-action-regen";

    clearTimeout(enemyMsgTimer);
    enemyMsgTimer = setTimeout(function () {
      msgEl.classList.add("fb-hidden");
    }, 2200);
  }

  function updateDangerOverlay() {
    var el = document.getElementById("danger-overlay");
    if (!el || !session) return;
    el.classList.remove("danger-hp2", "danger-hp1");
    if (session.hp <= 1) {
      el.classList.add("danger-hp1");
    } else if (session.hp === 2) {
      el.classList.add("danger-hp2");
    }
  }

  function playDefeatTransition(callback) {
    var overlay = document.getElementById("defeat-transition-overlay");
    if (!overlay) {
      if (callback) callback();
      return;
    }
    overlay.classList.remove("defeat-transition-active");
    void overlay.offsetWidth;
    overlay.classList.add("defeat-transition-active");
    setTimeout(function () {
      if (callback) callback();
    }, 1150);
  }

  function clearDefeatTransition() {
    var overlay = document.getElementById("defeat-transition-overlay");
    if (!overlay) return;
    setTimeout(function () {
      overlay.classList.remove("defeat-transition-active");
    }, 200);
  }

  function animateEnemyPreAction(callback) {
    pauseIdleAnimation();
    var el = document.getElementById("enemy-sprite");
    el.classList.remove("enemy-preaction");
    void el.offsetWidth;
    el.classList.add("enemy-preaction");
    setTimeout(function () {
      el.classList.remove("enemy-preaction");
      resumeIdleAnimation();
      if (callback) callback();
    }, 550);
  }

  // 最終ダメージを敵スプライト付近にポップ表示する。会心時は会心を優先。
  function showDamagePop(damage, critical, weakness) {
    var el = document.getElementById("enemy-damage-pop");
    var prefix = critical ? "会心！" : (weakness ? "弱点！" : "");
    el.textContent = prefix + damage + "ダメージ！";
    el.classList.remove("pop-animate", "damage-critical", "damage-weakness");
    if (critical) el.classList.add("damage-critical");
    else if (weakness) el.classList.add("damage-weakness");
    void el.offsetWidth;
    el.classList.add("pop-animate");
    setTimeout(function () {
      el.classList.remove("pop-animate", "damage-critical", "damage-weakness");
    }, 2000);
  }

  // ============================================================
  // 炎上ギミック（火属性エリア専用）
  // ============================================================

  function isFireArea() {
    return session && Battle.getCurrentEnemyType(session) === "fire";
  }

  function getBurnoutThreshold() {
    return session.stage === "boss" ? 4 : 5;
  }

  function getBurnVisualAge(age) {
    if (age <= 0) return 0; // 配布直後は炎なし（ボス戦でも age+1 しない）
    var threshold = getBurnoutThreshold();
    if (age >= threshold) return 5;
    if (session.stage === "boss") {
      return Math.min(age + 1, 4);
    }
    return age;
  }

  // カード使用後、手札に残ったカードの burnAge を +1 する
  // prePlayUids: カード使用前に手札にあった UID のマップ（使用カード除く）
  function ageBurnCards(prePlayUids) {
    session.hand.forEach(function (card) {
      if (prePlayUids[card.uid]) {
        burnAgeMap[card.uid] = (burnAgeMap[card.uid] || 0) + 1;
      } else {
        // 山札から補充されてきた新カード → age 0
        burnAgeMap[card.uid] = 0;
      }
    });
    // 手札から離れたカードのエントリを削除
    var handUids = {};
    session.hand.forEach(function (c) { handUids[c.uid] = true; });
    Object.keys(burnAgeMap).forEach(function (uid) {
      if (!handUids[uid]) delete burnAgeMap[uid];
    });
  }

  function hasBurnouts() {
    var threshold = getBurnoutThreshold();
    var keys = Object.keys(burnAgeMap);
    for (var i = 0; i < keys.length; i++) {
      if (burnAgeMap[keys[i]] >= threshold) return true;
    }
    return false;
  }

  // burnAge 閾値以上のカードを、同一スロット位置で山札から差し替える（左詰めしない）
  function processBurnouts() {
    var threshold = getBurnoutThreshold();

    // 燃え尽き対象の uid と手札 index を収集（index 順 = 左→右）
    var burnedSlots = [];
    session.hand.forEach(function (card, index) {
      if ((burnAgeMap[card.uid] || 0) >= threshold) {
        burnedSlots.push({ uid: card.uid, index: index });
      }
    });

    // burnAgeMap から削除
    burnedSlots.forEach(function (slot) {
      delete burnAgeMap[slot.uid];
    });

    // 同一スロットに新カードを差し替え（山札切れ時は null を仮置き）
    newCardUidMap = {};
    var dealOrder = 0;
    burnedSlots.forEach(function (slot) {
      if (session.deck.length > 0) {
        var newCard = session.deck.shift();
        session.hand[slot.index] = newCard;
        burnAgeMap[newCard.uid] = 0;
        newCardUidMap[newCard.uid] = dealOrder; // 順序インデックス（スタガー遅延に使用）
        dealOrder++;
      } else {
        session.hand[slot.index] = null;
      }
    });

    // null スロット（山札切れで補充できなかった位置）を除去
    session.hand = session.hand.filter(function (card) { return card !== null; });

    // 600ms 後に補充カード演出クラスをクリア
    if (Object.keys(newCardUidMap).length > 0) {
      setTimeout(function () { newCardUidMap = {}; }, 600);
    }

    // 手札・山札ともに空なら敗北 / 撤退
    if (!session.ended && session.deck.length === 0 && session.hand.length === 0) {
      session.ended = true;
      session.outcome = session.stage === "boss" ? "lose" : "retreat";
    }

    return burnedSlots.length;
  }

  // ============================================================
  // 闇侵食ギミック（闇属性エリア専用）
  // burnAgeMap/processBurnouts と同じ構造だが、かけ算カードは消滅ではなく
  // その場で弱化（またはホーリー化）する点が火属性と異なる。
  // ============================================================

  function isDarkArea() {
    return session && Battle.getCurrentEnemyType(session) === "dark";
  }

  // 低層(stage1〜stage4)は共通で4（＝4ターンかけて吸収される）。高層・ボスでの短縮は未実装（将来検討、要件定義書セクション70参照）。
  function getDarkCorruptThreshold() {
    return 4;
  }

  // age1〜4はdark01〜04を安定表示。dark05（変化直前フラッシュ）は markCorruptionFinalFlash() 側で
  // corruptFinalFlashUidMap に載ったカードだけに個別適用するため、ここではage4で頭打ちにする。
  function getDarkCorruptVisualAge(age) {
    if (age <= 0) return 0;
    var threshold = getDarkCorruptThreshold();
    return Math.min(age, threshold);
  }

  // カード使用後、手札に残っている侵食対象カードの age を+1する。1×1ホーリーは対象外（侵食されない）。
  function ageDarkCorruptCards(prePlayUids) {
    session.hand.forEach(function (card) {
      if (isHolyCard(card)) {
        delete darkCorruptAgeMap[card.uid];
        return;
      }
      if (prePlayUids[card.uid]) {
        darkCorruptAgeMap[card.uid] = (darkCorruptAgeMap[card.uid] || 0) + 1;
      } else {
        // 山札から補充されてきた新カード → age 0
        darkCorruptAgeMap[card.uid] = 0;
      }
    });
    var handUids = {};
    session.hand.forEach(function (c) { handUids[c.uid] = true; });
    Object.keys(darkCorruptAgeMap).forEach(function (uid) {
      if (!handUids[uid]) delete darkCorruptAgeMap[uid];
    });
  }

  function hasCorruptions() {
    var threshold = getDarkCorruptThreshold();
    var keys = Object.keys(darkCorruptAgeMap);
    for (var i = 0; i < keys.length; i++) {
      if (darkCorruptAgeMap[keys[i]] >= threshold) return true;
    }
    return false;
  }

  // 閾値到達カードを「変化直前フラッシュ（dark05 + card-corrupting-out）」表示に切り替える。
  // 4ターン目はdark04を表示済みのため、変化処理の直前だけ短時間dark05へ差し替える。
  function markCorruptionFinalFlash() {
    var threshold = getDarkCorruptThreshold();
    corruptFinalFlashUidMap = {};
    session.hand.forEach(function (card) {
      if ((darkCorruptAgeMap[card.uid] || 0) >= threshold) {
        corruptFinalFlashUidMap[card.uid] = true;
      }
    });
  }

  // 侵食が閾値に達したカードを処理する。
  // かけ算カード: 同一uid・同一スロットのまま弱化（またはホーリー化）。age は 0 にリセットして再侵食に備える。
  // 引き算カード: 消滅し、同一スロットへ山札から補充（山札切れならスロット除去）。
  function processCorruptions() {
    var threshold = getDarkCorruptThreshold();
    var weakenedCount = 0, holyCount = 0, vanishedCount = 0;
    var vanishedSlots = [];

    session.hand.forEach(function (card, index) {
      if (!card) return;
      if ((darkCorruptAgeMap[card.uid] || 0) < threshold) return;

      if (card.kind === "mul") {
        var becameHoly = Cards.corruptMulCard(card);
        darkCorruptAgeMap[card.uid] = 0;
        if (becameHoly) {
          holyCount++;
          newlyHolyUidMap[card.uid] = true;
        } else {
          weakenedCount++;
          darkWeakenedUidMap[card.uid] = true;
        }
      } else if (card.kind === "sub") {
        vanishedSlots.push({ uid: card.uid, index: index });
      }
    });

    vanishedSlots.forEach(function (slot) {
      delete darkCorruptAgeMap[slot.uid];
    });

    if (vanishedSlots.length > 0) {
      newCardUidMap = {};
      var dealOrder = 0;
      vanishedSlots.forEach(function (slot) {
        if (session.deck.length > 0) {
          var newCard = session.deck.shift();
          session.hand[slot.index] = newCard;
          darkCorruptAgeMap[newCard.uid] = 0;
          newCardUidMap[newCard.uid] = dealOrder;
          darkVanishedFlashUidMap[newCard.uid] = true; // 消滅→補充された枠に黒紫フラッシュを重ねる
          dealOrder++;
        } else {
          session.hand[slot.index] = null;
        }
        vanishedCount++;
      });
      session.hand = session.hand.filter(function (c) { return c !== null; });
      setTimeout(function () { newCardUidMap = {}; }, 600);
    }

    if (holyCount > 0) {
      setTimeout(function () { newlyHolyUidMap = {}; }, 900);
    }
    if (weakenedCount > 0 || vanishedCount > 0) {
      setTimeout(function () { darkWeakenedUidMap = {}; darkVanishedFlashUidMap = {}; }, 700);
    }

    if (!session.ended && session.deck.length === 0 && session.hand.length === 0) {
      session.ended = true;
      session.outcome = session.stage === "boss" ? "lose" : "retreat";
    }

    corruptFinalFlashUidMap = {};
    return { weakenedCount: weakenedCount, holyCount: holyCount, vanishedCount: vanishedCount };
  }

  function buildCorruptionMessage(result) {
    var parts = [];
    if (result.holyCount > 0) {
      parts.push(result.holyCount > 1 ? "闇から" + result.holyCount + "枚のホーリーが生まれた！" : "闇からホーリーが生まれた！");
    }
    if (result.weakenedCount > 0) {
      parts.push(result.weakenedCount > 1 ? result.weakenedCount + "枚のカードの力が闇に吸われた…" : "カードの力が闇に吸われた…");
    }
    if (result.vanishedCount > 0) {
      parts.push(result.vanishedCount > 1 ? result.vanishedCount + "枚の回復カードが闇に飲まれた！" : "回復カードが闇に飲まれた！");
    }
    return parts.length > 0 ? "🌑 " + parts.join(" ") : "";
  }

  // 火属性の燃え尽き／闇属性の侵食、どちらか該当する方の1100ms処理を実行してから続行する。
  // 両エリアは enemyType が排他のため同時に走ることはない。
  function processPendingCardTransformAndContinue(continueFn) {
    if (isFireArea() && hasBurnouts()) {
      setTimeout(function () {
        var burnCount = processBurnouts();
        var burnMsg = burnCount > 1
          ? "🔥 " + burnCount + "枚のカードが燃え尽きた！"
          : "🔥 カードが燃え尽きた！";
        showInfoFeedback(burnMsg);
        renderHand();
        renderPlayerSection();
        if (session.ended) {
          scheduleEnd();
          return;
        }
        continueFn();
      }, 1100);
    } else if (isDarkArea() && hasCorruptions()) {
      // 2段階タイミング：dark04表示（既にrender済み）を600ms見せた後、変化直前フラッシュ(dark05)を500ms見せてから変化させる。
      // 合計1100msは火属性の燃え尽きと同じ演出尺。
      setTimeout(function () {
        markCorruptionFinalFlash();
        renderHand();
        setTimeout(function () {
          var corruptResult = processCorruptions();
          var msg = buildCorruptionMessage(corruptResult);
          if (msg) showInfoFeedback(msg);
          renderHand();
          renderPlayerSection();
          if (session.ended) {
            scheduleEnd();
            return;
          }
          continueFn();
        }, 500);
      }, 600);
    } else {
      continueFn();
    }
  }

  // ============================================================
  // 波ギミック（水属性エリア専用）
  // ============================================================

  function isWaterArea() {
    return session && Battle.getCurrentEnemyType(session) === "water";
  }

  function getWaveRefreshThreshold() {
    return session.stage === "boss" ? 3 : 4;
  }

  function refreshHandByWave() {
    // 威嚇と波リフレッシュが同ターンに重なった場合、triggerEnemyAction()（battle.js）が
    // 選んだintimidateLockedは旧手札のUIDのままのため、ここで単純に空へリセットすると
    // 「威嚇メッセージ・演出は出るのに実際は何もロックされていない」状態になり、威嚇が
    // 実質無効に見えてしまう（実機確認で発見）。旧ロック枚数（battle.js側の通常2枚/ボス3枚の
    // 判定結果）だけを維持し、波後の新手札から同じ考え方（最低1枚は使用可能を残す）で
    // 再抽選する。battle.js側のtriggerEnemyAction()自体は変更しない（B案：影響範囲を
    // 波+威嚇が同時発生した場合だけに限定する）。
    var oldLockedCount = (session.enemyState.intimidateLocked && session.enemyState.intimidateLocked.length) || 0;

    var combined = session.deck.concat(session.hand);
    session.deck = Cards.shuffleArray(combined);
    session.hand = [];
    waveNewCardUidMap = {};
    while (session.hand.length < 5 && session.deck.length > 0) {
      var card = session.deck.shift();
      session.hand.push(card);
      waveNewCardUidMap[card.uid] = session.hand.length - 1;
    }

    if (oldLockedCount > 0 && session.hand.length > 0) {
      var lockableCount = Math.max(0, session.hand.length - 1);
      var newLockCount = Math.min(oldLockedCount, lockableCount);
      var candidates = session.hand.map(function (c) { return c.uid; });
      for (var si = candidates.length - 1; si > 0; si--) {
        var sj = Math.floor(Math.random() * (si + 1));
        var tmp = candidates[si];
        candidates[si] = candidates[sj];
        candidates[sj] = tmp;
      }
      session.enemyState.intimidateLocked = candidates.slice(0, newLockCount);
    } else {
      session.enemyState.intimidateLocked = [];
    }
  }

  function playWaveAnimation(callback) {
    var waveEl = document.getElementById("hand-wave-effect");
    if (!waveEl) {
      refreshHandByWave();
      renderHand();
      callback();
      return;
    }

    waveEl.classList.remove("hidden", "wave-in", "wave-out");
    void waveEl.offsetWidth;
    waveEl.classList.add("wave-in");

    // 波が手札を覆ったタイミング（500ms）でリフレッシュ
    setTimeout(function () {
      refreshHandByWave();

      // 山札・手札が尽きた場合は敗北/撤退
      if (!session.ended && session.deck.length === 0 && session.hand.length === 0) {
        session.ended = true;
        session.outcome = session.stage === "boss" ? "lose" : "retreat";
      }

      // 波フェードアウト開始
      waveEl.classList.remove("wave-in");
      void waveEl.offsetWidth;
      waveEl.classList.add("wave-out");

      // 新カードを描画（波がフェードアウトしながら card-wave-dealt が見える）
      renderHand();

      // フェードアウト完了（350ms）
      setTimeout(function () {
        waveEl.classList.add("hidden");
        waveEl.classList.remove("wave-out");
        setTimeout(function () { waveNewCardUidMap = {}; }, 600);

        if (session.ended) {
          scheduleEnd();
          return;
        }
        callback();
      }, 350);
    }, 500);
  }

  function advanceWaveCounterAndMaybeRefresh(callback) {
    if (!isWaterArea()) {
      callback();
      return;
    }

    waveCounter++;
    var threshold = getWaveRefreshThreshold();

    if (waveCounter >= threshold) {
      waveCounter = 0;
      showInfoFeedback("🌊 波で手札が流された！");
      playWaveAnimation(callback);
    } else {
      var remaining = threshold - waveCounter;
      if (remaining === 1) {
        showInfoFeedback("🌊 大きな波が来る！ あと1ターン");
      } else if (remaining === 2) {
        showInfoFeedback("💧 波が近づいている… あと2ターン");
      }
      callback();
    }
  }

  // ============================================================
  // インタラクション
  // ============================================================

  function showBattleStartModal() {
    var titleEl = document.getElementById("battle-start-title");
    var descEl  = document.getElementById("battle-start-description");
    titleEl.textContent = BATTLE_STAGE_TITLES[session.stage] || "Battle";
    var desc;
    if (Battle.isFinalBossBattle(session)) {
      // ラスボス戦：session.areaDef.enemyTypeは常に"dark"固定のため使わず専用の説明文にする。
      // 開始時点は常に草形態のため、草形態のギミック（アビスウォール2種・専用リジェネ）だけを
      // 説明する。火・水・堕天形態の存在や「4形態連戦であること」はここでは明かさない
      // （形態切替時の驚きを保つため）。具体的な数値（3%・30回復等）も出さない。
      desc = "零積神 ククノミコトとの最終決戦！\n\n🧱 異なる2つの段でアビスウォールを壊そう！\n🌿 4回行動するごとに、敵が自然の力で回復する！";
    } else if (session.areaDef.enemyType === "fire" && session.stage === "boss") {
      desc = "🔥 ボス戦ではカードが早く燃え尽きる！\n手札をよく見て、早めに使おう！";
    } else if (session.areaDef.enemyType === "water" && session.stage === "boss") {
      desc = "🌊 ボス戦では波が早く押し寄せる！\n手札が流される前にカードを使おう！";
    } else if (session.areaDef.enemyType === "dark" && session.enemyState.abyssWall && session.enemyState.abyssWall.active) {
      desc = "🌑 闇がカードの力を吸い取る！\n🧱 異なる段のかけ算で、アビスウォールを壊そう！";
    } else {
      desc = AREA_DESCRIPTIONS[session.areaDef.enemyType] || AREA_DESCRIPTIONS.none;
    }
    descEl.textContent = desc;

    preloadBattleImages();
  }

  function onBattleStart() {
    playSE("buttonDecide");
    startBGMOnce();
    preloadBattleAudio();
    battleStarted = true;
    document.getElementById("battle-start-overlay").classList.add("hidden");

    var wall = session.enemyState.abyssWall;
    if (wall && wall.active) {
      // 敵が見えた直後に即バリアが存在しているように見えないよう、一拍置いてからせり上がらせる。
      // その間だけ操作をロックする（合計ロック時間＝遅延＋登場アニメーション）。
      interactionLocked = true;
      renderHand();
      renderPlayerSection();
      setTimeout(function () {
        triggerAbyssWallSummon();
        setTimeout(function () {
          interactionLocked = false;
          renderHand();
        }, ABYSS_WALL_SUMMON_ANIM_MS);
      }, ABYSS_WALL_SUMMON_DELAY_MS);
    } else {
      renderHand();
      renderPlayerSection();
    }
  }

  function onSelectCard(uid) {
    if (!battleStarted || session.ended || session.pendingAttack || interactionLocked) return;
    playSE("cardSelect");
    startBGMOnce();
    selectedCardUid = selectedCardUid === uid ? null : uid;
    clearPersistentFeedback();
    renderHand();
    renderAnswerPanel();
    if (selectedCardUid) {
      document.getElementById("answer-input").value = "";
      if (!isMobile()) document.getElementById("answer-input").focus();
      var card = findInHand(selectedCardUid);
      if (card) showSelectedCardFeedback(card);
    } else {
      resetToPlaceholder();
    }
  }

  function onCancelCard() {
    if (interactionLocked) return;
    selectedCardUid = null;
    document.getElementById("answer-panel").classList.add("hidden");
    updateAnsweringClass();
    renderHand();
    resetToPlaceholder();
  }

  // ============================================================
  // ラスボス4フェーズ連戦：中間形態撃破時のUI切替（Step B基盤 + Step C専用素材接続）
  // ============================================================
  // ラスボス専用画像・最上階背景・専用BGM開始/切替・常設フェーズ表示を接続する。
  // ゼロ・ヴォイドは実装済み（本関数はフェーズ切替時のUIローカル状態リセットのみを扱う）。
  // ゼロ・クライシス（堕天専用）は今回未実装のまま。

  var FINAL_BOSS_PHASE_MESSAGE_MS = 1600;
  var FINAL_BOSS_PHASE_APPEAR_MS = 600;

  // フェーズ切替時の簡易メッセージ（currentPhase.enemyTypeで一意に決まる。
  // grassは初期形態のため「切替」メッセージを持たない）。
  var FINAL_BOSS_PHASE_MESSAGES = {
    fire:  "🔥 ククノミコトが火の姿へ変化した！　✨ 山札と手札がよみがえった！",
    water: "🌊 ククノミコトが水の姿へ変化した！　✨ 山札と手札がよみがえった！",
    dark:  "🌑 0の力が暴走する――　堕天 ククノモクズが現れた！"
  };

  // フェーズ切替時にリセットすべきUIローカル状態一式。battle.js側のsessionは既に
  // 新フェーズ用に再構築済み（山札・手札・enemyState等）のため、ここではbattleUI.js固有の
  // 演出タイミング管理用ローカル変数のみをリセットする。idlePauseCountは演出関数側の
  // pause/resumeが自己完結しているため、ここでは直接操作しない。
  function resetUiStateForFinalBossPhaseTransition() {
    selectedCardUid = null;
    burnAgeMap = {};
    darkCorruptAgeMap = {};
    corruptFinalFlashUidMap = {};
    newlyHolyUidMap = {};
    darkWeakenedUidMap = {};
    darkVanishedFlashUidMap = {};
    newCardUidMap = {};
    usedCardUidMap = {};
    waveCounter = 0;
    waveNewCardUidMap = {};
    abyssWallSummoned = false;
    abyssWallBrokenAnimated = false;
    enemyStateEffectsVisible = false;
    zeroCrisisChangedUidMap = {};
    clearPersistentFeedback();
    clearTimeout(enemyMsgTimer);
    var msgEl = document.getElementById("enemy-action-msg");
    if (msgEl) msgEl.classList.add("fb-hidden");
    // 直前のフェーズ切替で万一残っていた場合の保険（通常は自身のsetTimeoutで解除済み）。
    var screenEl0 = document.getElementById("battle-screen");
    if (screenEl0) screenEl0.classList.remove("bg-transition-dark");
  }

  // 簡易フェーズ切替表示（既存のフィードバック欄を流用。専用DOMは追加しない）
  function showFinalBossPhaseMessage(phase) {
    var text = FINAL_BOSS_PHASE_MESSAGES[phase.enemyType] || (phase.name + " が姿を現した！");
    showInfoFeedback(text);
  }

  // 次形態出現の簡易フェードイン。#enemy-sprite自体はrender()内で既に新画像へ差し替わっているため、
  // ここでは見た目の強調（フェードイン+明滅）を加えるだけ。通常の最終撃破(enemy-defeated)とは別クラス。
  function playPhaseAppearEffect() {
    var el = document.getElementById("enemy-sprite");
    if (!el) return;
    el.classList.remove("enemy-phase-appearing");
    void el.offsetWidth;
    el.classList.add("enemy-phase-appearing");
    setTimeout(function () {
      el.classList.remove("enemy-phase-appearing");
    }, FINAL_BOSS_PHASE_APPEAR_MS);
  }

  // 堕天移行時、背景・敵画像の差し替え瞬間を短い暗転で隠すための時間（クロスフェード代替の最小案）。
  var BG_TRANSITION_DARK_FADE_MS = 220;
  var BG_TRANSITION_DARK_HOLD_MS = 90;

  // 敵撃破の演出（通常/ホーリー/メテオいずれか）が完了した後に呼ぶ。
  // UIローカル状態リセット → （堕天移行のみ）短い暗転 → 再描画（新フェーズの画像/背景/HP/敵名/手札/
  // バッジ/アビスウォール非表示を反映。旧画像→新画像の切替はrender()内で同期的に行われ、描画を
  // 挟まないため旧画像が一瞬見える問題は起きない） → 次形態フェードイン → （堕天移行なら）BGM切替
  // → 簡易切替メッセージ → （堕天移行なら）暗転解除 → （壁がある形態なら）アビスウォール登場演出
  // → 操作再開、の順で進める。
  function runFinalBossPhaseTransition(phaseTransition) {
    resetUiStateForFinalBossPhaseTransition();

    var nextPhase = phaseTransition.currentPhase;
    var isDarkPhase = nextPhase.enemyType === "dark";
    var hasWall = !!(nextPhase.hasAbyssWall && nextPhase.hasAbyssWall.requiredCount);
    var screenEl = document.getElementById("battle-screen");

    function proceedAfterSwap() {
      render(); // 敵画像・背景を同時に新フェーズへ切り替える
      playPhaseAppearEffect();
      if (nextPhase.phaseTransitionBgm) {
        // 堕天移行時のみ一度だけ切替。草→火・火→水では発火しない
        // （phaseTransitionBgmを持つのはareas.js上で堕天フェーズのみのため）。
        switchToFinalBossPhase2Bgm();
      }
      showFinalBossPhaseMessage(nextPhase);

      if (isDarkPhase) {
        setTimeout(function () {
          screenEl.classList.remove("bg-transition-dark");
        }, BG_TRANSITION_DARK_HOLD_MS);
      }

      setTimeout(function () {
        if (hasWall) {
          triggerAbyssWallSummon();
          setTimeout(function () {
            interactionLocked = false;
            // renderHand()呼び出し前(interactionLocked=true時点)のrender()でカードがロック状態のまま
            // 描画されているため、解除後にもう一度描画してクリック可能な状態へ戻す
            // （continueEnemyAction()のdoEnemyAction()と同じパターン）。
            renderHand();
            renderPlayerSection();
          }, ABYSS_WALL_SUMMON_ANIM_MS + 200);
        } else {
          interactionLocked = false;
          renderHand();
          renderPlayerSection();
        }
      }, FINAL_BOSS_PHASE_MESSAGE_MS);
    }

    if (isDarkPhase) {
      // 堕天移行のみ：背景・敵画像の差し替え瞬間を短い暗転で隠す（旧水形態の撃退演出は
      // 呼び出し元のhandleFinalBossPhaseTransition()側で既に完了済みのため、ここでの暗転は
      // 撃退演出を先取りするものではなく、その直後の画像/背景切替だけを覆う）。
      screenEl.classList.add("bg-transition-dark");
      setTimeout(proceedAfterSwap, BG_TRANSITION_DARK_FADE_MS);
    } else {
      proceedAfterSwap();
    }
  }

  // 通常攻撃/ホーリー/メテオのいずれで中間形態を倒しても、この関数経由で
  // runFinalBossPhaseTransition() へ合流させる。特殊演出の途中で敵画像や手札は切り替えない。
  function handleFinalBossPhaseTransition(phaseTransition, isHolyHit, isMeteorHit) {
    if (isHolyHit) {
      playHolyUltimateEffect(function () { runFinalBossPhaseTransition(phaseTransition); });
    } else if (isMeteorHit) {
      playMeteorUltimateEffect(function () { runFinalBossPhaseTransition(phaseTransition); });
    } else {
      // 通常攻撃：ダメージポップ等（showCardFeedback／ヒット演出）が見えてから
      // 既存の撃退演出（playEnemyDefeatEffect）を流用し、直後に次形態へ切り替える。
      // 専用の中間形態フェードアウトは新設しない（B案）。playEnemyDefeatEffect()は
      // enemy-defeatedクラスを外した直後・同一JS実行ターン内で同期的にコールバック
      // （runFinalBossPhaseTransition、render()内で次形態の専用画像へ差し替え済み）を呼ぶため、
      // ブラウザが再描画を挟む余地がなく「旧画像が一瞬通常状態で見える」問題は起きない。
      // 新画像出現時の見た目の強調は playPhaseAppearEffect()（enemy-phase-appearing）が別途担う。
      setTimeout(function () {
        playEnemyDefeatEffect(function () { runFinalBossPhaseTransition(phaseTransition); });
      }, isMobile() ? 700 : 300);
    }
  }

  function onSubmitAnswer() {
    if (!battleStarted || interactionLocked || !selectedCardUid || session.ended || session.pendingAttack) return;
    var val = document.getElementById("answer-input").value.trim();
    if (val === "") return;

    restoreMobileScroll();

    var uid  = selectedCardUid;
    var card = findInHand(uid);
    selectedCardUid = null;
    document.getElementById("answer-panel").classList.add("hidden");

    interactionLocked = true;

    // 火属性/闇属性エリア：playCard 呼び出し前に手札の残存カード UID を記録
    var prePlayUids = {};
    if (isFireArea() || isDarkArea()) {
      session.hand.forEach(function (c) {
        if (c.uid !== uid) prePlayUids[c.uid] = true;
      });
    }

    startBGMOnce();
    var result = Battle.playCard(session, uid, val);
    if (result.error) {
      interactionLocked = false;
      return;
    }

    // 通常カード使用後の補充カード演出を追跡
    usedCardUidMap = {};
    if (result.newCards && result.newCards.length > 0) {
      result.newCards.forEach(function (c) {
        usedCardUidMap[c.uid] = true;
      });
      setTimeout(function () { usedCardUidMap = {}; }, 600);
    }

    var isHolyHit   = result.correct && card && isHolyCard(card)   && result.logEntry.damage !== undefined;
    var isMeteorHit = result.correct && card && isMeteorCard(card) && result.logEntry.damage !== undefined;
    var isWin       = result.outcome === "win";
    showCardFeedback(result);

    if (result.correct && card) {
      if (isHolyHit) {
        flashScreen(card.kind, card.element);
        var holyBd = result.logEntry.damageBreakdown;
        setTimeout(function () {
          shakeEnemySprite();
          if (holyBd) {
            showDamagePop(holyBd.finalDamage, holyBd.critical, holyBd.weakness);
          }
          if (holyBd && holyBd.critical) {
            flashCritical();
          }
          if (holyBd && holyBd.zeroVoidPierced) {
            showEnemyZeroVoidBreakEffect(false);
          }
        }, 850);
      } else if (isMeteorHit) {
        flashScreen(card.kind, card.element);
        var meteorBd = result.logEntry.damageBreakdown;
        var meteorZeroVoidNullified = !!(meteorBd && meteorBd.zeroVoidNullified);
        setTimeout(function () {
          shakeEnemySprite();
          // ゼロ・ヴォイド無効化時は、メテオ本体の発動演出（既に再生済み）はそのままに、
          // 着弾結果だけ「0ダメージ」で統一する（会心表示・会心フラッシュは出さない）。
          if (meteorZeroVoidNullified) {
            showDamagePop(0, false, false);
          } else if (meteorBd) {
            showDamagePop(meteorBd.finalDamage, meteorBd.critical, meteorBd.weakness);
          }
          if (meteorBd && meteorBd.critical && !meteorZeroVoidNullified) {
            flashCritical();
          }
          if (meteorZeroVoidNullified) {
            showEnemyZeroVoidBreakEffect(true);
          }
        }, 1400);
      } else {
        playSE("correct");
        flashScreen(card.kind, card.element);
        if (result.logEntry.damage !== undefined) {
          // 撃退演出(playEnemyDefeatEffect)自体に震えを含むため、#enemy-spriteに二重にアニメーションを
          // 掛けないよう通常シェイクを省略する。最終勝利時（isWin）はこの後の撃退演出と、
          // 中間形態撃破時（result.phaseTransition）はhandleFinalBossPhaseTransition()内の
          // 撃退演出（形態切替の合図として流用）と競合するため、いずれも省略する。
          // 通常の非撃破ヒット（isWinでもphaseTransitionでもない）のときだけ実行する。
          if (!isWin && !result.phaseTransition) {
            setTimeout(shakeEnemySprite, 130);
          }
          var normalZeroVoidNullified = !!(result.logEntry.damageBreakdown && result.logEntry.damageBreakdown.zeroVoidNullified);
          if (result.logEntry.damageBreakdown) {
            var normalBd = result.logEntry.damageBreakdown;
            if (isMobile()) {
              // モバイルはスクロール復帰（最大500ms）より先にポップが出て
              // ENEMY HPバーの下に隠れないよう、復帰後まで表示を遅らせる。
              setTimeout(function () {
                // ゼロ・ヴォイド無効化時は「攻撃が0へ戻された」結果を優先し、会心/弱点表示を出さない
                // （内部のcritical/weaknessフラグ自体はdamageBreakdown/ログ上そのまま残す）。
                if (normalZeroVoidNullified) {
                  showDamagePop(0, false, false);
                  showEnemyZeroVoidBreakEffect(true);
                } else {
                  showDamagePop(normalBd.finalDamage, normalBd.critical, normalBd.weakness);
                }
              }, 550);
            } else {
              if (normalZeroVoidNullified) {
                showDamagePop(0, false, false);
                showEnemyZeroVoidBreakEffect(true);
              } else {
                showDamagePop(normalBd.finalDamage, normalBd.critical, normalBd.weakness);
              }
            }
          }
          if (normalZeroVoidNullified) {
            // ゼロ・ヴォイドで無効化された通常攻撃は、通常ヒットSE・会心SE・会心フラッシュを
            // 出さない。結果音はshowEnemyZeroVoidBreakEffect()内のnullify SEのみとする。
          } else {
            var isCritical = result.logEntry.damageBreakdown && result.logEntry.damageBreakdown.critical;
            var hitSe;
            if (isCritical) {
              hitSe = "criticalHit";
              flashCritical();
            } else {
              hitSe = card.kind === "mul" ? "special" : "hit";
            }
            setTimeout(function () { playSE(hitSe); }, 40);
          }
        } else if (result.logEntry.heal) {
          setTimeout(function () { playSE("heal"); }, 40);
          showPlayerHealEffect();
          if (result.logEntry.zeroVoidConsumed) {
            showEnemyZeroVoidBreakEffect(false);
          }
        }
      }
    } else if (!result.correct) {
      playSE("wrong");
      playPlayerDamageFeedback();
      if (result.logEntry.zeroVoidConsumed) {
        showEnemyZeroVoidBreakEffect(false);
      }
    }

    // ラスボス4フェーズ連戦：中間形態撃破（次フェーズへ切替）はここで分岐し、以降の
    // 炎上/闇侵食エイジング（旧フェーズの手札を前提にしたprePlayUidsが新フェーズには
    // 対応しないため）・render()・勝敗判定・敵行動をすべてスキップする。
    if (result.phaseTransition) {
      handleFinalBossPhaseTransition(result.phaseTransition, isHolyHit, isMeteorHit);
      return;
    }

    // 炎上/闇侵食エイジング（火属性/闇属性エリアのみ）
    if (isFireArea()) {
      ageBurnCards(prePlayUids);
    } else if (isDarkArea()) {
      ageDarkCorruptCards(prePlayUids);
    }

    enemyStateEffectsVisible = false;
    render(); // burnAge/darkCorruptAge が閾値ならそれぞれ burn05/dark05 オーバーレイが表示される

    if (result.enemyRegen) {
      renderEnemyHPValue(result.enemyRegen.beforeHp, session.enemyMaxHp);
    }

    if (session.ended || result.ended || session.enemyHp <= 0 || session.hp <= 0) {
      // 敗北/撤退：従来通りscheduleEnd()（暗転演出などのタイミング制御はscheduleEnd側に委ねる）
      var finishEnd = function () {
        interactionLocked = false;
        scheduleEnd();
      };
      // 勝利かつ撃退演出を挟む場合：撃退演出でenemy-defeatedクラスが外れて敵が一瞬通常表示に戻る前に
      // 結果画面へ進めるよう、scheduleEnd()の追加待機(1200ms)を挟まずdoEndBattle()へ直行する
      var finishEndDirect = function () {
        interactionLocked = false;
        doEndBattle();
      };
      // 敵撃退演出は勝利（敵HP0）時のみ。敗北/撤退では出さない
      var finishWithDefeatEffect = isWin
        ? function () { playEnemyDefeatEffect(finishEndDirect); }
        : finishEnd;
      if (isHolyHit) {
        // ホーリーとどめ：演出を最後まで表示 → (勝利なら)撃退演出 → 勝利処理へ
        playHolyUltimateEffect(finishWithDefeatEffect);
        return;
      }
      if (isMeteorHit) {
        // メテオとどめ：演出を最後まで表示 → (勝利なら)撃退演出 → 勝利処理へ
        playMeteorUltimateEffect(finishWithDefeatEffect);
        return;
      }
      if (isWin) {
        // 通常攻撃のとどめ：ダメージポップが見えてから撃退演出を始める
        // （モバイルはポップ自体がスクロール復帰待ちで550ms遅れて出るため、その分だけ多く待つ）
        setTimeout(function () { playEnemyDefeatEffect(finishEndDirect); }, isMobile() ? 700 : 300);
        return;
      }
      finishEnd();
      return;
    }

    if (result.enemyAction && session.pendingAttack &&
        (result.enemyAction.type === "counter" || result.enemyAction.type === "bossAttack")) {
      document.getElementById("enemy-attack-panel").classList.add("hidden");
      updateAnsweringClass();
    }

    var regenPresent = !!result.enemyRegen;

    // 敵行動タイミング処理（燃え尽き後も同じシーケンスを使う）
    function continueEnemyAction() {
      setTimeout(function () {
        if (regenPresent) {
          renderEnemyHPValue(result.enemyRegen.afterHp, session.enemyMaxHp);
          playSE("enemyRegen");
          showEnemyRegenEffect();
          showEnemyRegenMessage(result.enemyRegen);
        }
        setTimeout(function () {
          var doEnemyAction = function () {
            if (!result.enemyAction) {
              enemyStateEffectsVisible = true;
              renderEnemySprite();
              interactionLocked = false;
              renderHand();
              renderPlayerSection();
              return;
            }
            animateEnemyPreAction(function () {
              // ゼロ・ヴォイド：予告演出が終わるまでactive常設表示・操作再開を出さない特別扱い。
              // 通常の威嚇・力ため・隙あり・ボス攻撃の処理順（下側）には触れない。
              if (result.enemyAction.type === "zeroVoid") {
                showEnemyAction(result.enemyAction);
                showEnemyZeroVoidWarningEffect(function () {
                  enemyStateEffectsVisible = true;
                  renderEnemySprite();
                  interactionLocked = false;
                  renderHand();
                  renderPlayerSection();
                });
                return;
              }
              // ゼロ・クライシス：予告演出（迫るアニメーション）が終わるまで操作不能にする特別扱い。
              // カードデータ自体はbattle.js側で既に変化済み。回答パネルに古い式が残らないよう
              // selectedCardUidをここでも念のためクリアする。
              if (result.enemyAction.type === "zeroCrisis") {
                selectedCardUid = null;
                document.getElementById("answer-panel").classList.add("hidden");
                showEnemyAction(result.enemyAction);
                showEnemyZeroCrisisEffect(function () {
                  enemyStateEffectsVisible = true;
                  renderEnemySprite();
                  showZeroCrisisCardChangeEffect(result.enemyAction); // ロック中に1回目の描画（変化フラッシュ付き）
                  interactionLocked = false;
                  renderHand(); // ロック解除後、クリック可能な状態で再描画
                  renderPlayerSection();
                });
                return;
              }
              enemyStateEffectsVisible = true;
              showEnemyAction(result.enemyAction);
              playEnemyActionSE(result.enemyAction);
              renderEnemySprite();
              if (result.enemyAction.type === "intimidate") {
                showEnemyIntimidateEffect();
              }
              if (session.pendingAttack) {
                showEnemyAttackEffect(session.pendingAttack.powered);
                setTimeout(function () {
                  renderEnemyAttackPanel();
                  interactionLocked = false;
                  renderHand();
                  renderPlayerSection();
                }, 300);
              } else {
                interactionLocked = false;
                renderHand();
                renderPlayerSection();
              }
            });
          };
          advanceWaveCounterAndMaybeRefresh(doEnemyAction);
        }, regenPresent ? 600 : 0);
      }, regenPresent ? 800 : 1100);
    }

    // 燃え尽き/闇侵食処理（burn05/dark05 を 1100ms 表示後に除外・補充・弱化）
    // ホーリー/メテオ発動時は演出完了後に続行
    if (isHolyHit) {
      playHolyUltimateEffect(function () {
        processPendingCardTransformAndContinue(continueEnemyAction);
      });
    } else if (isMeteorHit) {
      playMeteorUltimateEffect(function () {
        processPendingCardTransformAndContinue(continueEnemyAction);
      });
    } else {
      processPendingCardTransformAndContinue(continueEnemyAction);
    }
  }

  function onSubmitAttack() {
    if (!battleStarted || !session.pendingAttack || session.ended || interactionLocked) return;
    var val = document.getElementById("attack-answer-input").value.trim();
    if (val === "") return;

    restoreMobileScroll();

    interactionLocked = true;

    startBGMOnce();
    clearTimeout(enemyMsgTimer);
    document.getElementById("enemy-action-msg").classList.add("fb-hidden");

    var result = Battle.resolveEnemyAttack(session, val);
    if (result.error) {
      interactionLocked = false;
      return;
    }

    showAttackFeedback(result);

    if (result.correct) {
      playSE("correct");
      setTimeout(function () { playSE("evade"); }, 120);
      flashScreen("add", null);
    } else {
      playSE("wrong");
      playPlayerDamageFeedback();
    }

    render();

    if (session.ended || result.ended || session.hp <= 0) {
      interactionLocked = false;
      scheduleEnd();
      return;
    }

    setTimeout(function () {
      interactionLocked = false;
      renderHand();
      renderPlayerSection();
    }, 800);
  }

  function onChangeHand() {
    if (!battleStarted || session.hp < 2 || session.pendingAttack || session.ended || interactionLocked) return;
    selectedCardUid = null;
    document.getElementById("answer-panel").classList.add("hidden");
    clearPersistentFeedback();

    interactionLocked = true;

    // 火属性エリア：手札に戻るカードの burnAge を破棄
    if (isFireArea()) {
      session.hand.forEach(function (c) { delete burnAgeMap[c.uid]; });
    } else if (isDarkArea()) {
      session.hand.forEach(function (c) { delete darkCorruptAgeMap[c.uid]; });
      corruptFinalFlashUidMap = {};
      darkWeakenedUidMap = {};
      darkVanishedFlashUidMap = {};
    }

    playSE("buttonDecide");
    startBGMOnce();
    var result = Battle.changeHand(session);

    // 火属性エリア：新しい手札は burnAge 0（手札交換直後は進めない）
    if (isFireArea()) {
      session.hand.forEach(function (c) { burnAgeMap[c.uid] = 0; });
    } else if (isDarkArea()) {
      // 1×1ホーリーは侵食対象外のため age を持たせない
      session.hand.forEach(function (c) { if (!isHolyCard(c)) darkCorruptAgeMap[c.uid] = 0; });
    }

    var changeHandFeedback = "手札を入れ替えた（ハート-1）";
    if (result.zeroVoidConsumed) {
      changeHandFeedback += "\n🌀 ゼロ・ヴォイドの力が消えた";
      showEnemyZeroVoidBreakEffect(false);
    }
    showInfoFeedback(changeHandFeedback);
    flashScreen("add", null);

    enemyStateEffectsVisible = false;
    render();

    if (result.enemyRegen) {
      renderEnemyHPValue(result.enemyRegen.beforeHp, session.enemyMaxHp);
    }

    if (session.ended) {
      interactionLocked = false;
      scheduleEnd();
      return;
    }

    if (result.enemyAction && session.pendingAttack &&
        (result.enemyAction.type === "counter" || result.enemyAction.type === "bossAttack")) {
      document.getElementById("enemy-attack-panel").classList.add("hidden");
      updateAnsweringClass();
    }

    // 手札チェンジで旧ゼロ・ヴォイドを解除した直後、敵が新たにゼロ・ヴォイドを選び直した場合は、
    // 旧break演出（700ms）と新warning演出が重ならないよう、敵行動開始までの待機を追加する。
    var zeroVoidReTriggered = !!(result.zeroVoidConsumed && result.enemyAction && result.enemyAction.type === "zeroVoid");
    var zeroVoidBreakGuardMs = zeroVoidReTriggered ? 700 : 0;

    var regenPresent = !!result.enemyRegen;
    setTimeout(function () {
      if (regenPresent) {
        renderEnemyHPValue(result.enemyRegen.afterHp, session.enemyMaxHp);
        playSE("enemyRegen");
        showEnemyRegenEffect();
        showEnemyRegenMessage(result.enemyRegen);
      }
      setTimeout(function () {
        var doEnemyAction = function () {
          if (!result.enemyAction) {
            enemyStateEffectsVisible = true;
            renderEnemySprite();
            interactionLocked = false;
            renderHand();
            renderPlayerSection();
            return;
          }
          animateEnemyPreAction(function () {
            // ゼロ・ヴォイド：予告演出が終わるまでactive常設表示・操作再開を出さない特別扱い。
            // 通常の威嚇・力ため・隙あり・ボス攻撃の処理順（下側）には触れない。
            if (result.enemyAction.type === "zeroVoid") {
              showEnemyAction(result.enemyAction);
              showEnemyZeroVoidWarningEffect(function () {
                enemyStateEffectsVisible = true;
                renderEnemySprite();
                interactionLocked = false;
                renderHand();
                renderPlayerSection();
              });
              return;
            }
            if (result.enemyAction.type === "zeroCrisis") {
              selectedCardUid = null;
              document.getElementById("answer-panel").classList.add("hidden");
              showEnemyAction(result.enemyAction);
              showEnemyZeroCrisisEffect(function () {
                enemyStateEffectsVisible = true;
                renderEnemySprite();
                showZeroCrisisCardChangeEffect(result.enemyAction);
                interactionLocked = false;
                renderHand();
                renderPlayerSection();
              });
              return;
            }
            enemyStateEffectsVisible = true;
            showEnemyAction(result.enemyAction);
            playEnemyActionSE(result.enemyAction);
            renderEnemySprite();
            if (result.enemyAction.type === "intimidate") {
              showEnemyIntimidateEffect();
            }
            if (session.pendingAttack) {
              showEnemyAttackEffect(session.pendingAttack.powered);
              setTimeout(function () {
                renderEnemyAttackPanel();
                interactionLocked = false;
                renderHand();
                renderPlayerSection();
              }, 300);
            } else {
              interactionLocked = false;
              renderHand();
              renderPlayerSection();
            }
          });
        };
        doEnemyAction();
      }, regenPresent ? 600 : 0);
    }, (regenPresent ? 800 : 1100) + zeroVoidBreakGuardMs);
  }

  function buildBattleUrl(areaId, stage) {
    return "battle.html?areaId=" + encodeURIComponent(areaId) + "&stage=" + encodeURIComponent(stage);
  }

  function buildStageUrl(areaId) {
    return "stage.html?areaId=" + encodeURIComponent(areaId);
  }

  function normalizeBattleUrl(areaId, stage, params) {
    var hasParams = !!(params.areaId && params.stage);
    var fileName = window.location.pathname.split("/").pop();
    var isBattleHtml = fileName === "battle.html";

    if (hasParams && isBattleHtml) return true;

    var newUrl = buildBattleUrl(areaId, stage);

    if (window.location && window.location.replace) {
      window.location.replace(newUrl);
      return false;
    }

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", newUrl);
    }
    return true;
  }

  function getNextStage(stage, areaDef) {
    if (areaDef && areaDef.id === "shikkoku") {
      // 低層4戦＋高層4戦を実装済み。stage8の次(最上階boss)は未実装のためnullを返す。
      if (stage === "stage1") return "stage2";
      if (stage === "stage2") return "stage3";
      if (stage === "stage3") return "stage4";
      if (stage === "stage4") return "stage5";
      if (stage === "stage5") return "stage6";
      if (stage === "stage6") return "stage7";
      if (stage === "stage7") return "stage8";
      return null;
    }
    if (stage === "normal1") return "normal2";
    if (stage === "normal2") return "normal3";
    if (stage === "normal3") return "boss";
    return null;
  }

  function onResultBack() {
    window.location.href = resultPrimaryUrl;
  }

  function onResultRetry() {
    window.location.href = resultSecondaryUrl;
  }

  function onResultStageSelect() {
    window.location.href = resultStageUrl;
  }

  // ============================================================
  // フィードバック表示
  // ============================================================

  // プレイヤーのカード使用結果を2段構造で表示する。
  // 1段目：計算結果（formula）、読み（reading）
  // 2段目：ゲーム補正（correction）またはミスメッセージ
  // 最終ダメージは敵スプライト付近の showDamagePop で別表示する。
  function showCardFeedback(result) {
    var correct  = result.correct;
    var logEntry = result.logEntry;

    var formulaEl    = document.getElementById("feedback-formula");
    var readEl       = document.getElementById("feedback-reading");
    var correctionEl = document.getElementById("feedback-correction");
    var hintEl       = document.getElementById("feedback-hint");

    correctionEl.textContent = "";
    hintEl.textContent       = "";

    var op = logEntry.kind === "mul" ? " × " : logEntry.kind === "add" ? " + " : " - ";

    if (correct) {
      formulaEl.textContent = "⭕ " + logEntry.a + op + logEntry.b + " = " + logEntry.answer;
      formulaEl.className   = "feedback-correct";
      readEl.textContent    = Yomi.getReading(logEntry) || "";
      readEl.className      = "";

      if (logEntry.damageBreakdown) {
        correctionEl.textContent = buildDamageCorrections(logEntry);
      } else if (logEntry.heal) {
        correctionEl.textContent = "ハート+" + logEntry.heal + "！";
        if (logEntry.zeroVoidConsumed) {
          correctionEl.textContent += "\n🌀 ゼロ・ヴォイドの力が消えた";
        }
      }

      showFeedbackArea(false);
    } else {
      formulaEl.textContent = "❌ " + logEntry.a + op + logEntry.b + " = " + (logEntry.answerInput || "？");
      formulaEl.className   = "feedback-wrong";
      var reading = Yomi.getReading(logEntry) || "";
      var correctLine = "正解：" + logEntry.answer + "（" + logEntry.a + op + logEntry.b + " = " + logEntry.answer;
      if (reading) correctLine += "　" + reading;
      correctLine += "）";
      readEl.textContent    = correctLine;
      readEl.className      = "feedback-correct-answer";
      correctionEl.textContent = logEntry.zeroVoidConsumed ? "🌀 ゼロ・ヴォイドの力が消えた" : "";
      hintEl.textContent    = "残念、ハートが減った！";
      showFeedbackArea(true);
    }
  }

  function showAttackFeedback(result) {
    var logEntry     = result.logEntry;
    var formulaEl    = document.getElementById("feedback-formula");
    var readEl       = document.getElementById("feedback-reading");
    var correctionEl = document.getElementById("feedback-correction");
    document.getElementById("feedback-hint").textContent = "";

    var op      = logEntry.kind === "mul" ? " × " : logEntry.kind === "add" ? " + " : " - ";
    var reading = Yomi.getReading(logEntry) || "";

    if (result.correct) {
      formulaEl.textContent    = "⭕ " + logEntry.a + op + logEntry.b + " = " + logEntry.answer;
      formulaEl.className      = "feedback-correct";
      readEl.textContent       = reading;
      readEl.className         = "";
      correctionEl.textContent = "かいひ成功！";
    } else {
      formulaEl.textContent = "❌ " + logEntry.a + op + logEntry.b + " = " + (logEntry.answerInput || "？");
      formulaEl.className   = "feedback-wrong";
      var correctLine = "正解：" + logEntry.answer + "（" + logEntry.a + op + logEntry.b + " = " + logEntry.answer;
      if (reading) correctLine += "　" + reading;
      correctLine += "）";
      readEl.textContent    = correctLine;
      readEl.className      = "feedback-correct-answer";
      var dmg = logEntry.hpDamage || 1;
      var msg;
      if (logEntry.isBossAttack && logEntry.powered) {
        msg = "力をこめた強力なこうげきをうけた！（ハート-" + dmg + "）";
      } else if (logEntry.isBossAttack) {
        msg = "強力なこうげきをうけた！（ハート-" + dmg + "）";
      } else if (logEntry.isCounter && logEntry.powered) {
        msg = "力をこめたこうげきをうけた！（ハート-" + dmg + "）";
      } else {
        msg = "ダメージをうけた！（ハート-" + dmg + "）";
      }
      correctionEl.textContent = msg;
    }
    showFeedbackArea(false);
  }

  function showInfoFeedback(text) {
    var formulaEl = document.getElementById("feedback-formula");
    var readEl = document.getElementById("feedback-reading");
    readEl.textContent = "";
    readEl.className   = "";
    document.getElementById("feedback-correction").textContent = "";
    document.getElementById("feedback-hint").textContent = "";
    formulaEl.textContent = text;
    formulaEl.className   = "";
    showFeedbackArea(false);
  }

  function resetToPlaceholder() {
    feedbackPersistent = false;
    var f = document.getElementById("feedback-formula");
    f.textContent = "カードをえらんでね";
    f.className = "feedback-placeholder";
    var readEl = document.getElementById("feedback-reading");
    readEl.textContent = "";
    readEl.className   = "";
    document.getElementById("feedback-correction").textContent = buildComboStatusText(session.combo);
    document.getElementById("feedback-hint").textContent = "";
  }

  function showFeedbackArea(persistent) {
    clearTimeout(feedbackTimer);
    feedbackPersistent = !!persistent;
    if (!persistent) {
      feedbackTimer = setTimeout(function () {
        resetToPlaceholder();
      }, 4500);
    }
  }

  function clearPersistentFeedback() {
    if (feedbackPersistent) {
      clearTimeout(feedbackTimer);
      resetToPlaceholder();
    }
  }

  function playEnemyActionSE(action) {
    if (!action) return;
    if (action.type === "guard")                                         playSE("enemyGuard");
    else if (action.type === "powerUp")                                  playSE("enemyPowerUp");
    else if (action.type === "counter" || action.type === "bossAttack") playSE("enemyAttack");
    else if (action.type === "intimidate") {
      playSE(session.stage === "boss" ? "enemyIntimidateBoss" : "enemyIntimidateNormal");
    }
  }

  // 敵行動メッセージ
  function showEnemyAction(action) {
    var msgEl = document.getElementById("enemy-action-msg");
    var textEl = document.getElementById("enemy-action-text");

    var label = action.label;
    if (action.type === "none") {
      var pool = session.stage === "boss" ? IDLE_REACTIONS_BOSS : IDLE_REACTIONS_NORMAL;
      label = pool[Math.floor(Math.random() * pool.length)];
    } else if (action.type === "intimidate") {
      var enemyName = getEnemyName(session.areaDef, session.stage);
      label = enemyName + "が威嚇してきた！ 手札" + action.lockedCount + "枚が使えなくなった！";
    } else if (action.type === "zeroVoid") {
      var zeroVoidEnemyName = getEnemyName(session.areaDef, session.stage);
      label = zeroVoidEnemyName + "が「ゼロ・ヴォイド」を放った！\n次のこうげきが0に戻される！";
    } else if (action.type === "zeroCrisis") {
      var zeroCrisisEnemyName = getEnemyName(session.areaDef, session.stage);
      label = zeroCrisisEnemyName + "が「ゼロ・クライシス」を放った！\n九九カードの力が崩される！";
    }

    if (!label) {
      msgEl.classList.add("fb-hidden");
      return;
    }

    textEl.textContent = label;
    msgEl.className = "enemy-action-" + action.type;
    clearTimeout(enemyMsgTimer);

    // counter/bossAttack は攻撃パネルが出るので自動消去しない
    if (action.type === "counter" || action.type === "bossAttack") return;

    var duration = action.type === "none" ? 3500 : 5000;
    enemyMsgTimer = setTimeout(function () {
      msgEl.classList.add("fb-hidden");
    }, duration);
  }

  // ============================================================
  // ダメージ補正テキスト（計算結果とは別段に表示）
  // ============================================================

  function buildDamageCorrections(logEntry) {
    if (!logEntry.damageBreakdown) return "";
    var bd = logEntry.damageBreakdown;
    var base = bd.finalDamage + "ダメージ！";
    var parts = [];
    if (bd.addAdvancedReduced) {
      parts.push("上級敵は-50%");
    }
    if (bd.weakness && bd.weaknessBonusAmount > 0) {
      parts.push("弱点+" + bd.weaknessBonusAmount);
    }
    if (bd.lowDanReduced) {
      parts.push("低い段-50%");
    }
    if (bd.criticalBonusAmount > 0) {
      parts.push((bd.holy ? "ホーリー会心+" : "会心+") + bd.criticalBonusAmount);
    }
    if (bd.holy && bd.holyBonusAmount > 0) {
      parts.push("ホーリー属性+" + bd.holyBonusAmount);
    }
    if (bd.comboBonusAmount > 0) {
      parts.push("コンボ+" + bd.comboBonusAmount);
    }
    if (bd.openingBonusAmount > 0) {
      parts.push("隙あり+" + bd.openingBonusAmount);
    }
    if (bd.guardReductionAmount > 0) {
      parts.push("ガード-" + bd.guardReductionAmount);
    }
    if (bd.meteor && bd.ignoreGuard) {
      parts.push("メテオ：ガード貫通");
    }
    if (bd.zeroVoidNullified) {
      parts.push("🌀ゼロ・ヴォイドに吸い込まれた！");
    } else if (bd.zeroVoidPierced) {
      parts.push("🌀ゼロ・ヴォイドを貫通した！");
    }
    if (bd.abyssWallReduced && bd.abyssWallReductionAmount > 0) {
      parts.push("アビスウォール-" + bd.abyssWallReductionAmount);
    }
    if (bd.abyssWallJustBroken) {
      parts.push("🧱アビスウォールが崩れた！");
    } else if (bd.abyssWallNewDan) {
      parts.push("🧱" + bd.abyssWallDan + "の段が壁にヒビを入れた！");
    } else if (bd.abyssWallReduced) {
      parts.push("🧱同じ段では壁の破壊は進まない！");
    }
    if (parts.length === 0) return base;
    return base + "（" + parts.join(" / ") + "）";
  }

  // ============================================================
  // バトル終了
  // ============================================================

  function scheduleEnd() {
    if (session && (session.outcome === "lose" || session.outcome === "retreat")) {
      setTimeout(function () {
        playDefeatTransition(doEndBattle);
      }, 650);
      return;
    }
    setTimeout(doEndBattle, 1200);
  }

  function doEndBattle() {
    if (finalized) return;
    finalized = true;
    var summary = Battle.finalizeBattle(session);
    showResult(summary);
  }

  function buildResultDetail(summary) {
    var stage   = summary.stage || session.stage;
    var outcome = summary.outcome;
    var areaId  = session.areaDef.id;
    var areaName = session.areaDef.name;

    var stageLabel, nextHint;
    if (areaId === "shikkoku") {
      // 低層4戦＋高層4戦を実装済み。「通常戦N/3」形式ではなく要件定義書セクション70の「第N戦」表記に合わせる。
      var shikkokuNumMap = { stage1: 1, stage2: 2, stage3: 3, stage4: 4, stage5: 5, stage6: 6, stage7: 7, stage8: 8 };
      var shikkokuNum = shikkokuNumMap[stage] || 1;
      var isShikkokuHigh = SHIKKOKU_HIGH_STAGES[stage];
      var shikkokuTierNum = isShikkokuHigh ? shikkokuNum - 4 : shikkokuNum;
      var shikkokuTierLabel = isShikkokuHigh ? "高層" : "低層";
      if (outcome === "win") {
        stageLabel = "第" + shikkokuNum + "戦 クリア（" + shikkokuTierLabel + " " + shikkokuTierNum + " / 4）";
      } else {
        stageLabel = "第" + shikkokuNum + "戦 で撤退";
      }
    } else if (stage === "boss") {
      stageLabel = outcome === "win" ? "ぬし戦 クリア！" : "ぬし戦で敗北";
    } else {
      var stageNum = { normal1: 1, normal2: 2, normal3: 3 }[stage] || 1;
      if (outcome === "win") {
        stageLabel = "通常戦 " + stageNum + " / 3 クリア";
        if (stageNum === 3) nextHint = "次はぬし戦！";
      } else {
        stageLabel = "通常戦 " + stageNum + " / 3 で撤退";
      }
    }

    var heartsStr = "";
    for (var i = 0; i < session.maxHp; i++) {
      heartsStr += i < summary.finalHp ? "❤️" : "🖤";
    }

    var parts = [
      "<div class='result-area-name'>" + areaName + "</div>",
      "<div class='result-stage-label'>" + stageLabel + "</div>"
    ];
    if (nextHint) parts.push("<div class='result-next-hint'>" + nextHint + "</div>");
    parts.push("<div class='result-hearts-label'>残りハート</div>");
    parts.push("<div class='result-hearts'>" + heartsStr + "</div>");
    return parts.join("");
  }

  function showResult(summary) {
    var OUTCOME = { win: "🎉 しょうり！", lose: "💔 やられた…", retreat: "🏃 撤退…" };

    document.getElementById("result-title").textContent =
      OUTCOME[summary.outcome] || summary.outcome;
    document.getElementById("result-detail").innerHTML = buildResultDetail(summary);

    var mistakesEl = document.getElementById("result-mistakes");
    mistakesEl.innerHTML = "";

    if (summary.mistakes && summary.mistakes.length > 0) {
      var heading = document.createElement("div");
      heading.className = "mistakes-heading";
      heading.textContent = "まちがえた問題（" + summary.mistakes.length + "問）";
      mistakesEl.appendChild(heading);
      summary.mistakes.forEach(function (m) {
        var row = document.createElement("div");
        row.className = "mistake-row";
        row.textContent = Yomi.formatExpression(m) + "　" + Yomi.getReading(m);
        mistakesEl.appendChild(row);
      });
    } else {
      var nice = document.createElement("div");
      nice.className = "no-mistakes";
      nice.textContent = "ミスなし！ 完璧！";
      mistakesEl.appendChild(nice);
    }

    var areaId    = session.areaDef.id;
    var stage     = summary.stage || session.stage;
    var outcome   = summary.outcome;
    var currentUrl    = buildBattleUrl(areaId, stage);
    var stageSelectUrl = buildStageUrl(areaId);
    var primaryBtn = document.getElementById("result-back-btn");
    var retryBtn   = document.getElementById("result-retry-btn");
    var stageBtn   = document.getElementById("result-stage-btn");

    resultStageUrl = stageSelectUrl;
    stageBtn.textContent = "ステージ選択へ";
    stageBtn.classList.remove("hidden");

    if (stage === "boss") {
      primaryBtn.textContent = "もう一回";
      resultPrimaryUrl = currentUrl;
      retryBtn.classList.add("hidden");
    } else if (outcome === "win") {
      var nextStage = getNextStage(stage, session.areaDef);
      if (nextStage) {
        primaryBtn.textContent = (stage === "normal3") ? "ぬし戦へ" : "つぎへ";
        resultPrimaryUrl   = buildBattleUrl(areaId, nextStage);
        retryBtn.textContent = "もう一回";
        resultSecondaryUrl = currentUrl;
        retryBtn.classList.remove("hidden");
      } else {
        // 次ステージ未実装（漆黒の塔 低層クリア等）: 壊れたURLへ遷移させず「もう一回」扱いにする
        primaryBtn.textContent = "もう一回";
        resultPrimaryUrl = currentUrl;
        retryBtn.classList.add("hidden");
      }
    } else {
      primaryBtn.textContent = "もう一回";
      resultPrimaryUrl   = currentUrl;
      retryBtn.classList.add("hidden");
    }

    console.debug("[BATTLE RESULT]", {
      summaryStage: summary.stage,
      sessionStage: session.stage,
      stage: stage,
      outcome: outcome,
      nextStage: getNextStage(stage, session.areaDef),
      resultPrimaryUrl: resultPrimaryUrl,
      resultSecondaryUrl: resultSecondaryUrl
    });

    if (summary.outcome === "win") {
      fadeOutBGM(400, function () { playSE("victory"); });
    } else {
      fadeOutBGM(400, function () { playSE("defeat"); });
    }

    document.getElementById("result-overlay").classList.remove("hidden");

    if (summary.outcome !== "win") {
      clearDefeatTransition();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
