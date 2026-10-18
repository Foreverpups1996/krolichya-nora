/* I18n — интерфейс на двух языках (ru/en), выбор хранится в localStorage */
const I18n = (() => {
  const DICT = {
    ru: {
      app_title: 'Кроличья нора',
      app_sub: 'Игра для малышей 2+',
      stars_total: '⭐ Всего звёзд: %d',
      btn_album: '🐰 Альбом',
      btn_suggest: '💡 Предложения',
      btn_parents: 'Для родителей',
      // игры
      g_animals: 'Животные',
      g_shapes: 'Формы',
      g_colors: 'Цвета',
      g_counting: 'Счёт',
      g_pairs: 'Малыши и взрослые',
      g_letters: 'Буквы',
      g_sorter: 'Сортер',
      g_sings: 'Кто поёт?',
      // альбом наклеек
      album_title: '🐰 Альбом наклеек',
      album_have: 'Собрано: %d из %n',
      album_empty: 'Играй — и сюда прилетят наклейки за каждые 5 звёзд!',
      new_sticker: 'Новая наклейка!',
      // праздник / отдых
      celebrate_word: 'Ура! Пять звёзд!',
      rest_title: 'Отдохнём?',
      rest_text: 'Малышам полезно делать перерыв. Погулять? Посмотреть книжку?',
      rest_more: 'Ещё немного',
      rest_home: 'В меню',
      // для родителей
      p_title: 'Для родителей',
      p_stats: 'Статистика',
      p_rounds: 'Играно раундов: %d',
      p_days: 'Дней с игрой: %d',
      p_break: 'Перерыв',
      p_break_note: 'Через выбранное время игра мягко попросит отдохнуть.',
      p_break_off: 'Выкл',
      p_lang: 'Язык игры',
      p_backup: 'Сохранение прогресса',
      p_export: '💾 Сохранить прогресс в файл',
      p_import: '📂 Загрузить прогресс из файла',
      p_export_done: 'Файл сохранён ✓',
      p_import_done: 'Прогресс восстановлен ✓',
      p_import_bad: 'Не получилось прочитать файл',
      p_landing: '🌐 Страница игры для родителей',
      p_mute_on: '🔔 Включить звук',
      p_mute_off: '🔕 Выключить звук',
      p_reset: '🗑 Сбросить прогресс',
      p_reset_confirm: 'Удалить все звёзды, наклейки и статистику?',
      p_about: '«Кроличья нора» — развивающая игра для детей 2–3 лет: животные, формы, цветы, счёт, буквы и сортер. Без рекламы, без покупок и без доступа в интернет. Совет: играйте вместе с малышом, повторяйте вслух слова и хвалите за каждое правильное действие.',
      p_sounds_credit: 'Звуки животных: записи с Wikimedia Commons (авторы и лицензии — sounds/CREDITS.txt).',
      p_close: 'Закрыть',
      // прочее
      btn_home: 'В меню',
      btn_repeat: 'Повторить подсказку',
    },
    en: {
      app_title: 'Rabbit Hole',
      app_sub: 'Game for toddlers 2+',
      stars_total: '⭐ Total stars: %d',
      btn_album: '🐰 Album',
      btn_suggest: '💡 Feedback',
      btn_parents: 'For parents',
      g_animals: 'Animals',
      g_shapes: 'Shapes',
      g_colors: 'Colors',
      g_counting: 'Counting',
      g_pairs: 'Babies & moms',
      g_letters: 'Letters',
      g_sorter: 'Sorter',
      g_sings: 'Who sings?',
      album_title: '🐰 Sticker album',
      album_have: 'Collected: %d of %n',
      album_empty: 'Play to earn a sticker for every 5 stars!',
      new_sticker: 'A new sticker!',
      celebrate_word: 'Hooray! Five stars!',
      rest_title: 'Time to rest?',
      rest_text: 'Breaks are good for little ones. Shall we go for a walk or read a book?',
      rest_more: 'A bit more',
      rest_home: 'To the menu',
      p_title: 'For parents',
      p_stats: 'Statistics',
      p_rounds: 'Rounds played: %d',
      p_days: 'Days played: %d',
      p_break: 'Break time',
      p_break_note: 'After the chosen time the game will gently suggest a break.',
      p_break_off: 'Off',
      p_lang: 'Game language',
      p_backup: 'Save progress',
      p_export: '💾 Save progress to a file',
      p_import: '📂 Load progress from a file',
      p_export_done: 'File saved ✓',
      p_import_done: 'Progress restored ✓',
      p_import_bad: 'Could not read the file',
      p_landing: '🌐 Game page for parents',
      p_mute_on: '🔔 Turn sound on',
      p_mute_off: '🔕 Turn sound off',
      p_reset: '🗑 Reset progress',
      p_reset_confirm: 'Delete all stars, stickers and statistics?',
      p_about: '«Rabbit Hole» is a learning game for toddlers 2–3: animals, shapes, colors, counting, letters and a shape sorter. No ads, no purchases, no internet required. Tip: play together with your little one, repeat words aloud and praise every right move.',
      p_sounds_credit: 'Animal sounds: recordings from Wikimedia Commons (authors and licenses — sounds/CREDITS.txt).',
      p_close: 'Close',
      btn_home: 'To the menu',
      btn_repeat: 'Repeat the hint',
    },
  };

  let lang = (() => {
    try { return localStorage.getItem('baby_lang') === 'en' ? 'en' : 'ru'; }
    catch (e) { return 'ru'; }
  })();

  const t = (key) => (DICT[lang][key] !== undefined ? DICT[lang][key] : DICT.ru[key] || key);
  const tf = (key, vars) => { // подстановка %d/%n
    let s = t(key);
    Object.entries(vars || {}).forEach(([k, v]) => { s = s.replace('%' + k, v); });
    return s;
  };
  /** Локализованное поле вида {ru: '…', en: '…'} */
  const L = (obj) => (obj && (obj[lang] !== undefined ? obj[lang] : obj.ru));
  const get = () => lang;
  const set = (l) => {
    lang = l === 'en' ? 'en' : 'ru';
    try { localStorage.setItem('baby_lang', lang); } catch (e) {}
    if (window.Sfx && Sfx.setPhraseLang) {
      Sfx.setPhraseLang(lang);
      if (Sfx.preloadPhrases) Sfx.preloadPhrases(); // подтянуть фразы нового языка
    }
  };

  return { t, tf, L, get, set };
})();
