/* Games — определения мини-игр (ru/en).
   Подсказка каждого раунда: { key, text } — key это ключ записи-фразы
   (phrases/<lang>/<key>.mp3), text — текст для системного TTS-фолбэка. */
const Games = (() => {
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = (arr, n) => shuffle(arr).slice(0, n);
  const one = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const L = (obj) => I18n.L(obj);

  /* Числа прописью для текущего языка */
  const NUM_WORDS = {
    ru: ['', 'Раз', 'Два', 'Три', 'Четыре', 'Пять'],
    en: ['', 'One', 'Two', 'Three', 'Four', 'Five'],
  };
  const numWord = (n) => (NUM_WORDS[I18n.get()] || NUM_WORDS.ru)[n] || '';

  /* ---------- 🐾 Животные ---------- */
  const ANIMALS = [
    { id: 'dog',     emoji: '🐶', mom: '🐕', baby: '🐶', name: { ru: 'собака',  en: 'dog' },   acc: { ru: 'собаку',  en: 'dog' },   verb: { ru: 'Гав-гав!', en: 'Woof!' } },
    { id: 'cat',     emoji: '🐱', mom: '🐈', baby: '🐱', name: { ru: 'кошка',   en: 'cat' },   acc: { ru: 'кошку',   en: 'cat' },   verb: { ru: 'Мяу!',    en: 'Meow!' } },
    { id: 'cow',     emoji: '🐮', mom: '🐄', baby: '🐮', name: { ru: 'корова',  en: 'cow' },   acc: { ru: 'корову',  en: 'cow' },   verb: { ru: 'Му-у!',   en: 'Moo!' } },
    { id: 'sheep',   emoji: '🐑', mom: '🐑', baby: '🐑', name: { ru: 'овечка',  en: 'sheep' }, acc: { ru: 'овечку',  en: 'sheep' }, verb: { ru: 'Бе-бе!', en: 'Baa!' }, babySmall: true },
    { id: 'pig',     emoji: '🐷', mom: '🐖', baby: '🐷', name: { ru: 'свинка',  en: 'pig' },   acc: { ru: 'свинку',  en: 'pig' },   verb: { ru: 'Хрю-хрю!', en: 'Oink!' } },
    { id: 'duck',    emoji: '🦆', mom: '🦆', baby: '🐥', name: { ru: 'утка',    en: 'duck' },  acc: { ru: 'утку',    en: 'duck' },  verb: { ru: 'Кря-кря!', en: 'Quack!' } },
    { id: 'horse',   emoji: '🐴', mom: '🐎', baby: '🐴', name: { ru: 'лошадь',  en: 'horse' }, acc: { ru: 'лошадь',  en: 'horse' }, verb: { ru: 'Иго-го!', en: 'Neigh!' } },
    { id: 'frog',    emoji: '🐸', mom: '🐸', baby: '🐸', name: { ru: 'лягушка', en: 'frog' },  acc: { ru: 'лягушку', en: 'frog' },  verb: { ru: 'Ква-ква!', en: 'Ribbit!' }, babySmall: true },
    { id: 'bear',    emoji: '🐻', mom: '🐻', baby: '🐻', name: { ru: 'медведь', en: 'bear' },  acc: { ru: 'медведя', en: 'bear' },  verb: { ru: 'Гр-р-р!', en: 'Grrr!' }, babySmall: true },
  ];
  const findPrompt = (item) => ({
    key: `find-${item.id}`,
    text: I18n.get() === 'en' ? `Find the ${L(item.name)}!` : `Найди ${L(item.acc)}!`,
  });
  const animalsGame = {
    id: 'animals',
    icon: '🐾',
    titleKey: 'g_animals',
    bg: 'linear-gradient(160deg, #84cc16, #15803d)',
    createRound(n = 2) {
      const correct = one(ANIMALS);
      const options = shuffle([correct, ...pick(ANIMALS.filter((a) => a.id !== correct.id), n - 1)]);
      return {
        prompt: findPrompt(correct),
        mode: 'choose',
        options: options.map((a) => ({
          isCorrect: a.id === correct.id,
          html: `<span class="big-emoji">${a.emoji}</span><span class="opt-label">${cap(L(a.name))}</span>`,
          onPick() {
            Sfx.animal(a.id);
            Sfx.speak(`${L(a.verb)} ${cap(L(a.name))}!`, { delay: 700 });
          },
        })),
      };
    },
  };

  /* ---------- 🔷 Формы ---------- */
  const SHAPE_COLORS = ['#ef4444', '#3b82f6', '#facc15', '#22c55e', '#f97316', '#a855f7', '#ec4899'];
  const SHAPES = [
    { id: 'circle',   acc: { ru: 'круг',          en: 'circle' },    svg: '<circle cx="50" cy="50" r="42"/>' },
    { id: 'square',   acc: { ru: 'квадрат',       en: 'square' },    svg: '<rect x="8" y="8" width="84" height="84" rx="10"/>' },
    { id: 'triangle', acc: { ru: 'треугольник',   en: 'triangle' },  svg: '<polygon points="50,6 94,92 6,92"/>' },
    { id: 'star',     acc: { ru: 'звезду',        en: 'star' },      svg: '<polygon points="50,3 62,35 96,37 70,59 79,93 50,73 21,93 30,59 4,37 38,35"/>' },
    { id: 'heart',    acc: { ru: 'сердце',        en: 'heart' },     svg: '<path d="M50 91 C16 67 4 47 17 28 C27 13 45 17 50 31 C55 17 73 13 83 28 C96 47 84 67 50 91 Z"/>' },
    { id: 'rect',     acc: { ru: 'прямоугольник', en: 'rectangle' }, svg: '<rect x="3" y="25" width="94" height="50" rx="10"/>' },
  ];
  const shapePrompt = (s) => ({
    key: `find-${s.id}`,
    text: I18n.get() === 'en' ? `Find the ${L(s.acc)}!` : `Найди ${L(s.acc)}!`,
  });
  const shapeSvg = (s, color) =>
    `<span class="shape-svg"><svg viewBox="0 0 100 100" fill="${color}">${s.svg}</svg></span>`;

  const shapesGame = {
    id: 'shapes',
    icon: '🔷',
    titleKey: 'g_shapes',
    bg: 'linear-gradient(160deg, #60a5fa, #7c3aed)',
    createRound(n = 2) {
      const correct = one(SHAPES);
      const options = shuffle([correct, ...pick(SHAPES.filter((s) => s.id !== correct.id), n - 1)]);
      return {
        prompt: shapePrompt(correct),
        mode: 'choose',
        options: options.map((s) => {
          const color = one(SHAPE_COLORS);
          return {
            isCorrect: s.id === correct.id,
            html: shapeSvg(s, color),
            onPick(btn) {
              const svg = btn.querySelector('svg');
              if (svg) svg.classList.add('grow');
              Sfx.speak(`${cap(L(s.acc))}!`, { delay: 500 });
            },
          };
        }),
      };
    },
  };

  /* ---------- 🎨 Цвета ---------- */
  const COLORS = [
    { id: 'red',     hex: '#ef4444', name: { ru: 'красный',     en: 'red' } },
    { id: 'blue',    hex: '#3b82f6', name: { ru: 'синий',       en: 'blue' } },
    { id: 'yellow',  hex: '#facc15', name: { ru: 'жёлтый',      en: 'yellow' } },
    { id: 'green',   hex: '#22c55e', name: { ru: 'зелёный',     en: 'green' } },
    { id: 'orange',  hex: '#f97316', name: { ru: 'оранжевый',   en: 'orange' } },
    { id: 'purple',  hex: '#a855f7', name: { ru: 'фиолетовый',  en: 'purple' } },
  ];
  const colorPrompt = (c) => ({
    key: `find-${c.id}`,
    text: I18n.get() === 'en' ? `Find the ${L(c.name)} balloon!` : `Найди ${L(c.name)} шарик!`,
  });

  const colorsGame = {
    id: 'colors',
    icon: '🎨',
    titleKey: 'g_colors',
    bg: 'linear-gradient(160deg, #fb7185, #f59e0b)',
    createRound(n = 2) {
      const correct = one(COLORS);
      const options = shuffle([correct, ...pick(COLORS.filter((c) => c.id !== correct.id), n - 1)]);
      return {
        prompt: colorPrompt(correct),
        mode: 'choose',
        options: options.map((c) => ({
          isCorrect: c.id === correct.id,
          html: `<span class="balloon" style="background:${c.hex}"></span><span class="opt-label">${cap(L(c.name))}</span>`,
          onPick(btn) {
            const b = btn.querySelector('.balloon');
            if (b) b.classList.add('pop-balloon');
            Sfx.speak(`${cap(L(c.name))}!`, { delay: 500 });
          },
        })),
      };
    },
  };

  /* ---------- 🔢 Счёт ---------- */
  const FRUITS = [
    { id: 'apples',      emoji: '🍎', name: { ru: 'яблоки',    en: 'apples' } },
    { id: 'bananas',     emoji: '🍌', name: { ru: 'бананы',    en: 'bananas' } },
    { id: 'strawberries', emoji: '🍓', name: { ru: 'клубнику', en: 'strawberries' } },
    { id: 'pears',       emoji: '🍐', name: { ru: 'груши',     en: 'pears' } },
    { id: 'cookies',     emoji: '🍪', name: { ru: 'печеньки',  en: 'cookies' } },
    { id: 'carrots',     emoji: '🥕', name: { ru: 'морковки',  en: 'carrots' } },
  ];

  const countingGame = {
    id: 'counting',
    icon: '🔢',
    titleKey: 'g_counting',
    bg: 'linear-gradient(160deg, #fbbf24, #ea580c)',
    roundNum: 0,
    createRound() {
      this.roundNum++;
      const max = this.roundNum <= 2 ? 3 : 5;
      const count = 1 + Math.floor(Math.random() * max);
      const fruit = one(FRUITS);
      return {
        prompt: {
          key: `count-${fruit.id}`,
          text: I18n.get() === 'en' ? `Tap the ${L(fruit.name)}!` : `Нажимай на ${L(fruit.name)}!`,
        },
        mode: 'tapall',
        countWordKey: `total-${count}`,
        countWordText: I18n.get() === 'en'
          ? `${numWord(count)} in total!`
          : `Всего ${numWord(count).toLowerCase()}!`,
        items: Array.from({ length: count }, () => ({
          html: `<span style="display:inline-block; transform:rotate(${Math.round(Math.random() * 30 - 15)}deg)">${fruit.emoji}</span>`,
        })),
      };
    },
  };

  /* ---------- 👶 Малыши и взрослые ---------- */
  const pairsGame = {
    id: 'pairs',
    icon: '👶',
    titleKey: 'g_pairs',
    bg: 'linear-gradient(160deg, #34d399, #0d9488)',
    createRound(n = 2) {
      const showBaby = Math.random() < 0.5; // показываем малыша — ищем маму (и наоборот)
      const correct = one(ANIMALS);
      const pool = ANIMALS.filter((a) => a.id !== correct.id);
      const wrongs = pick(pool, n - 1);
      const options = shuffle([correct, ...wrongs]);
      const subjectOf = (a) => showBaby
        ? `<span class="big-emoji${a.babySmall ? ' small-baby' : ''}">${a.baby}</span>`
        : `<span class="big-emoji">${a.mom}</span>`;
      return {
        prompt: {
          key: showBaby ? 'pairs-mom' : 'pairs-baby',
          text: showBaby
            ? (I18n.get() === 'en' ? 'Find the mommy!' : 'Найди маму!')
            : (I18n.get() === 'en' ? 'Find the baby!' : 'Найди малыша!'),
        },
        subject: subjectOf(correct),
        mode: 'choose',
        options: options.map((a) => ({
          isCorrect: a.id === correct.id,
          html: subjectOf(a),
          onPick() {
            Sfx.speak(`${cap(L(a.name))}!`, { delay: 450 });
          },
        })),
      };
    },
  };

  /* ---------- 🔤 Буквы ---------- */
  const LETTERS = {
    ru: [
      { l: 'А', w: { ru: 'арбуз', en: 'watermelon' }, e: '🍉' },
      { l: 'Б', w: { ru: 'банан', en: 'banana' }, e: '🍌' },
      { l: 'В', w: { ru: 'велосипед', en: 'bike' }, e: '🚲' },
      { l: 'Г', w: { ru: 'гриб', en: 'mushroom' }, e: '🍄' },
      { l: 'Д', w: { ru: 'дом', en: 'house' }, e: '🏠' },
      { l: 'Е', w: { ru: 'ёж', en: 'hedgehog' }, e: '🦔' },
      { l: 'Ё', w: { ru: 'ёлка', en: 'tree' }, e: '🎄' },
      { l: 'Ж', w: { ru: 'жираф', en: 'giraffe' }, e: '🦒' },
      { l: 'З', w: { ru: 'зонтик', en: 'umbrella' }, e: '☂️' },
      { l: 'И', w: { ru: 'игрушка', en: 'toy' }, e: '🧸' },
      { l: 'Й', w: { ru: 'йогурт', en: 'yogurt' }, e: '🥛' },
      { l: 'К', w: { ru: 'кот', en: 'cat' }, e: '🐱' },
      { l: 'Л', w: { ru: 'лампа', en: 'lamp' }, e: '💡' },
      { l: 'М', w: { ru: 'морковка', en: 'carrot' }, e: '🥕' },
      { l: 'Н', w: { ru: 'нос', en: 'nose' }, e: '👃' },
      { l: 'О', w: { ru: 'облако', en: 'cloud' }, e: '☁️' },
      { l: 'П', w: { ru: 'пирог', en: 'pie' }, e: '🥧' },
      { l: 'Р', w: { ru: 'рыба', en: 'fish' }, e: '🐟' },
      { l: 'С', w: { ru: 'солнце', en: 'sun' }, e: '☀️' },
      { l: 'Т', w: { ru: 'трактор', en: 'tractor' }, e: '🚜' },
      { l: 'У', w: { ru: 'утка', en: 'duck' }, e: '🦆' },
      { l: 'Ф', w: { ru: 'флаг', en: 'flag' }, e: '🚩' },
      { l: 'Х', w: { ru: 'хлеб', en: 'bread' }, e: '🍞' },
      { l: 'Ц', w: { ru: 'цветок', en: 'flower' }, e: '🌸' },
      { l: 'Ч', w: { ru: 'часы', en: 'clock' }, e: '⏰' },
      { l: 'Ш', w: { ru: 'шар', en: 'balloon' }, e: '🎈' },
      { l: 'Щ', w: { ru: 'щука', en: 'pike' }, e: '🐟' },
      { l: 'Э', w: { ru: 'электричка', en: 'train' }, e: '🚆' },
      { l: 'Ю', w: { ru: 'юла', en: 'top' }, e: '🪀' },
      { l: 'Я', w: { ru: 'яблоко', en: 'apple' }, e: '🍎' },
      // Ъ, Ь, Ы намеренно пропущены — для малышей нет простых слов-примеров
    ],
    en: [
      { l: 'A', w: { ru: 'яблоко', en: 'apple' }, e: '🍎' },
      { l: 'B', w: { ru: 'банан', en: 'banana' }, e: '🍌' },
      { l: 'C', w: { ru: 'кот', en: 'cat' }, e: '🐱' },
      { l: 'D', w: { ru: 'собака', en: 'dog' }, e: '🐶' },
      { l: 'E', w: { ru: 'яйцо', en: 'egg' }, e: '🥚' },
      { l: 'F', w: { ru: 'рыба', en: 'fish' }, e: '🐟' },
      { l: 'G', w: { ru: 'виноград', en: 'grapes' }, e: '🍇' },
      { l: 'H', w: { ru: 'шляпа', en: 'hat' }, e: '🎩' },
      { l: 'I', w: { ru: 'мороженое', en: 'ice cream' }, e: '🍦' },
      { l: 'J', w: { ru: 'сок', en: 'juice' }, e: '🧃' },
      { l: 'K', w: { ru: 'воздушный змей', en: 'kite' }, e: '🪁' },
      { l: 'L', w: { ru: 'лев', en: 'lion' }, e: '🦁' },
      { l: 'M', w: { ru: 'обезьяна', en: 'monkey' }, e: '🐵' },
      { l: 'N', w: { ru: 'гнездо', en: 'nest' }, e: '🪺' },
      { l: 'O', w: { ru: 'апельсин', en: 'orange' }, e: '🍊' },
      { l: 'P', w: { ru: 'пингвин', en: 'penguin' }, e: '🐧' },
      { l: 'Q', w: { ru: 'королева', en: 'queen' }, e: '👑' },
      { l: 'R', w: { ru: 'кролик', en: 'rabbit' }, e: '🐰' },
      { l: 'S', w: { ru: 'солнце', en: 'sun' }, e: '☀️' },
      { l: 'T', w: { ru: 'дерево', en: 'tree' }, e: '🌳' },
      { l: 'U', w: { ru: 'зонтик', en: 'umbrella' }, e: '☂️' },
      { l: 'V', w: { ru: 'фургон', en: 'van' }, e: '🚐' },
      { l: 'W', w: { ru: 'арбуз', en: 'watermelon' }, e: '🍉' },
      { l: 'X', w: { ru: 'ксилофон', en: 'xylophone' }, e: '🎶' },
      { l: 'Y', w: { ru: 'яхта', en: 'yacht' }, e: '⛵' },
      { l: 'Z', w: { ru: 'зебра', en: 'zebra' }, e: '🦓' },
    ],
  };
  const lettersGame = {
    id: 'letters',
    icon: '🔤',
    titleKey: 'g_letters',
    bg: 'linear-gradient(160deg, #f472b6, #8b5cf6)',
    createRound(n = 2) {
      const set = LETTERS[I18n.get()] || LETTERS.ru;
      const correct = one(set);
      const options = shuffle([correct, ...pick(set.filter((x) => x.l !== correct.l), n - 1)]);
      return {
        prompt: {
          key: null, // каждая буква уникальна — озвучиваем системным TTS
          text: I18n.get() === 'en' ? `Find the letter ${correct.l}!` : `Найди букву ${correct.l}!`,
        },
        mode: 'choose',
        options: options.map((x) => ({
          isCorrect: x.l === correct.l,
          html: `<span class="big-emoji letter">${x.l}</span><span class="opt-label">${x.e} ${cap(L(x.w))}</span>`,
          onPick() {
            Sfx.speak(`${x.l}. ${L(x.w)}.`, { delay: 450 });
          },
        })),
      };
    },
  };

  /* ---------- 🧩 Сортер (drag & drop фигур в окошки) ---------- */
  const sorterGame = {
    id: 'sorter',
    icon: '🧩',
    titleKey: 'g_sorter',
    bg: 'linear-gradient(160deg, #22d3ee, #4f46e5)',
    createRound() {
      const shapes = pick(SHAPES, 3);
      return {
        prompt: { key: 'sorter', text: I18n.get() === 'en' ? 'Find the window for the shape!' : 'Найди окошко для фигуры!' },
        mode: 'sorter',
        shapes: shapes.map((s) => ({ ...s, color: one(SHAPE_COLORS) })),
      };
    },
  };

  /* ---------- 🎵 Кто поёт? ---------- */
  const singsGame = {
    id: 'sings',
    icon: '🎵',
    titleKey: 'g_sings',
    bg: 'linear-gradient(160deg, #f59e0b, #db2777)',
    createRound(n = 2) {
      const correct = one(ANIMALS);
      const options = shuffle([correct, ...pick(ANIMALS.filter((a) => a.id !== correct.id), n - 1)]);
      return {
        prompt: { key: 'who-sings', text: I18n.get() === 'en' ? 'Who is singing?' : 'Кто это поёт?' },
        mode: 'choose',
        playSound: { id: correct.id }, // звук в начале раунда и по кнопке «повторить»
        options: options.map((a) => ({
          isCorrect: a.id === correct.id,
          html: `<span class="big-emoji">${a.emoji}</span><span class="opt-label">${cap(L(a.name))}</span>`,
          onPick() {
            Sfx.speak(`${cap(L(a.verb))} ${cap(L(a.name))}!`, { delay: 650 });
          },
        })),
      };
    },
  };

  /* Ключи всех записанных фраз — для предзагрузки */
  function phraseKeys() {
    const keys = ['celebrate', 'sticker', 'who-sings', 'sorter', 'rest'];
    ANIMALS.forEach((a) => keys.push(`find-${a.id}`));
    SHAPES.forEach((s) => keys.push(`find-${s.id}`));
    COLORS.forEach((c) => keys.push(`find-${c.id}`));
    FRUITS.forEach((f) => keys.push(`count-${f.id}`));
    for (let i = 1; i <= 5; i++) { keys.push(`count-${i}`, `total-${i}`); }
    keys.push('pairs-mom', 'pairs-baby');
    for (let i = 1; i <= 6; i++) keys.push(`praise-${['molodets', 'umnica', 'pravilno', 'zdorovo', 'super', 'geroy'][i - 1]}`);
    return keys;
  }

  return {
    all: {
      animals: animalsGame,
      pairs: pairsGame,
      shapes: shapesGame,
      colors: colorsGame,
      counting: countingGame,
      letters: lettersGame,
      sorter: sorterGame,
      sings: singsGame,
    },
    numWord,
    ANIMALS,
    SHAPE_COLORS,
    shapeSvg,
    phraseKeys,
  };
})();
