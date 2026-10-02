/**
 * intclass — Main Script
 * Handles navigation, mobile menu, scroll reveals, and profile cookie management.
 */

// 1. Clean Path Normalization for GitHub Pages
(function normalizePath() {
  const cleanPath = location.pathname.replace(/(?:index|lessons)\.html$/, (match) =>
    match.startsWith("index") ? "" : "lessons/"
  );
  if (cleanPath !== location.pathname) {
    location.replace(cleanPath + location.search + location.hash);
  }
})();

// DOM Elements
const nav = document.getElementById("nav");
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
const modal = document.getElementById("registerModal");
const form = document.getElementById("registerForm");
const status = document.getElementById("formStatus");

// 2. Navigation Scroll State
let scrollTicking = false;
window.addEventListener("scroll", () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(() => {
      nav?.classList.toggle("scrolled", window.scrollY > 20);
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

// 3. Mobile Navigation Drawer
burger?.addEventListener("click", () => {
  const isOpen = burger.classList.toggle("open");
  navLinks?.classList.toggle("open", isOpen);
  burger.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("menu-open", isOpen);
});

// Close mobile menu when clicking a link or clicking outside
document.addEventListener("click", (event) => {
  if (navLinks?.classList.contains("open")) {
    if (event.target.closest(".nav-link") || (!event.target.closest("#navLinks") && !event.target.closest("#burger"))) {
      burger?.classList.remove("open");
      navLinks.classList.remove("open");
      burger?.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }
  }
});

// 4. Scroll Reveal via IntersectionObserver
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const siblings = [...(el.parentElement?.children || [])].filter((item) =>
      item.classList.contains("reveal")
    );
    const index = Math.max(siblings.indexOf(el), 0);
    el.style.transitionDelay = `${Math.min(index * 80, 400)}ms`;
    el.classList.add("visible");
    revealObserver.unobserve(el);
  });
}, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// 5. Cookie Utilities & Profile Registration Modal
function readCookie(name) {
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1];
}

function openModal() {
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("modal-open");

  const saved = readCookie("intclass_profile");
  if (saved && form) {
    try {
      const profile = JSON.parse(decodeURIComponent(saved));
      if (form.elements.name) form.elements.name.value = profile.name || "";
      if (form.elements.email) form.elements.email.value = profile.email || "";
    } catch {
      /* Ignore corrupted cookie */
    }
  }
  if (form?.elements.name) {
    setTimeout(() => form.elements.name.focus(), 60);
  }
}

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

document.querySelectorAll(".register-open").forEach((btn) => {
  btn.addEventListener("click", openModal);
});

modal?.querySelector(".modal-close")?.addEventListener("click", closeModal);
modal?.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal && !modal.hidden) {
    closeModal();
  }
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const nameInput = form.elements.name;
  const emailInput = form.elements.email;
  const submitBtn = form.querySelector("button[type='submit']");

  const profile = {
    name: nameInput?.value.trim() || "",
    email: emailInput?.value.trim() || ""
  };

  document.cookie = `intclass_profile=${encodeURIComponent(
    JSON.stringify(profile)
  )}; max-age=31536000; path=/; SameSite=Lax`;

  if (status) {
    status.textContent = `Профиль сохранён, ${profile.name || "друг"}!`;
  }
  if (submitBtn) {
    submitBtn.textContent = "Сохранено ✓";
  }

  setTimeout(() => {
    closeModal();
    if (submitBtn) submitBtn.textContent = "Сохранить профиль";
    if (status) status.textContent = "";
  }, 1100);
});
