/**
 * intclass — Каталог видеоуроков и интерактивных мини-тестов
 * Структура выбора: Предмет → Класс (5–9) → Тема → Урок с тестом
 *
 * Инструкция для добавления своих тестов ("позже расставлю тесты"):
 * Каждый урок в массиве LESSONS содержит свойство quiz:
 * quiz: [
 *   {
 *     question: "Текст вопроса?",
 *     options: ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"],
 *     answer: 0, // Индекс правильного ответа из options (0 = первый, 1 = второй и т.д.)
 *     explanation: "Короткое пояснение правила или решения"
 *   }
 * ]
 */

const LESSONS = [
  // ==========================================
  // МАТЕМАТИКА (5–9 КЛАССЫ)
  // ==========================================
  // 5 класс
  {
    id: "math-5-1",
    subject: "math",
    grade: "5",
    topic: "Обыкновенные дроби",
    title: "Обыкновенные дроби: понятие, сложение и вычитание",
    description: "Разбираем, что такое числитель и знаменатель, а также как складывать и вычитать дроби с одинаковыми знаменателями.",
    videoId: "WUvTyaaNkzM",
    quiz: [
      {
        question: "Что показывает знаменатель обыкновенной дроби?",
        options: [
          "На сколько равных частей разделено целое",
          "Сколько частей целого взяли",
          "Результат умножения числителя"
        ],
        answer: 0,
        explanation: "Знаменатель (внизу) показывает общее число равных долей, а числитель (вверху) — сколько таких долей взяли."
      }
    ]
  },
  {
    id: "math-5-2",
    subject: "math",
    grade: "5",
    topic: "Десятичные дроби",
    title: "Десятичные дроби: сложение и вычитание в столбик",
    description: "Правило записи «запятая под запятой» и пошаговый алгоритм вычислений без потери разрядов.",
    videoId: "fNk_zzaMoSs",
    quiz: [
      {
        question: "Как правильно подписывать числа при сложении десятичных дробей в столбик?",
        options: [
          "Строго запятая под запятой",
          "По правому краю без учёта запятой",
          "По первой значащей цифре"
        ],
        answer: 0,
        explanation: "При сложении и вычитании десятичных дробей запятая всегда записывается строго под запятой."
      }
    ]
  },

  // 6 класс
  {
    id: "math-6-1",
    subject: "math",
    grade: "6",
    topic: "Отрицательные числа",
    title: "Положительные и отрицательные числа: сложение и вычитание",
    description: "Координатная прямая, модуль числа и правила знаков при сложении чисел с разными знаками.",
    videoId: "aircAruvnKk",
    quiz: [
      {
        question: "Чему равна сумма чисел (-7) + 12?",
        options: [
          "5",
          "-5",
          "19",
          "-19"
        ],
        answer: 0,
        explanation: "Из большего модуля (12) вычитаем меньший (7) и ставим знак большего модуля (+), получаем 5."
      }
    ]
  },
  {
    id: "math-6-2",
    subject: "math",
    grade: "6",
    topic: "Пропорции и уравнения",
    title: "Основное свойство пропорции и решение уравнений",
    description: "Как крест-накрест находить неизвестный член пропорции и решать практические задачи.",
    videoId: "spUNpyF58BY",
    quiz: [
      {
        question: "В верной пропорции a/b = c/d произведение крайних членов (a · d) равно...",
        options: [
          "Произведению средних членов (b · c)",
          "Сумме средних членов (b + c)",
          "Единице"
        ],
        answer: 0,
        explanation: "Основное свойство пропорции: произведение крайних членов равно произведению средних (a · d = b · c)."
      }
    ]
  },

  // 7 класс
  {
    id: "math-7-1",
    subject: "math",
    grade: "7",
    topic: "Линейные уравнения",
    title: "Линейные уравнения с одной переменной",
    description: "Перенос слагаемых с противоположным знаком, раскрытие скобок и приведение подобных слагаемых.",
    videoId: "WUvTyaaNkzM",
    quiz: [
      {
        question: "Чему равен корень уравнения 4x - 8 = 12?",
        options: [
          "5",
          "4",
          "1",
          "-5"
        ],
        answer: 0,
        explanation: "Переносим -8 вправо: 4x = 20, откуда x = 20 / 4 = 5."
      }
    ]
  },
  {
    id: "math-7-2",
    subject: "math",
    grade: "7",
    topic: "Геометрия: Треугольники",
    title: "Признаки равенства треугольников",
    description: "Первый, второй и третий признаки равенства треугольников на наглядных чертежах.",
    videoId: "fNk_zzaMoSs",
    quiz: [
      {
        question: "Первый признак равенства треугольников гласит о равенстве по...",
        options: [
          "Двум сторонам и углу между ними",
          "Трём углам",
          "Стороне и двум любым углам"
        ],
        answer: 0,
        explanation: "Если две стороны и угол между ними одного треугольника равны двум сторонам и углу между ними другого, то такие треугольники равны."
      }
    ]
  },

  // 8 класс
  {
    id: "math-8-1",
    subject: "math",
    grade: "8",
    topic: "Квадратные уравнения",
    title: "Квадратные уравнения: формула корней через дискриминант",
    description: "Формула D = b² - 4ac, анализ количества корней в зависимости от знака дискриминанта.",
    videoId: "aircAruvnKk",
    quiz: [
      {
        question: "Сколько действительных корней имеет квадратное уравнение при D < 0?",
        options: [
          "Ни одного (0 корней)",
          "Ровно один корень",
          "Два различных корня"
        ],
        answer: 0,
        explanation: "Если дискриминант меньше нуля, уравнение не имеет действительных корней."
      }
    ]
  },
  {
    id: "math-8-2",
    subject: "math",
    grade: "8",
    topic: "Теорема Пифагора",
    title: "Теорема Пифагора и её применение",
    description: "Связь между катетами и гипотенузой прямоугольного треугольника: a² + b² = c².",
    videoId: "spUNpyF58BY",
    quiz: [
      {
        question: "Какова длина гипотенузы, если катеты равны 3 см и 4 см?",
        options: [
          "5 см (3² + 4² = 9 + 16 = 25 = 5²)",
          "7 см",
          "12 см",
          "6 см"
        ],
        answer: 0,
        explanation: "По теореме Пифагора c² = 3² + 4² = 25, следовательно, c = √25 = 5 см."
      }
    ]
  },

  // 9 класс
  {
    id: "math-9-1",
    subject: "math",
    grade: "9",
    topic: "Квадратичная функция",
    title: "Квадратичная функция y = ax² + bx + c и её график",
    description: "Координаты вершины параболы, направление ветвей и ось симметрии.",
    videoId: "WUvTyaaNkzM",
    quiz: [
      {
        question: "Куда направлены ветви параболы функции y = -3x² + 5x + 2?",
        options: [
          "Вниз, так как старший коэффициент a = -3 < 0",
          "Вверх, так как есть положительный коэффициент 5",
          "Вправо вдоль оси Ox"
        ],
        answer: 0,
        explanation: "Направление ветвей определяет знак коэффициента a: при a < 0 ветви направлены вниз."
      }
    ]
  },
  {
    id: "math-9-2",
    subject: "math",
    grade: "9",
    topic: "Арифметическая прогрессия",
    title: "Арифметическая прогрессия: формула n-го члена",
    description: "Разность прогрессии d, поиск любого члена an = a1 + d(n - 1) и сумма n первых членов.",
    videoId: "fNk_zzaMoSs",
    quiz: [
      {
        question: "Если первый член a1 = 4, а разность d = 3, чему равен третий член a3?",
        options: [
          "10 (4 + 3 · 2 = 10)",
          "13",
          "7",
          "12"
        ],
        answer: 0,
        explanation: "a3 = a1 + 2d = 4 + 2 · 3 = 10."
      }
    ]
  },

  // ==========================================
  // РУССКИЙ ЯЗЫК (5–9 КЛАССЫ)
  // ==========================================
  // 5 класс
  {
    id: "rus-5-1",
    subject: "russian",
    grade: "5",
    topic: "Части речи: Существительное",
    title: "Имя существительное: одушевлённость, род и склонение",
    description: "Постоянные и непостоянные признаки существительного, распределение по трём склонениям.",
    videoId: "spUNpyF58BY",
    quiz: [
      {
        question: "На какие главные вопросы отвечает имя существительное?",
        options: [
          "Кто? Что?",
          "Какой? Чей?",
          "Что делать? Что сделать?",
          "Как? Где? Куда?"
        ],
        answer: 0,
        explanation: "Имя существительное обозначает предмет и отвечает на вопросы «Кто?» (одушевлённое) или «Что?» (неодушевлённое)."
      }
    ]
  },
  {
    id: "rus-5-2",
    subject: "russian",
    grade: "5",
    topic: "Фонетика и звуки",
    title: "Фонетика: гласные, согласные, звонкие и глухие звуки",
    description: "Соотношение звуков и букв в русском языке, мягкость и твёрдость, парные согласные.",
    videoId: "WUvTyaaNkzM",
    quiz: [
      {
        question: "Какая пара согласных является парной по глухости-звонкости?",
        options: [
          "Б — П",
          "М — Н",
          "Р — Л",
          "Х — Ц"
        ],
        answer: 0,
        explanation: "Звонкий [Б] и глухой [П] образуют стандартную парную группу согласных."
      }
    ]
  },

  // 6 класс
  {
    id: "rus-6-1",
    subject: "russian",
    grade: "6",
    topic: "Имя прилагательное",
    title: "Разряды имён прилагательных по значению",
    description: "Качественные, относительные и притяжательные прилагательные: отличия и примеры.",
    videoId: "fNk_zzaMoSs",
    quiz: [
      {
        question: "К какому разряду относится словосочетание «медвежья берлога» (берлога медведя)?",
        options: [
          "Притяжательное (указывает на принадлежность)",
          "Качественное",
          "Относительное"
        ],
        answer: 0,
        explanation: "Притяжательные прилагательные отвечают на вопрос «чей?» и указывают на принадлежность предмета лицу или животному."
      }
    ]
  },
  {
    id: "rus-6-2",
    subject: "russian",
    grade: "6",
    topic: "Глагол и спряжение",
    title: "Спряжение глагола: как не ошибиться в окончании",
    description: "Определение I и II спряжения по неопределенной форме глагола, глаголы-исключения.",
    videoId: "aircAruvnKk",
    quiz: [
      {
        question: "Ко II спряжению относятся все глаголы на -ить, кроме двух исключений. Каких?",
        options: [
          "Брить, стелить",
          "Держать, слышать",
          "Гнать, дышать"
        ],
        answer: 0,
        explanation: "Глаголы «брить» и «стелить» оканчиваются на -ить, но относятся к I спряжению."
      }
    ]
  },

  // 7 класс
  {
    id: "rus-7-1",
    subject: "russian",
    grade: "7",
    topic: "Причастие и оборот",
    title: "Причастный оборот и знаки препинания при нём",
    description: "Когда причастный оборот выделяется запятыми на письме: позиция до и после определяемого слова.",
    videoId: "spUNpyF58BY",
    quiz: [
      {
        question: "Обособляется ли причастный оборот, стоящий ПОСЛЕ определяемого существительного?",
        options: [
          "Да, всегда выделяется запятыми с двух сторон",
          "Нет, никогда не обособляется",
          "Только если состоит из одного слова"
        ],
        answer: 0,
        explanation: "Если причастный оборот стоит после определяемого существительного, он всегда выделяется запятыми."
      }
    ]
  },
  {
    id: "rus-7-2",
    subject: "russian",
    grade: "7",
    topic: "Правописание НЕ",
    title: "Слитное и раздельное написание НЕ с причастиями и наречиями",
    description: "Зависимые слова, противопоставление с союзом «а» и краткие формы причастий.",
    videoId: "WUvTyaaNkzM",
    quiz: [
      {
        question: "В каком случае причастие с НЕ пишется РАЗДЕЛЬНО?",
        options: [
          "При наличии зависимых слов (например: ещё не прочитанная книга)",
          "Если у причастия нет зависимых слов",
          "Если слово не употребляется без НЕ"
        ],
        answer: 0,
        explanation: "Наличие зависимых слов у полного причастия — главное условие раздельного написания с НЕ."
      }
    ]
  },

  // 8 класс
  {
    id: "rus-8-1",
    subject: "russian",
    grade: "8",
    topic: "Односоставные предложения",
    title: "Односоставные простые предложения: виды и примеры",
    description: "Определенно-личные, неопределенно-личные, безличные и назывные предложения.",
    videoId: "fNk_zzaMoSs",
    quiz: [
      {
        question: "К какому типу относится предложение: «На улице быстро темнеет»?",
        options: [
          "Безличное (действие происходит без действующего лица)",
          "Определенно-личное",
          "Назывное",
          "Двусоставное"
        ],
        answer: 0,
        explanation: "В безличных предложениях нет и не может быть подлежащего; глагол обозначает состояние природы."
      }
    ]
  },
  {
    id: "rus-8-2",
    subject: "russian",
    grade: "8",
    topic: "Обособленные члены",
    title: "Обособление деепричастных оборотов",
    description: "Почему деепричастный оборот почти всегда выделяется запятыми независимо от места в предложении.",
    videoId: "aircAruvnKk",
    quiz: [
      {
        question: "Как обособляется деепричастный оборот в предложении?",
        options: [
          "Всегда выделяется запятыми, где бы он ни находился",
          "Только в начале предложения",
          "Только после подлежащего"
        ],
        answer: 0,
        explanation: "Одиночные деепричастия и деепричастные обороты обособляются независимо от места в предложении."
      }
    ]
  },

  // 9 класс
  {
    id: "rus-9-1",
    subject: "russian",
    grade: "9",
    topic: "Сложноподчинённое предложение",
    title: "Сложноподчинённое предложение: виды придаточных",
    description: "Определительные, изъяснительные и обстоятельственные придаточные, союзы и союзные слова.",
    videoId: "spUNpyF58BY",
    quiz: [
      {
        question: "Какой союз связывает части в предложении «Мы знали, что завтра будет экзамен»?",
        options: [
          "Подчинительный союз «что» (изъяснительное придаточное)",
          "Сочинительный союз",
          "Разделительный союз"
        ],
        answer: 0,
        explanation: "Союз «что» присоединяет изъяснительное придаточное к глаголу мысли/речи «знали»."
      }
    ]
  },
  {
    id: "rus-9-2",
    subject: "russian",
    grade: "9",
    topic: "Подготовка к сочинению",
    title: "Структура сочинения-рассуждения (ОГЭ)",
    description: "Как сформулировать тезис, привести аргумент из прочитанного текста, аргумент из жизненного опыта и сделать вывод.",
    videoId: "WUvTyaaNkzM",
    quiz: [
      {
        question: "Сколько основных смысловых частей обязательно должно быть в сочинении-рассуждении?",
        options: [
          "3 части: тезис, аргументы с примерами, вывод",
          "1 часть (только примеры)",
          "Только вступление и вывод без доказательств"
        ],
        answer: 0,
        explanation: "Классическая структура рассуждения включает: 1) Тезис, 2) Доказательства/аргументы, 3) Вывод."
      }
    ]
  }
];

