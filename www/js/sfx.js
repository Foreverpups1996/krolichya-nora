/* Sfx — синтез звуков (Web Audio) + предзаписанные фразы + русская озвучка (SpeechSynthesis) + вибрация */
const Sfx = (() => {
  let ctx = null;
  let muted = localStorage.getItem('baby_muted') === '1';
  let ruVoice = null;
  let enVoice = null;
  const speakTimers = new Set();

  /* ---------- Аудиоконтекст ---------- */
  function ac() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) {
      return null;
    }
  }

  function unlock() {
    const a = ac();
    if (a && a.state === 'suspended') a.resume();
    if ('speechSynthesis' in window) {
      loadVoices();
      try { speechSynthesis.resume(); } catch (e) {}
    }
    preloadPhrases();
  }

  /* ---------- Голос ---------- */
  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices() || [];
    ruVoice = vs.find(v => (v.lang || '').toLowerCase().startsWith('ru')) || null;
    enVoice = vs.find(v => (v.lang || '').toLowerCase().startsWith('en')) || null;
  }
  if ('speechSynthesis' in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  function speak(text, opts = {}) {
    if (muted || !('speechSynthesis' in window)) return;
    const delay = opts.delay || 0;
    const rate = opts.rate || 0.9;
    const pitch = opts.pitch || 1.2;
    const lang = opts.lang || 'ru-RU';
    const run = () => {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        if (lang.startsWith('ru') && ruVoice) u.voice = ruVoice;
        if (lang.startsWith('en') && enVoice) u.voice = enVoice;
        u.rate = rate;
        u.pitch = pitch;
        speechSynthesis.speak(u);
      } catch (e) {}
    };
    if (delay) {
      const t = setTimeout(() => { speakTimers.delete(t); run(); }, delay);
      speakTimers.add(t);
    } else {
      run();
    }
  }

  /** Озвучка на текущем языке игры */
  function speakL(text, opts = {}) {
    speak(text, { lang: I18n.get() === 'en' ? 'en-US' : 'ru-RU', ...opts });
  }

  function stop() {
    for (const t of speakTimers) clearTimeout(t);
    speakTimers.clear();
    if ('speechSynthesis' in window) {
      try { speechSynthesis.cancel(); } catch (e) {}
    }
    stopPhrases();
  }

  /* ---------- Тон ---------- */
  function tone({ f = 440, f2 = null, dur = 0.15, type = 'sine', vol = 0.22, at = 0 }) {
    if (muted) return;
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + at;
    try {
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t0);
      if (f2) osc.frequency.exponentialRampToValueAtTime(Math.max(f2, 20), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(a.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.06);
    } catch (e) {}
  }

  /* ---------- Мелодии ---------- */
  function playSuccess() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ f, dur: 0.18, type: 'triangle', vol: 0.22, at: i * 0.09 })
    );
  }
  function playFanfare() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone({ f, dur: 0.22, type: 'triangle', vol: 0.25, at: i * 0.12 })
    );
  }
  function playStar() {
    tone({ f: 880, dur: 0.1, type: 'sine', vol: 0.2 });
    tone({ f: 1318.5, dur: 0.25, type: 'sine', vol: 0.2, at: 0.09 });
  }
  function playTap() {
    tone({ f: 600, f2: 900, dur: 0.07, type: 'sine', vol: 0.15 });
  }
  function playWrong() {
    tone({ f: 330, f2: 250, dur: 0.28, type: 'sine', vol: 0.12 });
  }
  function playPop() {
    tone({ f: 950, f2: 220, dur: 0.09, type: 'sine', vol: 0.2 });
  }

  /* ---------- Предзаписанные фразы (phrases/<lang>/<key>.mp3) ----------
     Основной канал озвучки: живой женский/детский голос вместо TTS.
     Если файл ещё не загружен — main.js сам делает фолбэк на TTS. */
  let phraseLang = localStorage.getItem('baby_lang') === 'en' ? 'en' : 'ru';
  const phraseBuffers = { ru: {}, en: {} };
  const phrasePending = { ru: {}, en: {} };
  const phraseTimers = new Set();
  const phraseSources = new Set();

  function setPhraseLang(l) {
    phraseLang = l === 'en' ? 'en' : 'ru';
  }

  function loadPhrase(lang, key) {
    if (phraseBuffers[lang][key]) return Promise.resolve(true);
    if (phrasePending[lang][key]) return phrasePending[lang][key];
    const p = (async () => {
      try {
        const a = ac();
        if (!a) return false;
        const res = await fetch(`phrases/${lang}/${key}.mp3`);
        if (!res.ok) return false;
        const data = await res.arrayBuffer();
        phraseBuffers[lang][key] = await new Promise((resolve, reject) => a.decodeAudioData(data, resolve, reject));
        return true;
      } catch (e) {
        return false;
      } finally {
        delete phrasePending[lang][key];
      }
    })();
    phrasePending[lang][key] = p;
    return p;
  }

  /** Проиграть записанную фразу текущего языка. true — если фраза есть и сыграна. */
  function phrase(key, opts = {}) {
    if (muted || !key) return false;
    const buf = phraseBuffers[phraseLang] && phraseBuffers[phraseLang][key];
    if (!buf) return false;
    const a = ac();
    if (!a) return false;
    const delay = opts.delay || 0;
    const run = () => {
      try {
        const src = a.createBufferSource();
        src.buffer = buf;
        const g = a.createGain();
        const t0 = a.currentTime + 0.02;
        const dur = buf.duration;
        const fade = Math.min(0.12, dur / 4);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.95, t0 + 0.04);
        g.gain.setValueAtTime(0.95, t0 + dur - fade);
        g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
        src.connect(g);
        g.connect(a.destination);
        src.onended = () => phraseSources.delete(src);
        phraseSources.add(src);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
      } catch (e) {}
    };
    if (delay) {
      const t = setTimeout(() => { phraseTimers.delete(t); run(); }, delay);
      phraseTimers.add(t);
    } else {
      run();
    }
    return true;
  }

  function stopPhrases() {
    for (const t of phraseTimers) clearTimeout(t);
    phraseTimers.clear();
    for (const s of phraseSources) {
      try { s.stop(); } catch (e) {}
    }
    phraseSources.clear();
  }

  /** Предзагрузить все фразы текущего языка (после первого касания) */
  function preloadPhrases() {
    if (typeof Games !== 'undefined' && Games.phraseKeys) {
      Games.phraseKeys().forEach((key) => loadPhrase(phraseLang, key));
    }
  }

  /* ---------- Реальные звуки животных (мягкие) ----------
     Записи Wikimedia Commons (см. sounds/CREDITS.txt).
     MP3-копии — для Safari/iOS, Ogg — фолбэк.
     Чуть ускоряем (выше тище — звучит смешно и не страшно),
     ограничиваем длительность и делаем плавные атаку/затухание. */
  const ANIMAL_FILES = {
    dog:   { urls: ['sounds/dog.mp3', 'sounds/dog.ogg'],     rate: 1.2,  vol: 0.40 },
    cat:   { urls: ['sounds/cat.mp3', 'sounds/cat.ogg'],     rate: 1.3,  vol: 0.50, offset: 3.2 },
    cow:   { urls: ['sounds/cow.mp3', 'sounds/cow.ogg'],     rate: 1.25, vol: 0.50 },
    sheep: { urls: ['sounds/sheep.mp3', 'sounds/sheep.ogg'], rate: 1.25, vol: 0.50 },
    pig:   { urls: ['sounds/pig.mp3', 'sounds/pig.ogg'],     rate: 1.3,  vol: 0.50 },
    duck:  { urls: ['sounds/duck.mp3', 'sounds/duck.ogg'],   rate: 1.35, vol: 0.40, maxDur: 2.0 },
    horse: { urls: ['sounds/horse.mp3', 'sounds/horse.ogg'], rate: 1.2,  vol: 0.45 },
    frog:  { urls: ['sounds/frog.mp3', 'sounds/frog.ogg'],   rate: 1.3,  vol: 0.40 },
    bear:  { urls: ['sounds/bear.mp3', 'sounds/bear.ogg'],   rate: 1.45, vol: 0.30 },
  };
  const buffers = {};
  let loadingSounds = null;

  /* Пользовательские дорожки животных (инженерное меню):
     id -> data:URL загруженного файла или путь/URL. Хранятся в localStorage. */
  let customTracks = (() => {
    try { return JSON.parse(localStorage.getItem('baby_sound_tracks') || '{}'); }
    catch (e) { return {}; }
  })();

  function getTracks() { return { ...customTracks }; }

  function setTrack(id, src) {
    try {
      if (src) customTracks[id] = src; else delete customTracks[id];
      localStorage.setItem('baby_sound_tracks', JSON.stringify(customTracks));
    } catch (e) { /* переполнение localStorage — тихо игнорируем */ }
    delete buffers[id];
    loadingSounds = null; // перезагрузить буферы с новыми дорожками
    return preloadAnimals();
  }

  function preloadAnimals() {
    if (loadingSounds) return loadingSounds;
    const a = ac();
    if (!a) return Promise.resolve();
    loadingSounds = Promise.all(
      Object.entries(ANIMAL_FILES).map(async ([id, cfg]) => {
        const urls = customTracks[id] ? [customTracks[id], ...cfg.urls] : cfg.urls;
        for (const url of urls) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.arrayBuffer();
            buffers[id] = await new Promise((resolve, reject) => {
              a.decodeAudioData(data, resolve, reject);
            });
            return;
          } catch (e) { /* пробуем следующий источник */ }
        }
        /* останется синтез-фолбэк */
      })
    );
    return loadingSounds;
  }

  function playAnimalFile(id) {
    const buf = buffers[id];
    if (!buf || muted) return false;
    const a = ac();
    if (!a) return false;
    const cfg = ANIMAL_FILES[id];
    const custom = !!customTracks[id]; // своя дорожка — играем как есть
    try {
      const src = a.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = custom ? 1 : cfg.rate;
      const g = a.createGain();
      const t0 = a.currentTime + 0.02;
      const dur = Math.min(custom ? 6 : cfg.maxDur || 2.5, buf.duration / src.playbackRate.value);
      const vol = custom ? 0.7 : cfg.vol;
      const fade = Math.min(0.2, dur / 3);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.05);
      g.gain.setValueAtTime(vol, t0 + dur - fade);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      src.connect(g);
      g.connect(a.destination);
      src.start(t0, custom ? 0 : cfg.offset || 0);
      src.stop(t0 + dur + 0.05);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- Звуки животных (синтез, фолбэк) ---------- */
  const ANIMAL_SOUNDS = {
    dog: () => {
      tone({ f: 260, f2: 90, dur: 0.12, type: 'square', vol: 0.18 });
      tone({ f: 290, f2: 100, dur: 0.12, type: 'square', vol: 0.18, at: 0.17 });
    },
    cat: () => {
      tone({ f: 640, f2: 900, dur: 0.18, type: 'sine', vol: 0.2 });
      tone({ f: 900, f2: 540, dur: 0.3, type: 'sine', vol: 0.2, at: 0.18 });
    },
    cow: () => {
      tone({ f: 190, f2: 115, dur: 0.85, type: 'sawtooth', vol: 0.13 });
      tone({ f: 125, f2: 95, dur: 0.45, type: 'sawtooth', vol: 0.11, at: 0.5 });
    },
    sheep: () => {
      for (let i = 0; i < 7; i++) tone({ f: 330, f2: 300, dur: 0.06, type: 'sine', vol: 0.15, at: i * 0.085 });
    },
    pig: () => {
      for (let i = 0; i < 3; i++) tone({ f: 145, f2: 110, dur: 0.08, type: 'sawtooth', vol: 0.16, at: i * 0.15 });
    },
    duck: () => {
      for (let i = 0; i < 2; i++) tone({ f: 430, f2: 290, dur: 0.12, type: 'square', vol: 0.12, at: i * 0.19 });
    },
    chick: () => {
      tone({ f: 1250, f2: 1650, dur: 0.06, type: 'sine', vol: 0.14 });
      tone({ f: 1350, f2: 1750, dur: 0.06, type: 'sine', vol: 0.14, at: 0.11 });
      tone({ f: 1300, f2: 1700, dur: 0.06, type: 'sine', vol: 0.14, at: 0.22 });
    },
    frog: () => {
      tone({ f: 210, f2: 150, dur: 0.15, type: 'square', vol: 0.14 });
      tone({ f: 210, f2: 150, dur: 0.15, type: 'square', vol: 0.14, at: 0.21 });
    },
    bear: () => {
      tone({ f: 95, f2: 70, dur: 0.7, type: 'sawtooth', vol: 0.14 });
    },
  };

  function animal(id) {
    if (playAnimalFile(id)) return;
    const s = ANIMAL_SOUNDS[id];
    if (s) s();
    else playTap();
  }

  /* ---------- Вибрация ---------- */
  function vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) {}
  }

  /* ---------- Громкость ---------- */
  function isMuted() { return muted; }
  function toggleMute() {
    muted = !muted;
    localStorage.setItem('baby_muted', muted ? '1' : '0');
    if (muted) stop();
    else playTap();
    return muted;
  }

  return {
    unlock, speak, speakL, stop, preloadAnimals,
    playSuccess, playFanfare, playStar, playTap, playWrong, playPop,
    animal, vibrate, isMuted, toggleMute,
    getTracks, setTrack,
    phrase, loadPhrase, preloadPhrases, setPhraseLang,
  };
})();
