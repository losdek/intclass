/* Общие интерактивные элементы: шапка, анимации и необязательный профиль. */
const nav = document.getElementById("nav");
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
const modal = document.getElementById("registerModal");
const form = document.getElementById("registerForm");
const status = document.getElementById("formStatus");

window.addEventListener("scroll", () => nav?.classList.toggle("scrolled", window.scrollY > 12), { passive: true });

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