const SUBJECT_LABELS = {
  math: "Математика",
  russian: "Русский язык"
};

const SUBJECT_DESCRIPTIONS = {
  math: {
    title: "Математика — школьный курс 5–9 классов",
    tags: ["Алгебра", "Геометрия", "Арифметика", "ОГЭ 2026", "20 видеоуроков и тестов"],
    lead: "Математика в средней школе формирует фундамент логического и аналитического мышления. Наш курс структурирован по единым стандартам школьной программы без лишней воды: от обыкновенных дробей и пропорций до квадратных уравнений, свойств треугольников и функций. После каждого видеоурока вас ждёт интерактивный тест с подробным объяснением решения для моментального закрепления темы.",
    curriculum: [
      { grade: "5 класс", desc: "Обыкновенные и десятичные дроби, сложение и вычитание, текстовые задачи на движение и работу." },
      { grade: "6 класс", desc: "Рациональные и отрицательные числа, основное свойство пропорции, проценты, модули и координатная прямая." },
      { grade: "7 класс", desc: "Начало алгебры и наглядная геометрия: линейные уравнения, формулы сокращённого умножения, признаки равенства треугольников." },
      { grade: "8 класс", desc: "Квадратные корни, квадратные уравнения (через дискриминант и теорему Виета), прямоугольные треугольники и теорема Пифагора." },
      { grade: "9 класс", desc: "Квадратичная функция и графики парабол, арифметическая и геометрическая прогрессии, основы вероятностей, подготовка к ОГЭ." }
    ],
    tip: "💡 <strong>Совет по обучению:</strong> выберите нужный класс ниже для быстрой фильтрации либо изучайте все видеоуроки предмета подряд. После просмотра обязательно ответьте на проверочный вопрос мини-теста!"
  },
  russian: {
    title: "Русский язык — школьный курс 5–9 классов",
    tags: ["Орфография", "Пунктуация", "Синтаксис", "Морфология", "Подготовка к ОГЭ"],
    lead: "Русский язык — не просто набор правил для зубрежки, а стройная логическая система. В наших видеоуроках сложные грамматические конструкции и правила орфографии объясняются через понятные опорные схемы и жизненные примеры. Программа помогает уверенно писать диктанты, сочинения и успешно сдать экзамен ОГЭ. Интерактивные мини-тесты позволяют за минуту проверить, насколько хорошо усвоено правило.",
    curriculum: [
      { grade: "5 класс", desc: "Фонетика, морфемика (корень, суффикс, приставка), безударные проверяемые гласные в корне, базовые части речи." },
      { grade: "6 класс", desc: "Корни с чередованием гласных (-лаг-/-лож-, -раст-/-рос-), приставки ПРЕ- и ПРИ-, правописание суффиксов имён существительных и прилагательных." },
      { grade: "7 класс", desc: "Особые формы глагола — причастия и деепричастия, слитное и раздельное написание НЕ с частями речи, служебные слова (предлоги, союзы, частицы)." },
      { grade: "8 класс", desc: "Синтаксис простого предложения: обособленные определения и обстоятельства (обороты), вводные конструкции и обращения." },
      { grade: "9 класс", desc: "Сложные предложения (ССП, СПП, БСП), синтаксический и пунктуационный анализ, комплексная подготовка к ОГЭ." }
    ],
    tip: "💡 <strong>Совет по обучению:</strong> переключайтесь между классами для повторения забытых правил прошлых лет. После каждого видео обязательно решите проверочный тест — в нём подробно объяснено, почему верен именно этот вариант."
  }
};

