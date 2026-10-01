/* Данные уроков. Для добавления урока скопируйте объект и замените videoId. */
const LESSONS = [
  { title: "Суть математического анализа", description: "Наглядное введение в пределы, производные и идею изменения.", subject: "math", videoId: "WUvTyaaNkzM" },
  { title: "Векторы и линейная алгебра", description: "Почему векторы являются базовым языком современной математики.", subject: "math", videoId: "fNk_zzaMoSs" },
  { title: "Преобразование Фурье", description: "Как сложные волны раскладываются на простые составляющие.", subject: "physics", videoId: "spUNpyF58BY" },
  { title: "Как работает нейронная сеть", description: "Интуитивное объяснение идеи, лежащей в основе современного ИИ.", subject: "math", videoId: "aircAruvnKk" }
];
const SUBJECT_LABELS = { math: "Математика", physics: "Физика", chemistry: "Химия", biology: "Биология", history: "История", english: "Английский" };
const grid = document.getElementById("lessonsGrid");
const empty = document.getElementById("lessonsEmpty");
const filters = document.getElementById("filters");

function createCard(lesson, index) {
  const card = document.createElement("article");
  card.className = "lesson-card";
  card.style.animationDelay = `${index * 80}ms`;
  card.innerHTML = `<div class="lesson-media" data-video="${lesson.videoId}" role="button" tabindex="0" aria-label="Запустить урок: ${lesson.title}"><img src="https://i.ytimg.com/vi/${lesson.videoId}/hqdefault.jpg" alt="" loading="lazy"><span class="play-badge" aria-hidden="true"></span></div><div class="lesson-body"><span class="lesson-subject">${SUBJECT_LABELS[lesson.subject] || lesson.subject}</span><h3>${lesson.title}</h3><p>${lesson.description}</p></div>`;
  return card;
}
function playVideo(media) {
  media.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${media.dataset.video}?autoplay=1&rel=0" title="Видеоурок YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  media.style.cursor = "default";
}
function render(subject) {
  const lessons = subject === "all" ? LESSONS : LESSONS.filter((lesson) => lesson.subject === subject);
  grid.innerHTML = "";
  lessons.forEach((lesson, index) => grid.appendChild(createCard(lesson, index)));
  empty.hidden = lessons.length > 0;
}
grid?.addEventListener("click", (event) => { const media = event.target.closest(".lesson-media"); if (media) playVideo(media); });
grid?.addEventListener("keydown", (event) => { const media = event.target.closest(".lesson-media"); if (media && ["Enter", " "].includes(event.key)) { event.preventDefault(); playVideo(media); } });
filters?.addEventListener("click", (event) => { const chip = event.target.closest(".chip"); if (!chip) return; filters.querySelector(".active")?.classList.remove("active"); chip.classList.add("active"); render(chip.dataset.subject); });
const initial = new URLSearchParams(location.search).get("subject");
const initialChip = initial && filters?.querySelector(`[data-subject="${initial}"]`);
if (initialChip) { filters.querySelector(".active").classList.remove("active"); initialChip.classList.add("active"); render(initial); } else render("all");
