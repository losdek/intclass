/* intclass — video lessons library
 * ---------------------------------------------------------
 * HOW TO ADD YOUR OWN LESSONS:
 * Copy an entry below and replace:
 * - videoId: the part after "watch?v=" in a YouTube URL
 * e.g. https://www.youtube.com/watch?v=WUvTyaaNkzM -> "WUvTyaaNkzM"
 * - subject: math | physics | chemistry | biology | history | english
 * --------------------------------------------------------- */

const LESSONS = [
 {
 title: "The Essence of Calculus",
 description: "What calculus is really about — a visual introduction.",
 subject: "math",
 videoId: "WUvTyaaNkzM",
 },
 {
 title: "Vectors — Essence of Linear Algebra",
 description: "The building block of linear algebra, explained visually.",
 subject: "math",
 videoId: "fNk_zzaMoSs",
 },
 {
 title: "The Fourier Transform",
 description: "A visual introduction to the math behind waves and sound.",
 subject: "physics",
 videoId: "spUNpyF58BY",
 },
 {
 title: "But What Is a Neural Network?",
 description: "The intuition behind the technology shaping modern AI.",
 subject: "math",
 videoId: "aircAruvnKk",
 },
 // Add more lessons here — copy the block above.
];

const SUBJECT_LABELS = {
 math: "Mathematics",
 physics: "Physics",
 chemistry: "Chemistry",
 biology: "Biology",
 history: "History",
 english: "English",
};

const grid = document.getElementById("lessonsGrid");
const emptyMsg = document.getElementById("lessonsEmpty");
const filters = document.getElementById("filters");

function lessonCard(lesson, index) {
 const card = document.createElement("article");
 card.className = "lesson-card";
 card.style.animationDelay = `${index *80}ms`;
 card.innerHTML = `
 <div class="lesson-media" data-video="${lesson.videoId}" role="button"
 tabindex="0" aria-label="Play: ${lesson.title}">
 <img src="https://i.ytimg.com/vi/${lesson.videoId}/hqdefault.jpg"
 alt="" loading="lazy" />
 <span class="play-badge" aria-hidden="true"></span>
 </div>
 <div class="lesson-body">
 <span class="lesson-subject">${SUBJECT_LABELS[lesson.subject] || lesson.subject}</span>
 <h3>${lesson.title}</h3>
 <p>${lesson.description}</p>
 </div>
 `;
 return card;
}

// Lazy-load the real YouTube iframe only on click (fast page, no tracking until played)
grid.addEventListener("click", (e) => {
 const media = e.target.closest(".lesson-media");
 if (media) playVideo(media);
});
grid.addEventListener("keydown", (e) => {
 if (e.key !== "Enter" && e.key !== " ") return;
 const media = e.target.closest(".lesson-media");
 if (media) {
 e.preventDefault();
 playVideo(media);
 }
});

function playVideo(media) {
 const id = media.dataset.video;
 media.innerHTML = `
 <iframe
 src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0"
 title="YouTube video player"
 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
 allowfullscreen></iframe>
 `;
 media.style.cursor = "default";
}

function render(subject) {
 const list =
 subject === "all" ? LESSONS : LESSONS.filter((l) => l.subject === subject);
 grid.innerHTML = "";
 list.forEach((lesson, i) => grid.appendChild(lessonCard(lesson, i)));
 emptyMsg.hidden = list.length >0;
}

// Filter chips
filters.addEventListener("click", (e) => {
 const chip = e.target.closest(".chip");
 if (!chip) return;
 filters.querySelector(".active").classList.remove("active");
 chip.classList.add("active");
 render(chip.dataset.subject);
});

// Deep link: lessons.html?subject=math
const params = new URLSearchParams(location.search);
const initial = params.get("subject");
if (initial && filters.querySelector(`[data-subject="${initial}"]`)) {
 filters.querySelector(".active").classList.remove("active");
 filters.querySelector(`[data-subject="${initial}"]`).classList.add("active");
 render(initial);
} else {
 render("all");
}