// Состояние пошагового выбора
const state = {
  subject: null,
  grade: null,
  topic: null
};

// DOM элементы
const subjectStep = document.getElementById("subjectStep");
const subjectOverview = document.getElementById("subjectOverview");
const gradeStep = document.getElementById("gradeStep");
const topicStep = document.getElementById("topicStep");
const gradeHint = document.getElementById("gradeHint");
const topicHint = document.getElementById("topicHint");
const topicChoices = document.getElementById("topicChoices");
const resultsPanel = document.getElementById("resultsPanel");
const resultsTitle = document.getElementById("resultsTitle");
const grid = document.getElementById("lessonsGrid");
const empty = document.getElementById("lessonsEmpty");
const resetFlowBtn = document.getElementById("resetFlow");
const flowProgress = document.getElementById("flowProgress");

/**
 * Отрисовка подробного текстового описания предмета
 */
function renderSubjectOverview(subjectKey) {
  if (!subjectOverview) return;
  const data = SUBJECT_DESCRIPTIONS[subjectKey];
  if (!data) {
    subjectOverview.hidden = true;
    subjectOverview.innerHTML = "";
    return;
  }

  const tagsHtml = data.tags.map((t) => `<span class="subject-overview-tag">${t}</span>`).join("");
  const currHtml = data.curriculum
    .map(
      (item) => `
      <div class="subject-curriculum-item">
        <strong>${item.grade}</strong>
        <p>${item.desc}</p>
      </div>
    `
    )
    .join("");

  subjectOverview.innerHTML = `
    <div class="subject-overview-head">
      <h3>${data.title}</h3>
      <div class="subject-overview-tags">${tagsHtml}</div>
    </div>
    <p class="subject-overview-lead">${data.lead}</p>
    <div class="subject-curriculum-grid">${currHtml}</div>
    <div class="subject-overview-tip">${data.tip}</div>
  `;
  subjectOverview.hidden = false;
}

