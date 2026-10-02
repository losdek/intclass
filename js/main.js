const cleanPath = location.pathname.replace(/(?:index|lessons)\.html$/, (match) => match.startsWith("index") ? "" : "lessons/");
if (cleanPath !== location.pathname) location.replace(cleanPath + location.search + location.hash);
const nav = document.getElementById("nav");
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
const modal = document.getElementById("registerModal");
const form = document.getElementById("registerForm");
const status = document.getElementById("formStatus");

let scrollQueued = false;
window.addEventListener("scroll", () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    nav?.classList.toggle("scrolled", window.scrollY > 12);
    scrollQueued = false;
  });
}, { passive: true });

burger?.addEventListener("click", () => {
  const open = burger.classList.toggle("open");
  navLinks.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
});
navLinks?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    burger?.classList.remove("open");
    navLinks.classList.remove("open");
    burger?.setAttribute("aria-expanded", "false");
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const element = entry.target;
    const siblings = [...element.parentElement.children].filter((item) => item.classList.contains("reveal"));
    element.style.transitionDelay = `${Math.min(Math.max(siblings.indexOf(element), 0) * 90, 420)}ms`;
    element.classList.add("visible");
    observer.unobserve(element);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

function readCookie(name) {
  return document.cookie.split("; ").find((part) => part.startsWith(`${name}=`))?.split("=")[1];
}
function openModal() {
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const saved = readCookie("intclass_profile");
  if (saved && form) {
    try {
      const profile = JSON.parse(decodeURIComponent(saved));
      form.elements.name.value = profile.name || "";
      form.elements.email.value = profile.email || "";
    } catch { /* Invalid local cookie can be ignored. */ }
  }
  form?.elements.name.focus();
}
function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}
document.querySelectorAll(".register-open").forEach((button) => button.addEventListener("click", openModal));
modal?.querySelector(".modal-close")?.addEventListener("click", closeModal);
modal?.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const profile = { name: form.elements.name.value.trim(), email: form.elements.email.value.trim() };
  document.cookie = `intclass_profile=${encodeURIComponent(JSON.stringify(profile))}; max-age=31536000; path=/; SameSite=Lax`;
  status.textContent = `Профиль сохранён, ${profile.name}!`;
  form.querySelector("button").textContent = "Сохранено";
  setTimeout(closeModal, 1200);
});

const pressable = ".subject-card, .card, .grade-guide-item, .btn, .nav-link, .modal-close, .choice-card, .topic-chip, .quiz-option-label, .quiz-unlock-btn, .quiz-toggle-btn, .quiz-check-btn, .quiz-retry-btn, .reset-button, .lesson-media";
function addRipple(target, event) {
  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.35;
  const ripple = document.createElement("span");
  ripple.className = "press-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${(event.clientX || rect.left + rect.width / 2) - rect.left - size / 2}px`;
  ripple.style.top = `${(event.clientY || rect.top + rect.height / 2) - rect.top - size / 2}px`;
  target.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
}
function pressOn(event) {
  const target = event.target.closest(pressable);
  if (!target) return;
  target.classList.add("is-pressed");
  clearTimeout(target.pressTimer);
  addRipple(target, event);
}
function pressOff(event) {
  const target = event.target.closest(pressable);
  if (!target) return;
  clearTimeout(target.pressTimer);
  target.pressTimer = setTimeout(() => target.classList.remove("is-pressed"), 170);
}
document.addEventListener("pointerdown", pressOn);
document.addEventListener("pointerup", pressOff);
document.addEventListener("pointercancel", pressOff);
document.addEventListener("pointerleave", pressOff);

document.addEventListener("keydown", (event) => {
  if (!['Enter', ' '].includes(event.key)) return;
  const target = event.target.closest(pressable);
  if (!target || event.repeat) return;
  target.classList.add("is-pressed");
  clearTimeout(target.pressTimer);
  addRipple(target, { clientX: target.getBoundingClientRect().left + target.offsetWidth / 2, clientY: target.getBoundingClientRect().top + target.offsetHeight / 2 });
});
document.addEventListener("keyup", (event) => {
  if (!['Enter', ' '].includes(event.key)) return;
  const target = event.target.closest(pressable);
  if (target) pressOff({ target });
});
