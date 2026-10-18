/* main.js — экраны, игровой цикл, конфетти, звёзды, «Для родителей» */
(() => {
  const app = document.getElementById('app');
  const fx = document.getElementById('fx-layer');

  const store = {
    get stars() { return parseInt(localStorage.getItem('baby_stars') || '0', 10) || 0; },
    set stars(v) { localStorage.setItem('baby_stars', String(v)); },
  };

  const PRAISE = ['Молодец!', 'Умница!', 'Правильно!', 'Здорово!', 'Супер!', 'Ты герой!'];
  const CONFETTI_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

  let sessionStars = 0;
  let currentGame = null;
  let roundTimer = null;
  let lastPrompt = '';

  const h = (html) => {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

  /* ================= МЕНЮ ================= */
  function renderMenu() {
    clearTimeout(roundTimer);
    Sfx.stop();
    currentGame = null;
    sessionStars = 0;

    app.innerHTML = `
      <div class="menu">
        <button class="eng-btn" id="eng-btn" aria-label="Инженерное меню">🛠</button>
        <div class="menu-title">Кроличья нора</div>
        <div class="menu-sub">Игра для малышей 2+</div>
        <div class="menu-grid">
          ${Object.values(Games.all).map((g) => `
            <button class="game-card" data-game="${g.id}" style="background:${g.bg}">
              <span class="icon">${g.icon}</span>
              <span class="label">${g.title}</span>
            </button>`).join('')}
        </div>
        <div class="suggest-section">
          <button class="suggest-btn" id="suggest-btn">💡 Предложения</button>
        </div>
        <div class="menu-footer">
          <div class="total-stars">⭐ Всего звёзд: ${store.stars}</div>
          <button class="parents-btn" id="parents-btn">
            <span class="fill"></span>Для родителей
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
    document.getElementById('suggest-btn').addEventListener('pointerdown', () => {
      Sfx.playTap();
      openSuggestModal();
    });
    setupParentalGate();
  }

  /* ================= ЭКРАН ИГРЫ ================= */
  function renderGame(game) {
    Sfx.stop();
    if (game.id === 'animals') Sfx.preloadAnimals();
    currentGame = game;
    sessionStars = 0;

    app.innerHTML = `
      <div class="game-screen" style="background:${game.bg}">
        <div class="topbar">
          <button class="btn-home" id="btn-home" aria-label="В меню">🏠</button>
          <div class="prompt" id="prompt"></div>
          <div class="stars" id="stars">⭐ 0</div>
        </div>
        <div class="play-area" id="play-area"></div>
        <div class="bottom-row">
          <button class="repeat-btn" id="btn-repeat" aria-label="Повторить подсказку">🔊</button>
        </div>
      </div>`;

    document.getElementById('btn-home').addEventListener('pointerdown', () => {
      Sfx.playTap();
      renderMenu();
    });
    document.getElementById('btn-repeat').addEventListener('pointerdown', () => {
      Sfx.playTap();
      Sfx.speak(lastPrompt, { delay: 250 });
    });
    nextRound();
  }

  /* ================= ИГРОВОЙ ЦИКЛ ================= */
  function nextRound() {
    if (!currentGame) return;
    const round = currentGame.createRound();
    lastPrompt = round.prompt;
    document.getElementById('prompt').textContent = round.prompt;

    const area = document.getElementById('play-area');
    area.innerHTML = '';
    area.className = 'play-area ' + (round.mode === 'tapall' ? 'items' : 'options');

    if (round.mode === 'tapall') setupTapAll(round, area);
    else setupChoose(round, area);

    Sfx.speak(round.prompt, { delay: 700 });
  }

  function setupChoose(round, area) {
    let answered = false;
    round.options.forEach((opt) => {
      const btn = h(`<button class="opt">${opt.html}</button>`);
      btn.addEventListener('pointerdown', () => {
        if (answered) return;
        if (opt.isCorrect) {
          answered = true;
          Sfx.playSuccess();
          Sfx.vibrate(60);
          btn.classList.add('win');
          burstConfetti(btn, 26);
          if (opt.onPick) opt.onPick(btn);
          addStar();
          Sfx.speak(praise(), { delay: 1900 });
          roundTimer = setTimeout(nextRound, 3000);
        } else {
          Sfx.playWrong();
          Sfx.vibrate(25);
          btn.classList.remove('shake');
          void btn.offsetWidth; // перезапуск анимации
          btn.classList.add('shake');
          Sfx.speak(lastPrompt, { delay: 550 });
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
        btn.classList.add('popped');
        tapped++;
        Sfx.playPop();
        Sfx.vibrate(20);
        Sfx.speak(Games.NUM_WORDS[tapped] || '');
        if (tapped === round.items.length) {
          answered = true;
          roundTimer = setTimeout(() => {
            Sfx.playSuccess();
            Sfx.vibrate(60);
            burstConfetti(area, 30);
            addStar();
            Sfx.speak(praise(), { delay: 1900 });
            roundTimer = setTimeout(nextRound, 3000);
          }, 650);
        }
      });
      area.appendChild(btn);
    });
  }

  /* ================= ЗВЁЗДЫ ================= */
  function addStar() {
    sessionStars++;
    store.stars = store.stars + 1;
    const el = document.getElementById('stars');
    if (el) {
      el.textContent = `⭐ ${sessionStars}`;
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    }
    Sfx.playStar();
    if (sessionStars >= 5) {
      sessionStars = 0;
      bigCelebration();
    }
  }

  function bigCelebration() {
    Sfx.playFanfare();
    Sfx.vibrate([80, 60, 80, 60, 140]);
    const overlay = h(`<div class="celebrate">
        <div class="big">🌈</div>
        <div class="word">Ура! Пять звёзд!</div>
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
    }, 2600);
  }

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

  function openParentsModal() {
    Sfx.playTap();
    const m = h(`
      <div class="modal">
        <div class="modal-card">
          <h2>Для родителей</h2>
          <p class="stat">⭐ Всего собрано звёзд: <b>${store.stars}</b></p>
          <button class="modal-btn" data-act="mute">${Sfx.isMuted() ? '🔔 Включить звук' : '🔕 Выключить звук'}</button>
          <button class="modal-btn danger" data-act="reset">🗑 Сбросить прогресс</button>
          <p class="about">
            «Кроличья нора» — развивающая игра для детей 2–3 лет: животные, формы, цветы и счёт.
            Без рекламы, без покупок и без доступа в интернет.
            Совет: играйте вместе с малышом, повторяйте вслух слова и хвалите за каждое правильное действие.
            <br><br>Звуки животных: записи с Wikimedia Commons (авторы и лицензии — sounds/CREDITS.txt).
          </p>
          <button class="modal-btn primary" data-act="close">Закрыть</button>
        </div>
      </div>`);
    document.body.appendChild(m);
    m.addEventListener('pointerdown', (e) => { if (e.target === m) m.remove(); });
    m.querySelector('[data-act="close"]').addEventListener('pointerdown', () => { Sfx.playTap(); m.remove(); });
    m.querySelector('[data-act="mute"]').addEventListener('pointerdown', () => { Sfx.toggleMute(); m.remove(); openParentsModal(); });
    m.querySelector('[data-act="reset"]').addEventListener('pointerdown', () => {
      store.stars = 0;
      Sfx.playTap();
      m.remove();
      openParentsModal();
      renderMenu();
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
          items.slice().reverse().map((s) => `
            <div class="suggest-item">
              <span class="suggest-when">${new Date(s.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span class="suggest-text">${escHtml(s.text)}</span>
            </div>`).join('')
        : '';
    };
    renderHistory();

    const text = () => input.value.trim();

    m.querySelector('#suggest-save').addEventListener('pointerdown', async () => {
      const t = text();
      if (!t) { flash('Пустое предложение', true); return; }
      const items = store_sugg.all;
      items.push({ text: t, at: Date.now() });
      store_sugg.all = items;
      input.value = '';
      renderHistory();
      flash('Сохранено ✓');
      // если Telegram настроен — отправляем копию
      if (loadTg().token && loadTg().chatId) {
        const r = await tgSend(`💡 Предложение:\n${t}`);
        if (r.ok) flash('Отправлено в Telegram ✓');
        else if (r.reason === 'network') flash('Сохранено, но Telegram недоступен', true);
        else flash(`Сохранено. Ошибка: ${r.description}`, true);
      }
    });

    m.querySelector('#suggest-share').addEventListener('pointerdown', async () => {
      const t = text();
      if (!t) { flash('Пустое предложение', true); return; }
      const payload = `Предложение для «Кроличьей норы»:\n${t}`;
      // Telegram — основной канал
      if (loadTg().token && loadTg().chatId) {
        const r = await tgSend(payload);
        if (r.ok) { flash('Отправлено в Telegram ✓'); return; }
        if (r.reason === 'api') { flash(`Ошибка: ${r.description}`, true); return; }
        // сеть недоступна — падаем в штатный share/буфер
      }
      try {
        if (navigator.share) {
          await navigator.share({ title: 'Предложение — Кроличья нора', text: payload });
          flash('Отправлено ✓');
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(payload);
          flash('Скопировано в буфер ✓');
        } else {
          flash('Отправка недоступна', true);
        }
      } catch (e) {
        flash('Отправка отменена', true);
      }
    });

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
          <span class="eng-name">${cap(a.name)}</span>
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
          <button class="modal-btn primary" id="eng-close">Закрыть</button>
        </div>
      </div>`);
    document.body.appendChild(m);

    const suggList = m.querySelector('#eng-sugg-list');
    const renderSugg = () => {
      const items = store_sugg.all;
      suggList.innerHTML = items.length
        ? items.slice().reverse().map((s) => `
            <div class="suggest-item">
              <span class="suggest-when">${new Date(s.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span class="suggest-text">${escHtml(s.text)}</span>
            </div>`).join('')
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
        Sfx.playTap();
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
  }, { once: true });

  renderMenu();
})();