/**
 * Обновление полосы шагов (индикатора прогресса)
 */
function updateProgressIndicator() {
  if (!flowProgress) return;
  const p1 = flowProgress.querySelector('[data-step-indicator="1"]');
  const p2 = flowProgress.querySelector('[data-step-indicator="2"]');
  const p3 = flowProgress.querySelector('[data-step-indicator="3"]');

  if (p1) {
    p1.classList.toggle("completed", Boolean(state.subject));
    p1.classList.toggle("active", !state.subject);
  }
  if (p2) {
    p2.classList.toggle("completed", Boolean(state.grade));
    p2.classList.toggle("active", Boolean(state.subject));
  }
  if (p3) {
    p3.classList.toggle("completed", Boolean(state.topic));
    p3.classList.toggle("active", Boolean(state.subject) && Boolean(state.grade));
  }
}

/**
 * Создание HTML-карточки урока с видеоплеером и интерактивным мини-тестом
 */
function createCard(lesson, index) {
  const card = document.createElement("article");
  card.className = "lesson-card";
  card.style.animationDelay = `${index * 90}ms`;

  const quizData = lesson.quiz || [];
  const hasQuiz = quizData.length > 0;

  // Формирование блока мини-теста
  const quizHtml = hasQuiz
    ? `
      <div class="lesson-quiz" data-lesson-id="${lesson.id}">
        <div class="quiz-header">
          <span class="quiz-tag">Мини-тест по теме</span>
          <button class="quiz-toggle-btn" type="button" aria-expanded="true">
            Свернуть тест
          </button>
        </div>
        <div class="quiz-box">
          ${quizData.map((q, qIndex) => `
            <div class="quiz-question-item" data-q-index="${qIndex}">
              <p class="quiz-q-title">${q.question}</p>
              <div class="quiz-options">
                ${q.options.map((opt, optIndex) => `
                  <label class="quiz-option-label">
                    <input type="radio" name="quiz-${lesson.id}-${qIndex}" value="${optIndex}">
                    <span>${opt}</span>
                  </label>
                `).join("")}
              </div>
            </div>
          `).join("")}
          <div class="quiz-actions">
            <button class="quiz-check-btn" type="button">Проверить ответ</button>
            <button class="quiz-retry-btn" type="button" hidden>Пройти снова</button>
          </div>
          <div class="quiz-result-msg" hidden aria-live="polite"></div>
        </div>
      </div>
    `
    : "";

  card.innerHTML = `
    <div class="lesson-media" data-video="${lesson.videoId}" role="button" tabindex="0" aria-label="Смотреть видео: ${lesson.title}">
      <img src="https://i.ytimg.com/vi/${lesson.videoId}/hqdefault.jpg" alt="${lesson.title}" loading="lazy">
      <span class="play-badge" aria-hidden="true"></span>
    </div>
    <div class="lesson-body">
      <div class="lesson-badge-wrap">
        <span class="lesson-subject">${SUBJECT_LABELS[lesson.subject] || lesson.subject}</span>
        <span class="lesson-grade-badge">${lesson.grade} класс</span>
        ${lesson.topic ? `<span class="lesson-grade-badge">${lesson.topic}</span>` : ""}
      </div>
      <h3>${lesson.title}</h3>
      <p>${lesson.description}</p>
      ${quizHtml}
    </div>
  `;

  return card;
}

