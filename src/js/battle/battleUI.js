(function () {
  "use strict";

  var Battle = window.Kuku99.Battle;
  var Areas = window.Kuku99.Areas;
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
  var enemyStateEffectsVisible = false;
  var bgmStarted = false;
  var bgmAudio = null;

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
    criticalHit:   { src: "assets/audio/se/se_critical_hit_v01.mp3",        volume: 0.70 }
  };

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

  var BGM = {
    normal: { src: "assets/audio/bgm/bgm_battle_normal_v01.mp3", volume: 0.24 },
    boss:   { src: "assets/audio/bgm/bgm_battle_boss_v01.mp3",   volume: 0.24 }
  };

  function getBgmKeyForStage(stage) {
    return stage === "boss" ? "boss" : "normal";
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
    var key = getBgmKeyForStage(session.stage);
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
          fadeInBGM(def.volume, 800);
        }).catch(function () {
          bgmAudio = null;
        });
      } else {
        bgmStarted = true;
        fadeInBGM(def.volume, 800);
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
  // 定数
  // ============================================================

  var ELEMENT_ICONS = { fire: "🔥", water: "💧", grass: "🌱", light: "⭐", none: "✨" };

  function isMobile() {
    return window.innerWidth <= 640 || ('ontouchstart' in window);
  }

  function restoreMobileScroll() {
    if (!isMobile()) return;
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    setTimeout(function () {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 50);
    setTimeout(function () {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 250);
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

  var STAGE_IMAGE_PATHS = {
    normal1: "assets/images/enemies/slime/enemy_normal1_slime_none_v01.png",
    normal2: "assets/images/enemies/bat/enemy_normal2_bat_none_v01.png",
    normal3: "assets/images/enemies/golem/enemy_normal3_golem_none_v01.png",
    boss:    "assets/images/enemies/dragon/enemy_boss_dragon_none_v01.png"
  };
  var STAGE_FALLBACK_SPRITES = { normal1: "👾", normal2: "🦇", normal3: "🪨", boss: "🐉" };
  var STAGE_NAMES   = { normal1: "スライム", normal2: "バット", normal3: "ゴーレム", boss: "のぬし" };
  var STAGE_LABELS  = { normal1: "通常戦1", normal2: "通常戦2", normal3: "通常戦3", boss: "ぬし戦" };

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

  var ELEMENT_FLASH_CLASS = {
    fire:  "flash-fire",
    water: "flash-water",
    grass: "flash-grass",
    light: "flash-light",
    none:  "flash-white"
  };

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

    applyBattleBg(areaId, stage);

    document.getElementById("submit-answer-btn").addEventListener("click", onSubmitAnswer);
    document.getElementById("cancel-btn").addEventListener("click", onCancelCard);
    document.getElementById("change-hand-btn").addEventListener("click", onChangeHand);
    document.getElementById("submit-attack-btn").addEventListener("click", onSubmitAttack);
    document.getElementById("result-back-btn").addEventListener("click", onResultBack);
    document.getElementById("result-retry-btn").addEventListener("click", onResultRetry);

    document.getElementById("answer-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") onSubmitAnswer();
    });
    document.getElementById("attack-answer-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") onSubmitAttack();
    });

    render();
    resetToPlaceholder();
  }

  // ============================================================
  // 背景
  // ============================================================

  function applyBattleBg(areaId, stage) {
    var el = document.getElementById("battle-screen");
    el.classList.remove("battle-bg-hajimari", "battle-bg-hajimari-boss");
    if (areaId === "hajimari" && stage === "boss") {
      el.classList.add("battle-bg-hajimari-boss");
    } else if (areaId === "hajimari") {
      el.classList.add("battle-bg-hajimari");
    }
  }

  // ============================================================
  // 描画
  // ============================================================

  function render() {
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

  function renderEnemySprite() {
    var stage = session.stage;
    var section = document.getElementById("enemy-sprite-section");
    section.classList.remove("enemy-stage-normal1", "enemy-stage-normal2", "enemy-stage-normal3", "enemy-stage-boss");
    section.classList.add("enemy-stage-" + stage);
    var spriteEl = document.getElementById("enemy-sprite");
    var imgPath = STAGE_IMAGE_PATHS[stage];
    if (imgPath) {
      var img = document.createElement("img");
      img.className = "enemy-image" + (stage === "boss" ? " enemy-boss" : "");
      img.src = imgPath;
      img.alt = STAGE_NAMES[stage] || "モンスター";
      img.onerror = (function (fallback) {
        return function () { spriteEl.textContent = fallback; };
      })(STAGE_FALLBACK_SPRITES[stage] || "👾");
      spriteEl.innerHTML = "";
      spriteEl.appendChild(img);
    } else {
      spriteEl.textContent = STAGE_FALLBACK_SPRITES[stage] || "👾";
    }

    var nameEl = document.getElementById("enemy-name");
    var suffix = STAGE_NAMES[stage] || "モンスター";
    nameEl.textContent = (stage === "boss")
      ? session.areaDef.name + "のぬし"
      : suffix;

    var badgesEl = document.getElementById("enemy-badges");
    var badges = [];
    if (session.enemyState.guard)   badges.push("🛡 ガード");
    if (session.enemyState.powerUp) badges.push("🔥 力ため");
    if (session.enemyState.opening) badges.push("✨ 隙あり");
    badgesEl.textContent = badges.join("  ");
    badgesEl.className = badges.length > 0 ? "badges-visible" : "";

    renderEnemyEffects();
  }

  function renderEnemyEffects() {
    var backEl    = document.getElementById("enemy-effect-back");
    var frontEl   = document.getElementById("enemy-effect-front");
    var openingEl = document.getElementById("enemy-opening-effect");

    if (enemyStateEffectsVisible && session.enemyState.powerUp) {
      backEl.className = "enemy-state-effect effect-power-up";
      backEl.src = "assets/images/effects/effect_power_up_aura_v01.png";
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

    if (openingEl) {
      if (enemyStateEffectsVisible && session.enemyState.opening) {
        openingEl.src = "assets/images/effects/effect_opening_marker_v01.png";
        openingEl.classList.remove("hidden");
      } else {
        openingEl.classList.add("hidden");
        openingEl.removeAttribute("src");
      }
    }
  }

  function renderEnemyAttackPanel() {
    var panel = document.getElementById("enemy-attack-panel");
    if (session.pendingAttack) {
      var att = session.pendingAttack;
      var q   = att.question;

      var labelText, hpWarning;
      if (att.kind === "counter") {
        if (att.powered) {
          labelText = "⚡ 力をこめた反撃！";
          hpWarning = "ミスするとハート-2";
        } else {
          labelText = "⚡ 敵が反撃してきた！";
          hpWarning = "ミスするとハート-1";
        }
      } else {
        if (att.powered) {
          labelText = "💥 力をこめた強力なこうげき！";
          hpWarning = "ミスするとハート-3";
        } else {
          labelText = "💥 ボスの強力なこうげき！";
          hpWarning = "ミスするとハート-2";
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
    var locked = !!session.pendingAttack || session.ended || interactionLocked;
    var hasOpening = session.enemyState.opening;

    session.hand.forEach(function (card) {
      var div = document.createElement("div");
      var classes = ["card", "card-" + card.kind];

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

      if (card.uid === selectedCardUid) classes.push("card-selected");
      if (locked) classes.push("card-disabled");

      var isTargetMul = hasOpening && card.kind === "mul" && card.dan === session.areaDef.dan;
      if (isTargetMul && !locked) classes.push("card-opening-highlight");

      div.className = classes.join(" ");

      var badgeDiv = document.createElement("div");
      badgeDiv.className = "card-badge";
      badgeDiv.textContent = cardBadgeText(card);
      div.appendChild(badgeDiv);

      var questionDiv = document.createElement("div");
      questionDiv.className = "card-formula";
      questionDiv.textContent = cardFormula(card);
      div.appendChild(questionDiv);

      if (!locked) {
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
      session.hp < 2 || !!session.pendingAttack || session.ended || interactionLocked;

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
      var icon = ELEMENT_ICONS[card.element] || "✨";
      return icon + " 必殺";
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
    if (card.kind === "mul" && (card.a === 1 || card.b === 1)) {
      correctionParts.push("1が入ったかけ算は会心率UP！");
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

  function shakeEnemySprite() {
    var el = document.getElementById("enemy-sprite");
    el.classList.remove("enemy-shake");
    void el.offsetWidth;
    el.classList.add("enemy-shake");
    setTimeout(function () { el.classList.remove("enemy-shake"); }, 550);
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
    el.classList.remove("heal-animate");
    void el.offsetWidth;
    el.classList.add("heal-animate");
    setTimeout(function () { el.classList.remove("heal-animate"); }, 750);
  }

  function showEnemyAttackEffect(powered) {
    var el = document.getElementById("enemy-attack-effect");
    if (!el) return;
    el.src = powered
      ? "assets/images/effects/effect_enemy_attack_strong_v01.png"
      : "assets/images/effects/effect_enemy_attack_normal_v01.png";
    el.classList.remove("attack-normal", "attack-strong", "attack-animate");
    el.classList.add(powered ? "attack-strong" : "attack-normal");
    void el.offsetWidth;
    el.classList.add("attack-animate");
    setTimeout(function () {
      el.classList.remove("attack-normal", "attack-strong", "attack-animate");
    }, 700);
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

  function animateEnemyPreAction(callback) {
    var el = document.getElementById("enemy-sprite");
    el.classList.remove("enemy-preaction");
    void el.offsetWidth;
    el.classList.add("enemy-preaction");
    setTimeout(function () {
      el.classList.remove("enemy-preaction");
      if (callback) callback();
    }, 550);
  }

  // 最終ダメージを敵スプライト付近にポップ表示する。
  function showDamagePop(damage, critical) {
    var el = document.getElementById("enemy-damage-pop");
    el.textContent = (critical ? "会心！" : "") + damage + "ダメージ！";
    el.classList.remove("pop-animate", "damage-critical");
    if (critical) el.classList.add("damage-critical");
    void el.offsetWidth;
    el.classList.add("pop-animate");
    setTimeout(function () {
      el.classList.remove("pop-animate", "damage-critical");
    }, 2000);
  }

  // ============================================================
  // インタラクション
  // ============================================================

  function onSelectCard(uid) {
    if (session.ended || session.pendingAttack || interactionLocked) return;
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

  function onSubmitAnswer() {
    if (interactionLocked || !selectedCardUid || session.ended || session.pendingAttack) return;
    var val = document.getElementById("answer-input").value.trim();
    if (val === "") return;

    restoreMobileScroll();

    var uid  = selectedCardUid;
    var card = findInHand(uid);
    selectedCardUid = null;
    document.getElementById("answer-panel").classList.add("hidden");

    interactionLocked = true;

    startBGMOnce();
    var result = Battle.playCard(session, uid, val);
    if (result.error) {
      interactionLocked = false;
      return;
    }

    showCardFeedback(result);

    if (result.correct && card) {
      playSE("correct");
      flashScreen(card.kind, card.element);
      if (result.logEntry.damage !== undefined) {
        setTimeout(shakeEnemySprite, 130);
        if (result.logEntry.damageBreakdown) {
          showDamagePop(result.logEntry.damageBreakdown.finalDamage, result.logEntry.damageBreakdown.critical);
        }
        var isCritical = result.logEntry.damageBreakdown && result.logEntry.damageBreakdown.critical;
        var hitSe;
        if (isCritical) {
          hitSe = "criticalHit";
          flashCritical();
        } else {
          hitSe = card.kind === "mul" ? "special" : "hit";
        }
        setTimeout(function () { playSE(hitSe); }, 40);
      } else if (result.logEntry.heal) {
        setTimeout(function () { playSE("heal"); }, 40);
        showPlayerHealEffect();
      }
    } else if (!result.correct) {
      playSE("wrong");
      playPlayerDamageFeedback();
    }

    enemyStateEffectsVisible = false;
    render();

    if (session.ended || result.ended || session.enemyHp <= 0 || session.hp <= 0) {
      interactionLocked = false;
      scheduleEnd();
      return;
    }

    if (result.enemyAction && session.pendingAttack &&
        (result.enemyAction.type === "counter" || result.enemyAction.type === "bossAttack")) {
      document.getElementById("enemy-attack-panel").classList.add("hidden");
      updateAnsweringClass();
    }

    setTimeout(function () {
      if (!result.enemyAction) {
        enemyStateEffectsVisible = true;
        renderEnemySprite();
        interactionLocked = false;
        renderHand();
        renderPlayerSection();
        return;
      }
      animateEnemyPreAction(function () {
        enemyStateEffectsVisible = true;
        showEnemyAction(result.enemyAction);
        playEnemyActionSE(result.enemyAction);
        renderEnemySprite();
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
    }, 1100);
  }

  function onSubmitAttack() {
    if (!session.pendingAttack || session.ended || interactionLocked) return;
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
    if (session.hp < 2 || session.pendingAttack || session.ended || interactionLocked) return;
    selectedCardUid = null;
    document.getElementById("answer-panel").classList.add("hidden");
    clearPersistentFeedback();

    interactionLocked = true;

    playSE("buttonDecide");
    startBGMOnce();
    var result = Battle.changeHand(session);
    showInfoFeedback("手札を入れ替えた（ハート-1）");
    flashScreen("add", null);

    enemyStateEffectsVisible = false;
    render();

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

    setTimeout(function () {
      if (!result.enemyAction) {
        enemyStateEffectsVisible = true;
        renderEnemySprite();
        interactionLocked = false;
        renderHand();
        renderPlayerSection();
        return;
      }
      animateEnemyPreAction(function () {
        enemyStateEffectsVisible = true;
        showEnemyAction(result.enemyAction);
        playEnemyActionSE(result.enemyAction);
        renderEnemySprite();
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
    }, 1100);
  }

  function buildBattleUrl(areaId, stage) {
    return "battle.html?areaId=" + encodeURIComponent(areaId) + "&stage=" + encodeURIComponent(stage);
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

  function getNextStage(stage) {
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
      correctionEl.textContent = "";
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
  }

  // 敵行動メッセージ
  function showEnemyAction(action) {
    var msgEl = document.getElementById("enemy-action-msg");
    var textEl = document.getElementById("enemy-action-text");

    var label = action.label;
    if (action.type === "none") {
      var pool = session.stage === "boss" ? IDLE_REACTIONS_BOSS : IDLE_REACTIONS_NORMAL;
      label = pool[Math.floor(Math.random() * pool.length)];
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
    if (bd.criticalBonusAmount > 0) {
      parts.push("会心+" + bd.criticalBonusAmount);
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
    if (parts.length === 0) return base;
    return base + "（" + parts.join(" / ") + "）";
  }

  // ============================================================
  // バトル終了
  // ============================================================

  function scheduleEnd() {
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
    var areaName = session.areaDef.name;

    var stageLabel, nextHint;
    if (stage === "boss") {
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
    var primaryBtn = document.getElementById("result-back-btn");
    var retryBtn   = document.getElementById("result-retry-btn");

    if (stage === "boss") {
      primaryBtn.textContent = "もどる";
      resultPrimaryUrl = "battle.html";
      retryBtn.classList.add("hidden");
    } else {
      var currentUrl = buildBattleUrl(areaId, stage);
      if (outcome === "win") {
        var nextStage = getNextStage(stage);
        if (!nextStage) {
          console.warn("[BATTLE RESULT] nextStage missing", { stage: stage, summary: summary });
        }
        primaryBtn.textContent = (stage === "normal3") ? "ぬし戦へ" : "つぎへ";
        resultPrimaryUrl   = buildBattleUrl(areaId, nextStage);
        retryBtn.textContent = "もう一回";
        resultSecondaryUrl = currentUrl;
        retryBtn.classList.remove("hidden");
      } else {
        primaryBtn.textContent = "もう一回";
        resultPrimaryUrl   = currentUrl;
        retryBtn.textContent = "もどる";
        resultSecondaryUrl = "battle.html";
        retryBtn.classList.remove("hidden");
      }
    }

    console.debug("[BATTLE RESULT]", {
      summaryStage: summary.stage,
      sessionStage: session.stage,
      stage: stage,
      outcome: outcome,
      nextStage: getNextStage(stage),
      resultPrimaryUrl: resultPrimaryUrl,
      resultSecondaryUrl: resultSecondaryUrl
    });

    if (summary.outcome === "win") {
      fadeOutBGM(400, function () { playSE("victory"); });
    } else {
      stopBGM();
    }

    document.getElementById("result-overlay").classList.remove("hidden");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
