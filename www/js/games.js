/* Games — определения мини-игр */
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

  const NUM_WORDS = ['', 'Раз', 'Два', 'Три', 'Четыре', 'Пять'];

  /* ---------- 🐾 Животные ---------- */
  const ANIMALS = [
    { id: 'dog',     emoji: '🐶', name: 'собака',   acc: 'собаку',   verb: 'Гав-гав!' },
    { id: 'cat',     emoji: '🐱', name: 'кошка',    acc: 'кошку',    verb: 'Мяу!' },
    { id: 'cow',     emoji: '🐮', name: 'корова',   acc: 'корову',   verb: 'Му-у!' },
    { id: 'sheep',   emoji: '🐑', name: 'овечка',   acc: 'овечку',   verb: 'Бе-бе!' },
    { id: 'pig',     emoji: '🐷', name: 'свинка',   acc: 'свинку',   verb: 'Хрю-хрю!' },
    { id: 'duck',    emoji: '🦆', name: 'утка',     acc: 'утку',     verb: 'Кря-кря!' },
    { id: 'chick',   emoji: '🐥', name: 'цыплёнок', acc: 'цыплёнка', verb: 'Пи-пи!' },
    { id: 'frog',    emoji: '🐸', name: 'лягушка',  acc: 'лягушку',  verb: 'Ква-ква!' },
    { id: 'bear',    emoji: '🐻', name: 'медведь',  acc: 'медведя',  verb: 'Гр-р-р!' },
  ];
  const animalsGame = {
    id: 'animals',
    icon: '🐾',
    title: 'Животные',
    bg: 'linear-gradient(160deg, #84cc16, #15803d)',
    createRound() {
      const correct = one(ANIMALS);
      const options = shuffle([correct, ...pick(ANIMALS.filter((a) => a.id !== correct.id), 2)]);
      return {
        prompt: `Найди ${correct.acc}!`,
        mode: 'choose',
        options: options.map((a) => ({
          isCorrect: a.id === correct.id,
          html: `<span class="big-emoji">${a.emoji}</span><span class="opt-label">${cap(a.name)}</span>`,
          onPick() {
            Sfx.animal(a.id);
            Sfx.speak(`${a.verb} ${cap(a.name)}!`, { delay: 700 });
          },
        })),
      };
    },
  };

  /* ---------- 🔷 Формы ---------- */
  const SHAPE_COLORS = ['#ef4444', '#3b82f6', '#facc15', '#22c55e', '#f97316', '#a855f7', '#ec4899'];
  const SHAPES = [
    { id: 'circle',    acc: 'круг',          svg: '<circle cx="50" cy="50" r="42"/>' },
    { id: 'square',    acc: 'квадрат',       svg: '<rect x="8" y="8" width="84" height="84" rx="10"/>' },
    { id: 'triangle',  acc: 'треугольник',   svg: '<polygon points="50,6 94,92 6,92"/>' },
    { id: 'star',      acc: 'звезду',        svg: '<polygon points="50,3 62,35 96,37 70,59 79,93 50,73 21,93 30,59 4,37 38,35"/>' },
    { id: 'heart',     acc: 'сердце',        svg: '<path d="M50 91 C16 67 4 47 17 28 C27 13 45 17 50 31 C55 17 73 13 83 28 C96 47 84 67 50 91 Z"/>' },
    { id: 'rect',      acc: 'прямоугольник', svg: '<rect x="3" y="25" width="94" height="50" rx="10"/>' },
  ];

  const shapesGame = {
    id: 'shapes',
    icon: '🔷',
    title: 'Формы',
    bg: 'linear-gradient(160deg, #60a5fa, #7c3aed)',
    createRound() {
      const correct = one(SHAPES);
      const options = shuffle([correct, ...pick(SHAPES.filter((s) => s.id !== correct.id), 2)]);
      return {
        prompt: `Найди ${correct.acc}!`,
        mode: 'choose',
        options: options.map((s) => {
          const color = one(SHAPE_COLORS);
          return {
            isCorrect: s.id === correct.id,
            html: `<span class="shape-svg"><svg viewBox="0 0 100 100" fill="${color}">${s.svg}</svg></span>`,
            onPick(btn) {
              const svg = btn.querySelector('svg');
              if (svg) svg.classList.add('grow');
              Sfx.speak(`${cap(s.acc)}!`, { delay: 500 });
            },
          };
        }),
      };
    },
  };

  /* ---------- 🎨 Цвета ---------- */
  const COLORS = [
    { id: 'red',     hex: '#ef4444', name: 'красный' },
    { id: 'blue',    hex: '#3b82f6', name: 'синий' },
    { id: 'yellow',  hex: '#facc15', name: 'жёлтый' },
    { id: 'green',   hex: '#22c55e', name: 'зелёный' },
    { id: 'orange',  hex: '#f97316', name: 'оранжевый' },
    { id: 'purple',  hex: '#a855f7', name: 'фиолетовый' },
  ];

  const colorsGame = {
    id: 'colors',
    icon: '🎨',
    title: 'Цвета',
    bg: 'linear-gradient(160deg, #fb7185, #f59e0b)',
    createRound() {
      const correct = one(COLORS);
      const options = shuffle([correct, ...pick(COLORS.filter((c) => c.id !== correct.id), 2)]);
      return {
        prompt: `Найди ${correct.name} шарик!`,
        mode: 'choose',
        options: options.map((c) => ({
          isCorrect: c.id === correct.id,
          html: `<span class="balloon" style="background:${c.hex}"></span><span class="opt-label">${cap(c.name)}</span>`,
          onPick(btn) {
            const b = btn.querySelector('.balloon');
            if (b) b.classList.add('pop-balloon');
            Sfx.speak(`${cap(c.name)}!`, { delay: 500 });
          },
        })),
      };
    },
  };

  /* ---------- 🔢 Счёт ---------- */
  const FRUITS = [
    { emoji: '🍎', name: 'яблоки' },
    { emoji: '🍌', name: 'бананы' },
    { emoji: '🍓', name: 'клубнику' },
    { emoji: '🍐', name: 'груши' },
    { emoji: '🍪', name: 'печеньки' },
    { emoji: '🥕', name: 'морковки' },
  ];

  const countingGame = {
    id: 'counting',
    icon: '🔢',
    title: 'Счёт',
    bg: 'linear-gradient(160deg, #fbbf24, #ea580c)',
    roundNum: 0,
    createRound() {
      this.roundNum++;
      const max = this.roundNum <= 2 ? 3 : 5;
      const count = 1 + Math.floor(Math.random() * max);
      const fruit = one(FRUITS);
      return {
        prompt: `Нажимай на ${fruit.name}!`,
        mode: 'tapall',
        items: Array.from({ length: count }, () => ({
          html: `<span style="display:inline-block; transform:rotate(${Math.round(Math.random() * 30 - 15)}deg)">${fruit.emoji}</span>`,
        })),
      };
    },
  };

  return {
    all: {
      animals: animalsGame,
      shapes: shapesGame,
      colors: colorsGame,
      counting: countingGame,
    },
    NUM_WORDS,
  };
})();