/**
 * Динамическая генерация тем для выбранного предмета и класса
 */
function renderTopics() {
  if (!state.subject) {
    topicStep.classList.add("is-locked");
    topicChoices.innerHTML = "";
    if (topicHint) topicHint.hidden = false;
    return;
  }

  // Находим подходящие уроки: для конкретного класса или для всех классов предмета
  const availableLessons = LESSONS.filter((l) => {
    const matchSub = l.subject === state.subject;
    const matchGrade = !state.grade || l.grade === state.grade;
    return matchSub && matchGrade;
  });

  const uniqueTopics = [...new Set(availableLessons.map((l) => l.topic))];

  if (uniqueTopics.length === 0) {
    topicChoices.innerHTML = `<p class="flow-hint">Для выбранного критерия темы скоро появятся.</p>`;
    return;
  }

  // Кнопка "Все темы" + кнопки каждой темы
  const allChip = `<button class="topic-chip ${!state.topic ? "selected" : ""}" type="button" data-topic="__all__">Все темы (${availableLessons.length})</button>`;
  const topicChips = uniqueTopics
    .map(
      (topic) =>
        `<button class="topic-chip ${state.topic === topic ? "selected" : ""}" type="button" data-topic="${topic}">${topic}</button>`
    )
    .join("");

  topicChoices.innerHTML = allChip + topicChips;
  topicStep.classList.remove("is-locked");
  if (topicHint) topicHint.hidden = true;
  updateProgressIndicator();
}

