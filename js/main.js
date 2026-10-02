/**
 * intclass — Main Script
 * Butter-smooth interactions, instant reveals, and reliable mobile drawer.
 */

// 1. Path Normalization for GitHub Pages
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

// Create Backdrop for Mobile Menu if not already in HTML
let navBackdrop = document.querySelector(".nav-backdrop");
if (!navBackdrop) {
  navBackdrop = document.createElement("div");
  navBackdrop.className = "nav-backdrop";
  document.body.appendChild(navBackdrop);
}

// 2. High-performance Nav Scroll Listener
let scrollScheduled = false;
window.addEventListener(
  "scroll",
  () => {
    if (!scrollScheduled) {
      window.requestAnimationFrame(() => {
        nav?.classList.toggle("scrolled", window.scrollY > 15);
        scrollScheduled = false;
      });
      scrollScheduled = true;
    }
  },
  { passive: true }
);

// 3. Smooth Mobile Drawer Toggle
function toggleMenu(open) {
  const shouldOpen = typeof open === "boolean" ? open : !burger?.classList.contains("open");
  burger?.classList.toggle("open", shouldOpen);
  navLinks?.classList.toggle("open", shouldOpen);
  navBackdrop?.classList.toggle("open", shouldOpen);
  burger?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

burger?.addEventListener("click", () => toggleMenu());
navBackdrop?.addEventListener("click", () => toggleMenu(false));

// Close mobile menu when clicking a link
navLinks?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    toggleMenu(false);
  }
});

// Close mobile menu on Escape key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && burger?.classList.contains("open")) {
    toggleMenu(false);
  }
});

// 4. Smooth, Non-Laggy Reveal Observer
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
);

document.querySelectorAll(".reveal").forEach((el) => {
  // If element is already above or within the fold on load, make visible immediately
  const rect = el.getBoundingClientRect();
  if (rect.top < window.innerHeight) {
    el.classList.add("visible");
  } else {
    revealObserver.observe(el);
  }
});

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
  setTimeout(() => form?.elements.name?.focus(), 50);
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
  }, 1000);
});
