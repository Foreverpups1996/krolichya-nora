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
  const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

  /* ================= МЕНЮ ================= */
  function renderMenu() {
    clearTimeout(roundTimer);
    Sfx.stop();
    currentGame = null;
    sessionStars = 0;

    app.innerHTML = `
      <div class="menu">
        <div class="menu-title">Кроличья нора</div>
        <div class="menu-sub">Игра для малышей 2+</div>
        <div class="menu-grid">
          ${Object.values(Games.all).map((g) => `
            <button class="game-card" data-game="${g.id}" style="background:${g.bg}">
              <span class="icon">${g.icon}</span>
              <span class="label">${g.title}</span>
            </button>`).join('')}
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
    setupParentalGate();
  }

  /* ================= ЭКРАН ИГРЫ ================= */
  function renderGame(game) {
    Sfx.stop();
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
            Совет: играйте вместе с малышом, повторяйте вслух слова и хвалите за каждое doğru действие.
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

  /* ================= ЗАЩИТА UI ================= */
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerdown', () => Sfx.unlock(), { once: true });

  renderMenu();
})();