/**
 * Отрисовка подходящих уроков и отображение панели результатов
 */
function renderLessons(shouldScroll = false) {
  if (!state.subject) {
    resultsPanel.classList.add("is-locked");
    return;
  }

  const filtered = LESSONS.filter((lesson) => {
    const matchSub = lesson.subject === state.subject;
    const matchGrade = !state.grade || lesson.grade === state.grade;
    const matchTopic = !state.topic || lesson.topic === state.topic;
    return matchSub && matchGrade && matchTopic;
  });

  const subjectTitle = SUBJECT_LABELS[state.subject] || state.subject;
  const gradeTitle = state.grade ? ` · ${state.grade} класс` : " · Все классы (5–9)";
  const topicTitle = state.topic ? ` · ${state.topic}` : " · Все темы";
  resultsTitle.textContent = `${subjectTitle}${gradeTitle}${topicTitle}`;

  grid.innerHTML = "";
  filtered.forEach((lesson, index) => {
    grid.appendChild(createCard(lesson, index));
  });

  empty.hidden = filtered.length > 0;
  resultsPanel.classList.remove("is-locked");
  updateProgressIndicator();

  if (shouldScroll) {
    setTimeout(() => {
      resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }
}

/**
 * Запуск встроенного YouTube плеера без перезагрузки
 */
function playVideo(media) {
  const videoId = media.dataset.video;
  if (!videoId) return;
  media.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0" title="Видеоурок YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  media.style.cursor = "default";
}

/**
 * Обработка интерактивного мини-теста
 */
function handleQuizInteraction(event) {
  const target = event.target;

  // Свернуть / Развернуть тест
  const toggleBtn = target.closest(".quiz-toggle-btn");
  if (toggleBtn) {
    const quizBox = toggleBtn.closest(".lesson-quiz")?.querySelector(".quiz-box");
    if (quizBox) {
      const isHidden = quizBox.hidden;
      quizBox.hidden = !isHidden;
      toggleBtn.textContent = isHidden ? "Свернуть тест" : "Развернуть тест";
      toggleBtn.setAttribute("aria-expanded", String(isHidden));
    }
    return;
  }

  // Выбор радио-кнопки (подсветка строки)
  const optionInput = target.closest('input[type="radio"]');
  if (optionInput) {
    const question = optionInput.closest(".quiz-question-item");
    if (question) {
      question.querySelectorAll(".quiz-option-label").forEach((label) => {
        label.classList.toggle("checked", label.contains(optionInput));
      });
    }
    return;
  }

  // Кнопка "Проверить ответ"
  const checkBtn = target.closest(".quiz-check-btn");
  if (checkBtn) {
    const quizElem = checkBtn.closest(".lesson-quiz");
    const lessonId = quizElem?.dataset.lessonId;
    const lesson = LESSONS.find((l) => l.id === lessonId);
    if (!lesson || !lesson.quiz) return;

    const resultMsg = quizElem.querySelector(".quiz-result-msg");
    const retryBtn = quizElem.querySelector(".quiz-retry-btn");
    const questions = quizElem.querySelectorAll(".quiz-question-item");

    let allAnswered = true;
    let correctCount = 0;

    questions.forEach((qElem, qIdx) => {
      const selected = qElem.querySelector('input[type="radio"]:checked');
      const correctIdx = lesson.quiz[qIdx]?.answer;
      const explanation = lesson.quiz[qIdx]?.explanation || "";

      if (!selected) {
        allAnswered = false;
        return;
      }

      const userVal = Number(selected.value);
      const labels = qElem.querySelectorAll(".quiz-option-label");

      labels.forEach((label, lIdx) => {
        label.classList.remove("is-correct", "is-wrong");
        if (lIdx === correctIdx) {
          label.classList.add("is-correct");
        } else if (lIdx === userVal && userVal !== correctIdx) {
          label.classList.add("is-wrong");
        }
      });

      if (userVal === correctIdx) {
        correctCount++;
      }
    });

    if (!allAnswered) {
      resultMsg.hidden = false;
      resultMsg.className = "quiz-result-msg info";
      resultMsg.textContent = "Пожалуйста, выберите ответ перед проверкой.";
      return;
    }

    resultMsg.hidden = false;
    if (correctCount === questions.length) {
      resultMsg.className = "quiz-result-msg success";
      const exp = lesson.quiz[0]?.explanation ? ` ${lesson.quiz[0].explanation}` : "";
      resultMsg.textContent = `✓ Отлично! Правильный ответ.${exp}`;
      checkBtn.hidden = true;
      if (retryBtn) retryBtn.hidden = false;
    } else {
      resultMsg.className = "quiz-result-msg error";
      resultMsg.textContent = "Пока не совсем точно. Посмотрите урок внимательнее и попробуйте ещё раз!";
      checkBtn.hidden = true;
      if (retryBtn) retryBtn.hidden = false;
    }
    return;
  }

  // Кнопка "Пройти снова"
  const retryBtn = target.closest(".quiz-retry-btn");
  if (retryBtn) {
    const quizElem = retryBtn.closest(".lesson-quiz");
    const checkBtn = quizElem?.querySelector(".quiz-check-btn");
    const resultMsg = quizElem?.querySelector(".quiz-result-msg");

    if (quizElem) {
      quizElem.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.checked = false;
      });
      quizElem.querySelectorAll(".quiz-option-label").forEach((label) => {
        label.classList.remove("checked", "is-correct", "is-wrong");
      });
    }

    if (resultMsg) resultMsg.hidden = true;
    if (checkBtn) checkBtn.hidden = false;
    retryBtn.hidden = true;
  }
}

