/* main.js — экраны, игровой цикл, звёзды, наклейки, статистика, «Для родителей» */
(() => {
  const app = document.getElementById('app');
  const fx = document.getElementById('fx-layer');
  const T = (k) => I18n.t(k);
  const L = (o) => I18n.L(o);

  /* ---------- Хранилище ---------- */
  const store = {
    get stars() { return parseInt(localStorage.getItem('baby_stars') || '0', 10) || 0; },
    set stars(v) { localStorage.setItem('baby_stars', String(v)); },
  };
  const stickerStore = {
    get all() {
      try { return JSON.parse(localStorage.getItem('baby_stickers') || '[]'); }
      catch (e) { return []; }
    },
    set all(v) { localStorage.setItem('baby_stickers', JSON.stringify(v)); },
  };
  const statsStore = {
    get all() {
      try {
        const s = JSON.parse(localStorage.getItem('baby_stats') || '{}');
        return { rounds: s.rounds || 0, days: s.days || {}, byGame: s.byGame || {} };
      } catch (e) { return { rounds: 0, days: {}, byGame: {} }; }
    },
    set all(v) { localStorage.setItem('baby_stats', JSON.stringify(v)); },
  };
  const settings = {
    get breakMin() {
      const v = localStorage.getItem('baby_break_min');
      return v === null ? 15 : (parseInt(v, 10) || 0);
    },
    set breakMin(v) { localStorage.setItem('baby_break_min', String(v)); },
  };

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const PRAISE = [
    { key: 'praise-molodets', text: { ru: 'Молодец!', en: 'Good job!' } },
    { key: 'praise-umnica', text: { ru: 'Умница!', en: 'Well done!' } },
    { key: 'praise-pravilno', text: { ru: 'Правильно!', en: "That's right!" } },
    { key: 'praise-zdorovo', text: { ru: 'Здорово!', en: 'Great!' } },
    { key: 'praise-super', text: { ru: 'Супер!', en: 'Super!' } },
    { key: 'praise-geroy', text: { ru: 'Ты герой!', en: "You're a hero!" } },
  ];
  const CONFETTI_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

  let sessionStars = 0;
  let currentGame = null;
  let currentRound = null;
  let roundTimer = null;
  let streak = 0; // правильные ответы с первой попытки (сложность)

  const h = (html) => {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

  /* Озвучка: записанная фраза (phrases/<lang>/<key>.mp3) либо TTS-фолбэк */
  function say(key, text, opts = {}) {
    if (Sfx.isMuted()) return;
    if (Sfx.phrase(key, opts)) return;
    if (!key) { // динамическая фраза (например, «Найди букву А!») — только TTS
      if (text) Sfx.speakL(text, opts);
      return;
    }
    const ep = Sfx.voiceEpoch();
    Sfx.loadPhrase(I18n.get(), key).then((ok) => {
      if (Sfx.voiceEpoch() !== ep) return; // нажали во время загрузки — больше не озвучиваем
      if (ok) Sfx.phrase(key, opts);
      else if (text) Sfx.speakL(text, opts);
    });
  }
  const sayPraise = (delay = 1800) => {
    const p = praise();
    say(p.key, L(p.text), { delay });
  };

  /* ================= МЕНЮ ================= */
  function renderMenu() {
    clearTimeout(roundTimer);
    Sfx.stop();
    currentGame = null;
    currentRound = null;
    sessionStars = 0;
    streak = 0;
    resetBreakTimer();

    app.innerHTML = `
      <div class="menu">
        <button class="eng-btn" id="eng-btn" aria-label="Инженерное меню">🛠</button>
        <div class="menu-title">${T('app_title')}</div>
        <div class="menu-sub">${T('app_sub')}</div>
        <div class="menu-grid">
          ${Object.values(Games.all).map((g) => `
            <button class="game-card" data-game="${g.id}" style="background:${g.bg}">
              <span class="icon">${g.icon}</span>
              <span class="label">${T(g.titleKey)}</span>
            </button>`).join('')}
        </div>
        <div class="suggest-section menu-actions">
          <button class="suggest-btn" id="album-btn">${T('btn_album')}</button>
          <button class="suggest-btn" id="suggest-btn">${T('btn_suggest')}</button>
        </div>
        <div class="menu-footer">
          <div class="total-stars">${I18n.tf('stars_total', { d: store.stars })}</div>
          <button class="parents-btn" id="parents-btn">
            <span class="fill"></span>${T('btn_parents')}
          </button>
        </div>
      </div>`;

    app.querySelectorAll('.game-card').forEach((btn) => {
      btn.addEventListener('pointerdown', () => {
        Sfx.unlock();
        Sfx.playTap();
        renderGame(Games.all[btn.dataset.game]);
      });
    });
    document.getElementById('eng-btn').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      Sfx.playTap();
      openEngineGate();
    });
    document.getElementById('album-btn').addEventListener('pointerdown', () => {
      Sfx.playTap();
      openAlbumModal();
    });
    document.getElementById('suggest-btn').addEventListener('pointerdown', () => {
      Sfx.playTap();
      openSuggestModal();
    });
    setupParentalGate();
  }

  /* ================= ЭКРАН ИГРЫ ================= */
  function renderGame(game) {
    Sfx.stop();
    if (game.id === 'animals' || game.id === 'sings' || game.id === 'pairs') Sfx.preloadAnimals();
    currentGame = game;
    currentRound = null;
    sessionStars = 0;
    streak = 0;
    resetBreakTimer();

    app.innerHTML = `
      <div class="game-screen" style="background:${game.bg}">
        <div class="topbar">
          <button class="btn-home" id="btn-home" aria-label="${T('btn_home')}">🏠</button>
          <div class="prompt" id="prompt"></div>
          <div class="stars" id="stars">⭐ 0</div>
        </div>
        <div class="subject" id="subject" hidden></div>
        <div class="play-area" id="play-area"></div>
        <div class="bottom-row">
          <button class="repeat-btn" id="btn-repeat" aria-label="${T('btn_repeat')}">🔊</button>
        </div>
      </div>`;

    document.getElementById('btn-home').addEventListener('pointerdown', () => {
      Sfx.playTap();
      renderMenu();
    });
    document.getElementById('btn-repeat').addEventListener('pointerdown', () => {
      Sfx.stop(); // выключаем всё, что сейчас звучит — без наложений
      if (currentRound && currentRound.playSound) {
        Sfx.animal(currentRound.playSound.id); // «повторить» в игре «Кто поёт?» — только звук, без щелчка
      } else if (currentRound) {
        Sfx.playTap();
        say(currentRound.prompt.key, currentRound.prompt.text, { delay: 250 });
      }
    });
    nextRound();
  }

  /* ================= ИГРОВОЙ ЦИКЛ ================= */
  function optionsCount() { return streak >= 5 ? 3 : 2; } // сложность растёт вместе с малышом

  function nextRound() {
    if (!currentGame) return;
    resetBreakTimer();
    const round = currentGame.createRound(optionsCount());
    currentRound = round;
    document.getElementById('prompt').textContent = round.prompt.text;

    const subject = document.getElementById('subject');
    if (round.subject) {
      subject.innerHTML = round.subject;
      subject.hidden = false;
    } else {
      subject.hidden = true;
      subject.innerHTML = '';
    }

    const area = document.getElementById('play-area');
    area.innerHTML = '';
    area.className = 'play-area ' + (round.mode === 'tapall' ? 'items' : round.mode === 'sorter' ? 'sorter' : 'options');

    if (round.mode === 'tapall') setupTapAll(round, area);
    else if (round.mode === 'sorter') setupSorter(round, area);
    else setupChoose(round, area);

    say(round.prompt.key, round.prompt.text, { delay: 700 });
    if (round.playSound) {
      setTimeout(() => {
        if (currentRound === round && !round.answered) Sfx.animal(round.playSound.id);
      }, 550);
    }
  }

  /* Победная оркестровка (t = тап):
     0    — главный звук (животное/фигура из onPick)
     500  — мелодия победы + искра звезды (на праздник — вместо них фанфара)
     1200 — голос («Гав-гав! Собака!») — из games.js
     2700 — «Молодец!»
     2900 — наклейка (только на 5-й звезде) */
  function roundWon(area, btn) {
    Sfx.vibrate(60);
    if (btn) btn.classList.add('win');
    burstConfetti(btn || area, 26);
    const big = addStar(); // сама решает: искра звезды или большой праздник
    if (big) {
      // фанфара (500) → голос животного (1200) → наклейка (2900)
      roundTimer = setTimeout(nextRound, 4700);
    } else {
      setTimeout(() => Sfx.playSuccess(), 500);
      sayPraise(2700);
      roundTimer = setTimeout(nextRound, 3200);
    }
  }

  function setupChoose(round, area) {
    let answered = false;
    let wrongTaps = 0;
    let correctBtn = null;
    round.options.forEach((opt) => {
      const btn = h(`<button class="opt">${opt.html}</button>`);
      if (opt.isCorrect) correctBtn = btn;
      btn.addEventListener('pointerdown', () => {
        if (answered) return;
        Sfx.stop(); // тишина: подсказка/хвост фразы не должны накладываться на тап
        if (opt.isCorrect) {
          answered = true;
          round.answered = true;
          streak++;
          if (opt.onPick) opt.onPick(btn);
          roundWon(area, btn);
        } else {
          wrongTaps++;
          streak = 0;
          Sfx.playWrong();
          Sfx.vibrate(25);
          btn.classList.remove('shake');
          void btn.offsetWidth; // перезапуск анимации
          btn.classList.add('shake');
          if (wrongTaps >= 2 && correctBtn) correctBtn.classList.add('hint'); // мягкая подсказка
          say(round.prompt.key, round.prompt.text, { delay: 550 });
        }
      });
      area.appendChild(btn);
    });
  }

  function setupTapAll(round, area) {
    let answered = false;
    let tapped = 0;
    round.items.forEach((item) => {
      const btn = h(`<button class="item">${item.html}</button>`);
      btn.addEventListener('pointerdown', () => {
        if (answered || btn.classList.contains('popped')) return;
        Sfx.stop(); // гасим подсказку и предыдущее слово счёта — без наложений
        btn.classList.add('popped');
        tapped++;
        Sfx.playPop();
        Sfx.vibrate(20);
        say('count-' + tapped, Games.numWord(tapped)); // «Раз, два, три…» — записанным голосом
        if (tapped === round.items.length) {
          answered = true;
          round.answered = true;
          roundTimer = setTimeout(() => {
            Sfx.vibrate(60);
            burstConfetti(area, 30);
            const big = addStar();
            if (!big) Sfx.playSuccess(); // блок и так задержан на 650мс
            // итог: «Всего три!» — малыш связывает пересчёт с результатом
            say(round.countWordKey, round.countWordText, { delay: big ? 1500 : 900 });
            if (!big) sayPraise(2400);
            roundTimer = setTimeout(nextRound, big ? 4700 : 3600);
          }, 650);
        }
      });
      area.appendChild(btn);
    });
  }

  /* ---------- 🧩 Сортер: фигурки → окошки (тап или перетаскивание) ---------- */
  function setupSorter(round, area) {
    let done = 0;
    let answered = false;
    let selected = null; // выбранная фигурка (режим «тап-тап»)
    let drag = null;

    const board = h('<div class="board"></div>');
    const deck = h('<div class="deck"></div>');
    area.appendChild(board);
    area.appendChild(deck);

    const holes = [];
    const pieces = [];
    round.shapes.forEach((s) => {
      const hole = h(`<button class="hole" data-id="${s.id}">${Games.shapeSvg(s, 'rgba(0,0,0,0.16)')}</button>`);
      board.appendChild(hole);
      holes.push(hole);
      const piece = h(`<button class="piece" data-id="${s.id}">${Games.shapeSvg(s, s.color)}</button>`);
      deck.appendChild(piece);
      pieces.push(piece);
    });

    const wrongHole = (hole) => {
      Sfx.stop(); // гасим играющую подсказку, чтобы не было двух голосов
      Sfx.playWrong();
      Sfx.vibrate(20);
      hole.classList.remove('shake');
      void hole.offsetWidth;
      hole.classList.add('shake');
      say(round.prompt.key, round.prompt.text, { delay: 550 });
    };

    const place = (piece, hole) => {
      if (answered || hole.classList.contains('filled')) return;
      Sfx.stop(); // тишина перед голосом фигурки
      const svg = piece.querySelector('svg').cloneNode(true);
      hole.innerHTML = '';
      hole.classList.add('filled');
      hole.appendChild(svg);
      svg.classList.add('pop-in');
      piece.classList.add('placed');
      if (selected === piece) { piece.classList.remove('selected'); selected = null; }
      Sfx.playPop();
      Sfx.vibrate(25);
      const shape = round.shapes.find((x) => x.id === piece.dataset.id);
      if (shape) Sfx.speakL(cap(L(shape.acc)), { delay: 250 });
      done++;
      if (done === round.shapes.length) {
        answered = true;
        round.answered = true;
        roundTimer = setTimeout(() => {
          Sfx.vibrate(60);
          burstConfetti(board, 30);
          const big = addStar();
          if (!big) Sfx.playSuccess(); // блок задержан на 600мс — за словом фигурки
          if (!big) sayPraise(1900);
          roundTimer = setTimeout(nextRound, big ? 4700 : 3200);
        }, 600);
      }
    };

    pieces.forEach((piece) => {
      piece.addEventListener('pointerdown', (e) => {
        if (answered || piece.classList.contains('placed')) return;
        Sfx.unlock();
        drag = { piece, id: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
        try { piece.setPointerCapture(e.pointerId); } catch (err) {}
      });
      piece.addEventListener('pointermove', (e) => {
        if (!drag || drag.piece !== piece) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) > 8) {
          drag.moved = true;
          piece.classList.add('dragging');
          piece.style.pointerEvents = 'none'; // чтобы elementFromPoint «видел» окошки
          if (selected === piece) { piece.classList.remove('selected'); selected = null; }
        }
        if (drag.moved) piece.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
      });
      const endDrag = (e) => {
        if (!drag || drag.piece !== piece) return;
        const moved = drag.moved;
        drag = null;
        piece.style.pointerEvents = '';
        if (moved) {
          piece.classList.remove('dragging');
          piece.style.transform = '';
          const under = document.elementFromPoint(e.clientX, e.clientY);
          const hole = under && under.closest('.board .hole');
          if (hole) {
            if (hole.dataset.id === piece.dataset.id) place(piece, hole);
            else wrongHole(hole);
          }
        } else if (selected === piece) {
          piece.classList.remove('selected');
          selected = null;
        } else {
          if (selected) selected.classList.remove('selected');
          selected = piece;
          piece.classList.add('selected');
          Sfx.playTap();
        }
      };
      piece.addEventListener('pointerup', endDrag);
      piece.addEventListener('pointercancel', () => {
        if (drag && drag.piece === piece) {
          drag = null;
          piece.classList.remove('dragging');
          piece.style.transform = '';
          piece.style.pointerEvents = '';
        }
      });
    });

    holes.forEach((hole) => {
      hole.addEventListener('pointerdown', (e) => {
        if (answered || !selected) return;
        e.stopPropagation();
        const match = pieces.find((p) => p.dataset.id === hole.dataset.id && !p.classList.contains('placed'));
        if (match === selected) place(selected, hole);
        else wrongHole(hole);
      });
    });
  }

  /* ================= ЗВЁЗДЫ, НАКЛЕЙКИ, СТАТИСТИКА ================= */
  function addStar() {
    sessionStars++;
    store.stars = store.stars + 1;

    const stats = statsStore.all;
    stats.rounds++;
    if (currentGame) stats.byGame[currentGame.id] = (stats.byGame[currentGame.id] || 0) + 1;
    const day = todayKey();
    stats.days[day] = (stats.days[day] || 0) + 1;
    statsStore.all = stats;

    const el = document.getElementById('stars');
    if (el) {
      el.textContent = `⭐ ${sessionStars}`;
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    }
    const big = sessionStars >= 5;
    if (big) {
      sessionStars = 0;
      setTimeout(bigCelebration, 500); // фанфара — своей очередью, не вместе с мелодией
      setTimeout(awardSticker, 2900);  // и голос наклейки — после голоса животного
    } else {
      setTimeout(() => Sfx.playStar(), 500); // искра — вместе с мелодией победы
    }
    return big; // true = большой праздник: звуками ведёт roundWon/игровые блоки
  }

  /* Праздник звучит по очереди: фанфара (t+500) → голос животного (t+1200)
     → наклейка (t+2900). Здесь — только парад и конфетти. */
  function bigCelebration() {
    Sfx.playFanfare();
    Sfx.vibrate([80, 60, 80, 60, 140]);
    const overlay = h(`<div class="celebrate">
        <div class="big">🌈</div>
        <div class="word">${T('celebrate_word')}</div>
      </div>`);
    fx.appendChild(overlay);
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 3;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => burstConfettiAt(cx + (Math.random() - 0.5) * 200, cy, 16), i * 160);
    }
    setTimeout(() => {
      overlay.remove();
      const el = document.getElementById('stars');
      if (el) el.textContent = '⭐ 0';
    }, 2400);
  }

  /* Каждые 5 звёзд — случайная наклейка в альбом (сначала недостающие).
     Вызывается по таймеру из addStar (через 2900мс), когда голос уже замолчал. */
  function awardSticker() {
    const owned = stickerStore.all;
    const missing = Games.ANIMALS.filter((a) => !owned.includes(a.id));
    const pickFrom = missing.length ? missing : Games.ANIMALS;
    const animal = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    stickerStore.all = [...owned, animal.id];

    const card = h(`<div class="celebrate sticker-pop">
        <div class="big">${animal.emoji}</div>
        <div class="word">⭐ ${T('new_sticker')} ${cap(L(animal.name))}!</div>
      </div>`);
    fx.appendChild(card);
    Sfx.playStar(); // одна искра — не вторая фанфара поверх фразы
    say('sticker', T('new_sticker'), { delay: 350 });
    setTimeout(() => card.remove(), 2400);
  }

  /* ================= АЛЬБОМ НАКЛЕЕК ================= */
  function openAlbumModal() {
    const owned = stickerStore.all;
    const cells = Games.ANIMALS.map((a) => {
      const has = owned.includes(a.id);
      return `
        <div class="album-item${has ? ' has' : ''}">
          <span class="album-emoji">${has ? a.emoji : '❔'}</span>
          <span class="album-name">${has ? cap(L(a.name)) : '—'}</span>
        </div>`;
    }).join('');
    const m = h(`
      <div class="modal">
        <div class="modal-card">
          <h2>${T('album_title')}</h2>
          <p class="stat">${I18n.tf('album_have', { d: new Set(owned).size, n: Games.ANIMALS.length })}</p>
          <div class="album-grid">${cells}</div>
          ${owned.length ? '' : `<p class="album-hint">${T('album_empty')}</p>`}
          <button class="modal-btn primary" id="album-close">${T('p_close')}</button>
        </div>
      </div>`);
    document.body.appendChild(m);
    m.addEventListener('pointerdown', (e) => { if (e.target === m) m.remove(); });
    m.querySelector('#album-close').addEventListener('pointerdown', () => { Sfx.playTap(); m.remove(); });
  }

  /* ================= ОТДЫХ (родительский таймер) ================= */
  let breakTimer = null;

  function resetBreakTimer() {
    clearTimeout(breakTimer);
    breakTimer = null;
    const min = settings.breakMin;
    if (!min || !currentGameStarted()) return;
    breakTimer = setTimeout(showRestOverlay, min * 60000);
  }
  // таймер отдыха активен и в меню, и в игре — достаточно знать, что приложение живо
  function currentGameStarted() { return true; }

  function showRestOverlay() {
    clearTimeout(breakTimer);
    breakTimer = null;
    Sfx.stop();
    const overlay = h(`
      <div class="celebrate rest-overlay">
        <div class="big">🐰</div>
        <div class="word">${T('rest_title')}</div>
        <div class="rest-text">${T('rest_text')}</div>
        <div class="rest-btns">
          <button class="modal-btn primary rest-btn" id="rest-more">${T('rest_more')}</button>
          <button class="modal-btn rest-btn" id="rest-home">${T('rest_home')}</button>
        </div>
      </div>`);
    fx.appendChild(overlay);
    say('rest', T('rest_title'), { delay: 700 });
    overlay.querySelector('#rest-more').addEventListener('pointerdown', () => {
      Sfx.playTap();
      overlay.remove();
      resetBreakTimer();
      if (currentRound) say(currentRound.prompt.key, currentRound.prompt.text, { delay: 500 });
    });
    overlay.querySelector('#rest-home').addEventListener('pointerdown', () => {
      Sfx.playTap();
      overlay.remove();
      renderMenu();
    });
  }

  /* ================= WAKE LOCK (экран не гаснет во время игры) ================= */
  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (e) { /* не поддерживается — не страшно */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestWakeLock();
  });

  /* ================= КОНФЕТТИ ================= */
  function burstConfetti(el, count = 22) {
    const r = el.getBoundingClientRect();
    burstConfettiAt(r.left + r.width / 2, r.top + r.height / 2, count);
  }
  function burstConfettiAt(x, y, count = 20) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      const size = 8 + Math.random() * 12;
      const dx = (Math.random() - 0.5) * 340;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      p.style.setProperty('--dx', `${dx}px`);
      p.style.animationDelay = `${Math.random() * 0.15}s`;
      fx.appendChild(p);
      setTimeout(() => p.remove(), 1900);
    }
  }

  /* ================= РОДИТЕЛЬСКИЙ КОНТРОЛЬ ================= */
  function setupParentalGate() {
    const btn = document.getElementById('parents-btn');
    if (!btn) return;
    const fill = btn.querySelector('.fill');
    let timer = null;
    let startAt = 0;

    const stopHold = () => {
      if (timer) clearInterval(timer);
      timer = null;
      fill.style.width = '0%';
    };
    const beginHold = () => {
      Sfx.unlock();
      if (timer) return;
      startAt = Date.now();
      timer = setInterval(() => {
        const pct = Math.min(100, ((Date.now() - startAt) / 3000) * 100);
        fill.style.width = `${pct}%`;
        if (pct >= 100) {
          stopHold();
          openParentsModal();
        }
      }, 60);
    };

    btn.addEventListener('pointerdown', beginHold);
    btn.addEventListener('pointerup', stopHold);
    btn.addEventListener('pointerleave', stopHold);
    btn.addEventListener('pointercancel', stopHold);
  }

  function statsHtml() {
    const s = statsStore.all;
    const days = Object.keys(s.days).length;
    const perGame = Object.entries(s.byGame)
      .filter(([id]) => Games.all[id])
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `<div class="stat-row"><span>${Games.all[id].icon} ${T(Games.all[id].titleKey)}</span><b>${n}</b></div>`)
      .join('');
    return `
      <p class="stat">${I18n.tf('p_rounds', { d: s.rounds })}</p>
      <p class="stat">${I18n.tf('p_days', { d: days })}</p>
      <div class="stats-list">${perGame}</div>`;
  }

  function openParentsModal() {
    Sfx.playTap();
    const breakMin = settings.breakMin;
    const lang = I18n.get();
    const m = h(`
      <div class="modal">
        <div class="modal-card">
          <h2>${T('p_title')}</h2>
          <p class="stat">⭐ ${store.stars}</p>
          <p class="parents-sub">${T('p_stats')}</p>
          ${statsHtml()}
          <p class="parents-sub">${T('p_break')} ⏳</p>
          <div class="btn-row">
            ${[0, 10, 15, 25].map((v) => `
              <button class="chip-btn${breakMin === v ? ' active' : ''}" data-break="${v}">${v === 0 ? T('p_break_off') : v + '′'}</button>`).join('')}
          </div>
          <p class="parents-note">${T('p_break_note')}</p>
          <p class="parents-sub">${T('p_lang')}</p>
          <div class="btn-row">
            <button class="chip-btn${lang === 'ru' ? ' active' : ''}" data-lang="ru">🇷🇺 Русский</button>
            <button class="chip-btn${lang === 'en' ? ' active' : ''}" data-lang="en">🇬🇧 English</button>
          </div>
          <p class="parents-sub">${T('p_backup')}</p>
          <button class="modal-btn" data-act="export">${T('p_export')}</button>
          <button class="modal-btn" data-act="import">${T('p_import')}</button>
          <p class="parents-note" id="backup-note"></p>
          <button class="modal-btn" data-act="mute">${Sfx.isMuted() ? T('p_mute_on') : T('p_mute_off')}</button>
          <button class="modal-btn danger" data-act="reset">${T('p_reset')}</button>
          <a class="modal-btn parent-link" href="parents.html" target="_blank" rel="noopener">${T('p_landing')}</a>
          <p class="about">
            ${T('p_about')}
            <br><br>${T('p_sounds_credit')}
          </p>
          <button class="modal-btn primary" data-act="close">${T('p_close')}</button>
          <input type="file" id="import-file" accept="application/json,.json" hidden>
        </div>
      </div>`);
    document.body.appendChild(m);
    const close = () => m.remove();
    m.addEventListener('pointerdown', (e) => { if (e.target === m) close(); });
    m.querySelector('[data-act="close"]').addEventListener('pointerdown', () => { Sfx.playTap(); close(); });
    m.querySelector('[data-act="mute"]').addEventListener('pointerdown', () => { Sfx.toggleMute(); close(); openParentsModal(); });

    // перерыв
    m.querySelectorAll('[data-break]').forEach((btn) => {
      btn.addEventListener('pointerdown', () => {
        settings.breakMin = parseInt(btn.dataset.break, 10);
        resetBreakTimer();
        Sfx.playTap();
        close();
        openParentsModal();
      });
    });
    // язык
    m.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('pointerdown', () => {
        I18n.set(btn.dataset.lang);
        Sfx.playTap();
        close(); // иначе старое окно останется под новым (на другом языке)
        renderMenu();
        openParentsModal();
      });
    });
    // сброс
    m.querySelector('[data-act="reset"]').addEventListener('pointerdown', () => {
      if (confirm(T('p_reset_confirm'))) {
        store.stars = 0;
        stickerStore.all = [];
        statsStore.all = { rounds: 0, days: {}, byGame: {} };
      }
      Sfx.playTap();
      close();
      renderMenu();
    });
    // экспорт / импорт
    const note = m.querySelector('#backup-note');
    m.querySelector('[data-act="export"]').addEventListener('pointerdown', () => {
      const data = {
        v: 1,
        app: 'krolichya-nora',
        exportedAt: new Date().toISOString(),
        stars: store.stars,
        stickers: stickerStore.all,
        stats: statsStore.all,
        lang: I18n.get(),
        breakMin: settings.breakMin,
      };
      try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `krolichya-nora-progress-${todayKey()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        note.textContent = T('p_export_done');
        Sfx.playSuccess();
      } catch (e) {
        note.textContent = T('p_import_bad');
      }
    });
    const importFile = m.querySelector('#import-file');
    m.querySelector('[data-act="import"]').addEventListener('pointerdown', () => importFile.click());
    importFile.addEventListener('change', () => {
      const file = importFile.files && importFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const d = JSON.parse(reader.result);
          if (typeof d !== 'object' || d === null || d.app !== 'krolichya-nora') throw new Error('bad');
          store.stars = parseInt(d.stars, 10) || 0;
          stickerStore.all = Array.isArray(d.stickers) ? d.stickers : [];
          statsStore.all = d.stats && typeof d.stats === 'object'
            ? { rounds: d.stats.rounds || 0, days: d.stats.days || {}, byGame: d.stats.byGame || {} }
            : { rounds: 0, days: {}, byGame: {} };
          if (d.lang) I18n.set(d.lang);
          if (d.breakMin !== undefined) settings.breakMin = parseInt(d.breakMin, 10) || 0;
          note.textContent = T('p_import_done');
          Sfx.playSuccess();
          renderMenu();
        } catch (e) {
          note.textContent = T('p_import_bad');
          Sfx.playWrong();
        }
      };
      reader.readAsText(file);
    });
  }

  /* ================= ПРЕДЛОЖЕНИЯ ================= */
  const escHtml = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const store_sugg = {
    get all() {
      try { return JSON.parse(localStorage.getItem('baby_suggestions') || '[]'); }
      catch (e) { return []; }
    },
    set all(v) { localStorage.setItem('baby_suggestions', JSON.stringify(v)); },
  };

  const suggWhen = (at) => new Date(at).toLocaleString('ru-RU',
    { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  const suggBadge = (s) => s.sent
    ? `<span class="suggest-badge ok">→ ${escHtml(s.sent)} ✓</span>`
    : s.err
      ? `<span class="suggest-badge bad">⚠ не доставлено</span>`
      : `<span class="suggest-badge">локально</span>`;
  const suggItemHtml = (s) => `
    <div class="suggest-item">
      <span class="suggest-when">${suggWhen(s.at)} ${suggBadge(s)}</span>
      <span class="suggest-text">${escHtml(s.text)}</span>
    </div>`;

  /* ================= TELEGRAM ================= */
  const loadTg = () => {
    try { return JSON.parse(localStorage.getItem('baby_tg') || '{}'); } catch (e) { return {}; }
  };
  const saveTg = (cfg) => localStorage.setItem('baby_tg', JSON.stringify(cfg));

  async function tgSend(text) {
    const cfg = loadTg();
    if (!cfg.token || !cfg.chatId) return { ok: false, reason: 'not-configured' };
    try {
      const res = await fetch(`https://api.telegram.org/bot${cfg.token.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: cfg.chatId.trim(), text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        // Telegram ответил ошибкой (напр. «chat not found», «bot was blocked») — показываем её
        return { ok: false, reason: 'api', description: data.description || `HTTP ${res.status}` };
      }
      return { ok: true, data };
    } catch (e) {
      return { ok: false, reason: 'network' };
    }
  }

  /* ================= VK (фолбэк без VPN) =================
     api.vk.com доступен из России без VPN. Запросы идут через
     JSONP (параметр callback), поэтому CORS не требуется. */
  const loadVk = () => {
    try { return JSON.parse(localStorage.getItem('baby_vk') || '{}'); } catch (e) { return {}; }
  };
  const saveVk = (cfg) => localStorage.setItem('baby_vk', JSON.stringify(cfg));

  function vkSend(text) {
    const cfg = loadVk();
    if (!cfg.token || !cfg.userId) return Promise.resolve({ ok: false, reason: 'not-configured' });
    return new Promise((resolve) => {
      const cb = 'vk_cb_' + Math.random().toString(36).slice(2);
      const s = document.createElement('script');
      let done = false;
      const finish = (r) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        delete window[cb];
        s.remove();
        resolve(r);
      };
      const t = setTimeout(() => finish({ ok: false, reason: 'timeout' }), 12000);
      window[cb] = (data) => {
        if (data && data.response) finish({ ok: true, data });
        else {
          const err = (data && data.error) || {};
          finish({ ok: false, reason: 'api', description: err.error_msg || 'ошибка VK' });
        }
      };
      s.onerror = () => finish({ ok: false, reason: 'network' });
      const q = new URLSearchParams({
        access_token: cfg.token.trim(),
        user_id: cfg.userId.trim(),
        message: text,
        random_id: String(Math.floor(Math.random() * 1e9)),
        v: '5.199',
        callback: cb,
      });
      s.src = `https://api.vk.com/method/messages.send?${q}`;
      document.head.appendChild(s);
    });
  }

  /* Единая доставка: Telegram → при недоступности сети VK.
     Возвращает: { ok: true, via } | { ok: false, text } | undefined (ничего не настроено) */
  async function deliver(payload) {
    const tg = loadTg(), vk = loadVk();
    const hasTg = !!(tg.token && tg.chatId);
    const hasVk = !!(vk.token && vk.userId);
    if (hasTg) {
      const r = await tgSend(payload);
      if (r.ok) return { ok: true, via: 'Telegram' };
      if (r.reason === 'api') return { ok: false, text: `Ошибка Telegram: ${r.description}` };
      // сеть/VPN недоступны — пробуем VK
    }
    if (hasVk) {
      const r = await vkSend(payload);
      if (r.ok) return { ok: true, via: 'VK', fallback: hasTg };
      if (r.reason === 'api') return { ok: false, text: `Ошибка VK: ${r.description}` };
      return { ok: false, text: hasTg ? 'Telegram и VK недоступны' : 'VK недоступен (сеть)' };
    }
    if (hasTg) return { ok: false, text: 'Telegram недоступен (нет VPN?)' };
    // ничего не настроено
    return undefined;
  }

  function openSuggestModal() {
    const m = h(`
      <div class="modal">
        <div class="modal-card suggest-card">
          <h2>💡 Предложения</h2>
          <p class="suggest-title">Напишите что можно исправить, добавить, или улучшить</p>
          <textarea class="suggest-input" id="suggest-input" rows="4" maxlength="1500"
                    placeholder="Например: добавить игру с буквами…"></textarea>
          <p class="suggest-note" id="suggest-note"></p>
          <button class="modal-btn primary" id="suggest-save">💾 Сохранить</button>
          <button class="modal-btn" id="suggest-share">📤 Отправить</button>
          <div class="suggest-history" id="suggest-history"></div>
          <button class="modal-btn" id="suggest-close">Закрыть</button>
        </div>
      </div>`);
    document.body.appendChild(m);

    const input = m.querySelector('#suggest-input');
    const note = m.querySelector('#suggest-note');
    const history = m.querySelector('#suggest-history');

    const flash = (text, bad) => {
      note.textContent = text;
      note.classList.toggle('bad', !!bad);
      Sfx[bad ? 'playWrong' : 'playSuccess']();
      clearTimeout(note._t);
      note._t = setTimeout(() => { note.textContent = ''; }, 2500);
    };

    const renderHistory = () => {
      const items = store_sugg.all;
      history.innerHTML = items.length
        ? `<div class="suggest-hist-title">Сохранено: ${items.length}</div>` +
          items.slice().reverse().map(suggItemHtml).join('')
        : '';
    };
    renderHistory();

    const text = () => input.value.trim();

    // добавляет предложение в историю сразу (видно пользователю), возвращает индекс
    const pushLocal = (t) => {
      const items = store_sugg.all;
      items.push({ text: t, at: Date.now() });
      store_sugg.all = items;
      renderHistory();
      return items.length - 1;
    };
    const markLocal = (idx, extra) => {
      const items = store_sugg.all;
      if (items[idx]) { Object.assign(items[idx], extra); store_sugg.all = items; renderHistory(); }
    };
    // блокирует кнопку и показывает процесс
    const runBusy = async (btn, label, fn) => {
      const orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = label;
      try { await fn(); } finally { btn.disabled = false; btn.textContent = orig; }
    };

    m.querySelector('#suggest-save').addEventListener('pointerdown', () => runBusy(
      m.querySelector('#suggest-save'), '⏳ Отправляю…', async () => {
        const t = text();
        if (!t) { flash('Пустое предложение', true); return; }
        const idx = pushLocal(t); // уже видно в списке
        input.value = '';
        flash('Сохранено ✓');
        // если Telegram/VK настроены — отправляем копию (Telegram → фолбэк VK)
        const d = await deliver(`💡 Предложение:\n${t}`);
        if (d && d.ok) { markLocal(idx, { sent: d.via }); flash(`Отправлено в ${d.via} ✓`); }
        else if (d) { markLocal(idx, { err: d.text }); flash(`Сохранено. ${d.text}`, true); }
      }));

    m.querySelector('#suggest-share').addEventListener('pointerdown', () => runBusy(
      m.querySelector('#suggest-share'), '⏳ Отправляю…', async () => {
        const t = text();
        if (!t) { flash('Пустое предложение', true); return; }
        const payload = `Предложение для «Кроличьей норы»:\n${t}`;
        const idx = pushLocal(t); // сразу видно в списке
        input.value = '';
        // Telegram/VK — основной канал (VK срабатывает автоматически, если Telegram заблокирован)
        const d = await deliver(payload);
        if (d && d.ok) { markLocal(idx, { sent: d.via }); flash(`Отправлено в ${d.via} ✓`); return; }
        if (d && d.text.startsWith('Ошибка')) { markLocal(idx, { err: d.text }); flash(d.text, true); return; }
        // каналы не настроены или сеть лежит — штатный share/буфер
        try {
          if (navigator.share) {
            await navigator.share({ title: 'Предложение — Кроличья нора', text: payload });
            markLocal(idx, { sent: 'Поделиться' });
            flash('Отправлено ✓');
          } else if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(payload);
            markLocal(idx, { sent: 'Буфер обмена' });
            flash('Скопировано в буфер ✓');
          } else {
            markLocal(idx, { err: 'Отправка недоступна' });
            flash('Отправка недоступна', true);
          }
        } catch (e) {
          markLocal(idx, { err: 'Отправка отменена' });
          flash('Отправка отменена', true);
        }
      }));

    m.querySelector('#suggest-close').addEventListener('pointerdown', () => { Sfx.playTap(); m.remove(); });
    m.addEventListener('pointerdown', (e) => { if (e.target === m) m.remove(); });
    setTimeout(() => input.focus(), 60);
  }

  /* ================= ИНЖЕНЕРНОЕ МЕНЮ ================= */
  const ENG_PASS = '0000';

  function openEngineGate() {
    const m = h(`
      <div class="modal">
        <div class="modal-card">
          <h2>🔧 Инженерное меню</h2>
          <p class="stat">Введите пароль</p>
          <input class="eng-pass" id="eng-pass" type="password" inputmode="numeric"
                 maxlength="4" autocomplete="off" placeholder="••••">
          <p class="eng-err" id="eng-err"></p>
          <button class="modal-btn primary" id="eng-ok">Войти</button>
          <button class="modal-btn" id="eng-cancel">Отмена</button>
        </div>
      </div>`);
    document.body.appendChild(m);
    const pass = m.querySelector('#eng-pass');
    const err = m.querySelector('#eng-err');
    setTimeout(() => pass.focus(), 60);

    const close = () => m.remove();
    const tryPass = () => {
      if (pass.value === ENG_PASS) {
        Sfx.playSuccess();
        close();
        openEngineMenu();
      } else {
        Sfx.playWrong();
        err.textContent = 'Неверный пароль';
        pass.value = '';
        pass.classList.remove('shake');
        void pass.offsetWidth;
        pass.classList.add('shake');
      }
    };
    m.addEventListener('pointerdown', (e) => { if (e.target === m) close(); });
    m.querySelector('#eng-ok').addEventListener('pointerdown', tryPass);
    m.querySelector('#eng-cancel').addEventListener('pointerdown', () => { Sfx.playTap(); close(); });
    pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryPass(); });
  }

  function openEngineMenu() {
    const tracks = Sfx.getTracks();
    const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const rows = Games.ANIMALS.map((a) => {
      const src = tracks[a.id] || '';
      return `
        <div class="eng-row" data-id="${a.id}">
          <span class="eng-emoji">${a.emoji}</span>
          <span class="eng-name">${cap(L(a.name))}</span>
          <button class="eng-play" data-act="play" aria-label="Проиграть">▶️</button>
          <input class="eng-src" data-act="src" type="text" autocomplete="off"
                 placeholder="путь/URL к аудио" value="${src.startsWith('data:') ? '' : escAttr(src)}">
          <label class="eng-file" data-act="file" aria-label="Выбрать файл">📁
            <input type="file" accept="audio/*" hidden>
          </label>
          <button class="eng-reset" data-act="reset" aria-label="Сбросить">♻️</button>
        </div>`;
    }).join('');

    const m = h(`
      <div class="modal">
        <div class="modal-card eng-card">
          <h2>🔧 Звуки животных</h2>
          <p class="eng-hint">
            Вставьте путь или URL к аудиофайлу (mp3/ogg/wav) либо выберите файл 📁.
            Изменение вступает в силу сразу. ♻️ — вернуть стандартный звук.
          </p>
          <div class="eng-list">${rows}</div>
          <button class="modal-btn" id="eng-clear-all">♻️ Сбросить все дорожки</button>
          <div class="eng-sugg">
            <h2>💡 Предложения (${store_sugg.all.length})</h2>
            <div class="eng-sugg-list" id="eng-sugg-list"></div>
            <button class="modal-btn danger" id="eng-sugg-clear">🗑 Очистить предложения</button>
          </div>
          <div class="eng-tg">
            <h2>📬 Доставка в Telegram</h2>
            <p class="eng-hint">
              Создайте бота у <b>@BotFather</b> → /newbot → скопируйте токен.
              Затем напишите боту любое сообщение и нажмите «Определить chat_id».
              Токен и chat_id хранятся только на этом устройстве.
            </p>
            <input class="eng-src" id="tg-token" type="text" autocomplete="off"
                   spellcheck="false" placeholder="Токен бота">
            <input class="eng-src" id="tg-chat" type="text" autocomplete="off"
                   inputmode="numeric" placeholder="Chat ID">
            <button class="modal-btn" id="tg-detect">🔎 Определить chat_id</button>
            <button class="modal-btn" id="tg-test">📨 Отправить тест</button>
            <p class="eng-note" id="tg-status"></p>
          </div>
          <div class="eng-tg eng-vk">
            <h2>💬 Доставка в VK (без VPN)</h2>
            <p class="eng-hint">
              VK работает без VPN — если Telegram заблокирован, доставка пойдёт автоматически сюда.
              Создайте сообщество → Управление → Работа с API → ключ доступа с правами «Сообщения».
              Напишите сообществу сообщение. Ваш ID — цифры из адреса профиля vk.com/id123456789.
            </p>
            <input class="eng-src" id="vk-token" type="text" autocomplete="off"
                   spellcheck="false" placeholder="Ключ доступа сообщества">
            <input class="eng-src" id="vk-user" type="text" autocomplete="off"
                   inputmode="numeric" placeholder="Ваш VK ID (цифры)">
            <button class="modal-btn" id="vk-test">📨 Отправить тест в VK</button>
            <p class="eng-note" id="vk-status"></p>
          </div>
          <button class="modal-btn primary" id="eng-close">Закрыть</button>
        </div>
      </div>`);
    document.body.appendChild(m);

    const suggList = m.querySelector('#eng-sugg-list');
    const renderSugg = () => {
      const items = store_sugg.all;
      suggList.innerHTML = items.length
        ? items.slice().reverse().map(suggItemHtml).join('')
        : '<p class="eng-hint">Пока пусто</p>';
    };
    renderSugg();

    const rowOf = (el) => el.closest('.eng-row');
    const applyTrack = (id, src, row) => {
      Sfx.setTrack(id, src || null);
      const input = row.querySelector('.eng-src');
      if (src && src.startsWith('data:')) input.value = '';
      errNote(row, src ? 'Сохранено ✓' : 'Стандартный звук');
    };
    const errNote = (row, text) => {
      let note = row.querySelector('.eng-note');
      if (!note) {
        note = document.createElement('div');
        note.className = 'eng-note';
        row.appendChild(note);
      }
      note.textContent = text;
      clearTimeout(note._t);
      note._t = setTimeout(() => note.remove(), 2500);
    };

    m.addEventListener('pointerdown', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const row = rowOf(t);
      const id = row.dataset.id;
      const act = t.dataset.act;

      if (act === 'play') {
        Sfx.unlock();
        Sfx.stop(); // без наложений: тишина и только звук животного
        Sfx.animal(id); // звук действует мгновенно, без сохранения
      } else if (act === 'reset') {
        applyTrack(id, '', row);
        Sfx.playTap();
      } else if (act === 'file') {
        const input = t.querySelector('input[type=file]');
        input.onchange = () => {
          const file = input.files && input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => applyTrack(id, reader.result, row);
          reader.readAsDataURL(file);
        };
      }
    });

    m.querySelectorAll('.eng-row .eng-src').forEach((input) => {
      const commit = () => applyTrack(rowOf(input).dataset.id, input.value.trim(), rowOf(input));
      input.addEventListener('change', commit);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
    });

    m.querySelector('#eng-clear-all').addEventListener('pointerdown', () => {
      Games.ANIMALS.forEach((a) => Sfx.setTrack(a.id, null));
      m.querySelectorAll('.eng-row .eng-src').forEach((i) => { i.value = ''; });
      Sfx.playTap();
    });
    m.querySelector('#eng-sugg-clear').addEventListener('pointerdown', () => {
      store_sugg.all = [];
      renderSugg();
      Sfx.playTap();
    });

    /* --- Telegram --- */
    const tgToken = m.querySelector('#tg-token');
    const tgChat = m.querySelector('#tg-chat');
    const tgStatus = m.querySelector('#tg-status');
    const cfg = loadTg();
    tgToken.value = cfg.token || '';
    tgChat.value = cfg.chatId || '';

    const tgFlash = (msg, bad) => {
      tgStatus.textContent = msg;
      tgStatus.classList.toggle('bad', !!bad);
      clearTimeout(tgStatus._t);
      tgStatus._t = setTimeout(() => { tgStatus.textContent = ''; }, 6000);
    };
    const tgPersist = () => saveTg({ token: tgToken.value.trim(), chatId: tgChat.value.trim() });
    tgToken.addEventListener('change', tgPersist);
    tgChat.addEventListener('change', tgPersist);

    m.querySelector('#tg-detect').addEventListener('pointerdown', async () => {
      const token = tgToken.value.trim();
      if (!token) { tgFlash('Сначала вставьте токен', true); return; }
      tgFlash('Проверяю токен…');
      try {
        // 1) валидация токена — сразу видно, верный ли он
        const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const me = await meRes.json().catch(() => ({}));
        if (!me.ok) {
          tgFlash(`Токен не работает: ${me.description || 'проверьте его'}`, true);
          return;
        }
        // 2) самое свежее сообщение из приватного чата
        tgFlash(`Бот @${me.result.username}. Ищу чат…`);
        const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
        const data = await res.json().catch(() => ({}));
        if (!data.ok) {
          tgFlash(`Ошибка: ${data.description || 'нет доступа'}`, true);
          return;
        }
        const msgs = (data.result || [])
          .map((u) => u.message)
          .filter((msg) => msg && msg.chat);
        const priv = msgs.filter((msg) => msg.chat.type === 'private');
        const last = (priv.length ? priv : msgs).pop(); // обновления приходят по порядку — последнее самое свежее
        if (!last) {
          tgFlash(`Чат не найден — напишите боту @${me.result.username} любое сообщение и повторите`, true);
          return;
        }
        tgChat.value = String(last.chat.id);
        tgPersist();
        tgFlash(`Чат «${last.chat.first_name || last.chat.title || last.chat.id}» найден ✓`);
      } catch (e) {
        tgFlash('Сеть недоступна (нужен интернет/VPN)', true);
      }
    });

    m.querySelector('#tg-test').addEventListener('pointerdown', async () => {
      tgPersist();
      tgFlash('Отправляю…');
      const r = await tgSend('🧪 Тест из «Кроличьей норы» — доставка настроена ✓');
      if (r.ok) tgFlash('Тест доставлен ✓');
      else if (r.reason === 'not-configured') tgFlash('Заполните токен и chat_id', true);
      else if (r.reason === 'network') tgFlash('Сеть недоступна (нужен интернет/VPN)', true);
      else tgFlash(`Telegram ответил: ${r.description}`, true);
    });

    /* --- VK --- */
    const vkToken = m.querySelector('#vk-token');
    const vkUser = m.querySelector('#vk-user');
    const vkStatus = m.querySelector('#vk-status');
    const vkCfg = loadVk();
    vkToken.value = vkCfg.token || '';
    vkUser.value = vkCfg.userId || '';

    const vkFlash = (msg, bad) => {
      vkStatus.textContent = msg;
      vkStatus.classList.toggle('bad', !!bad);
      clearTimeout(vkStatus._t);
      vkStatus._t = setTimeout(() => { vkStatus.textContent = ''; }, 6000);
    };
    const vkPersist = () => saveVk({ token: vkToken.value.trim(), userId: vkUser.value.trim() });
    vkToken.addEventListener('change', vkPersist);
    vkUser.addEventListener('change', vkPersist);

    m.querySelector('#vk-test').addEventListener('pointerdown', async () => {
      vkPersist();
      vkFlash('Отправляю…');
      const r = await vkSend('🧪 Тест из «Кроличьей норы» — доставка в ВК настроена ✓');
      if (r.ok) vkFlash('Тест доставлен ✓');
      else if (r.reason === 'not-configured') vkFlash('Заполните ключ и ID', true);
      else if (r.reason === 'timeout') vkFlash('VK не ответил (сеть?)', true);
      else if (r.reason === 'network') vkFlash('Сеть недоступна', true);
      else vkFlash(`VK ответил: ${r.description}`, true);
    });
    m.querySelector('#eng-close').addEventListener('pointerdown', () => { Sfx.playTap(); m.remove(); });
    m.addEventListener('pointerdown', (e) => { if (e.target === m) m.remove(); });
  }

  /* ================= ЗАЩИТА UI ================= */
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerdown', () => {
    Sfx.unlock();
    Sfx.preloadAnimals();
    requestWakeLock();
  }, { once: true });

  renderMenu();
})();