// ==========================================
// Слушатели событий интерфейса
// ==========================================

/**
 * Выбор предмета (Математика / Русский язык)
 */
function selectSubject(subject, shouldScroll = false) {
  state.subject = subject;
  state.grade = null; // По умолчанию отображаются все классы
  state.topic = null;

  // Подсветка кнопок предметов
  document.querySelectorAll("[data-subject]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.subject === subject);
  });

  // Отображаем подробный текст по предмету
  renderSubjectOverview(subject);

  // Разблокируем шаг 2 (Класс)
  gradeStep?.classList.remove("is-locked");
  if (gradeHint) gradeHint.hidden = true;

  // Активируем кнопку "Все классы"
  document.querySelectorAll("[data-grade]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.grade === "all");
  });

  // Загружаем темы
  renderTopics();

  // Разблокируем результаты и сразу отображаем уроки!
  renderLessons(false);

  if (shouldScroll && window.innerWidth <= 768) {
    setTimeout(() => {
      subjectOverview?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }
}

/**
 * Выбор класса (Все классы, 5, 6, 7, 8, 9)
 */
function selectGrade(gradeVal, shouldScroll = false) {
  if (!state.subject) return;

  state.grade = (gradeVal === "all" || !gradeVal) ? null : gradeVal;
  state.topic = null;

  document.querySelectorAll("[data-grade]").forEach((btn) => {
    const isSelected = (!state.grade && btn.dataset.grade === "all") || (btn.dataset.grade === state.grade);
    btn.classList.toggle("selected", isSelected);
  });

  renderTopics();
  renderLessons(shouldScroll);
}

/**
 * Выбор конкретной темы
 */
function selectTopic(topicVal, shouldScroll = false) {
  state.topic = (topicVal === "__all__" || !topicVal) ? null : topicVal;

  topicChoices?.querySelectorAll(".topic-chip").forEach((btn) => {
    const isSelected = (!state.topic && btn.dataset.topic === "__all__") || (btn.dataset.topic === state.topic);
    btn.classList.toggle("selected", isSelected);
  });

  renderLessons(shouldScroll);
}

// Шаг 1: Выбор предмета
document.querySelectorAll("[data-subject]").forEach((button) => {
  button.addEventListener("click", () => {
    selectSubject(button.dataset.subject, true);
  });
});

// Шаг 2: Выбор класса (5, 6, 7, 8, 9)
document.querySelectorAll("[data-grade]").forEach((button) => {
  button.addEventListener("click", () => {
    selectGrade(button.dataset.grade, false);
  });
});

// Шаг 3: Выбор темы
topicChoices?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-topic]");
  if (!button) return;
  selectTopic(button.dataset.topic, false);
});

// Клик по сетке уроков (запуск видео и мини-тест)
grid?.addEventListener("click", (event) => {
  const media = event.target.closest(".lesson-media");
  if (media) {
    playVideo(media);
    return;
  }
  handleQuizInteraction(event);
});

grid?.addEventListener("keydown", (event) => {
  const media = event.target.closest(".lesson-media");
  if (media && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    playVideo(media);
  }
});

// Кнопка сброса выбора (начать заново / изменить)
resetFlowBtn?.addEventListener("click", () => {
  state.subject = null;
  state.grade = null;
  state.topic = null;

  document.querySelectorAll("[data-subject], [data-grade]").forEach((btn) => {
    btn.classList.remove("selected");
  });

  if (subjectOverview) {
    subjectOverview.hidden = true;
    subjectOverview.innerHTML = "";
  }

  topicChoices.innerHTML = "";
  gradeStep?.classList.add("is-locked");
  topicStep?.classList.add("is-locked");
  resultsPanel?.classList.add("is-locked");
  if (gradeHint) gradeHint.hidden = false;
  if (topicHint) topicHint.hidden = false;

  updateProgressIndicator();
  subjectStep?.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ==========================================
// Инициализация при переходе с главной страницы (?subject=math / ?subject=russian)
// ==========================================
(function initFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const initialSubject = params.get("subject");
  const initialGrade = params.get("grade");

  if (initialSubject && SUBJECT_LABELS[initialSubject]) {
    selectSubject(initialSubject, false);
    if (initialGrade && ["5", "6", "7", "8", "9"].includes(initialGrade)) {
      selectGrade(initialGrade, false);
    }
  } else {
    updateProgressIndicator();
  }
})();
