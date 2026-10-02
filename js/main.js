/**
 * intclass — Main Script (Mobile-First Interactive Header & Controls)
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
const navBackdrop = document.getElementById("navBackdrop");
const scrollProgressBar = document.getElementById("scrollProgressBar");
const modal = document.getElementById("registerModal");
const form = document.getElementById("registerForm");
const status = document.getElementById("formStatus");
const headerProfileDot = document.getElementById("headerProfileDot");
const navUserGreeting = document.getElementById("navUserGreeting");

// 2. Cookie Utilities
function readCookie(name) {
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1];
}

// Update profile badge and greeting in header & mobile drawer
function updateProfileUI() {
  const saved = readCookie("intclass_profile");
  if (saved) {
    try {
      const profile = JSON.parse(decodeURIComponent(saved));
      if (profile.name) {
        if (headerProfileDot) headerProfileDot.hidden = false;
        if (navUserGreeting) navUserGreeting.textContent = `Привет, ${profile.name}!`;
        document.querySelectorAll(".mobile-btn-text").forEach((el) => {
          el.textContent = `Профиль: ${profile.name}`;
        });
        return profile;
      }
    } catch {}
  }
  if (headerProfileDot) headerProfileDot.hidden = true;
  if (navUserGreeting) navUserGreeting.textContent = "Привет, друг!";
  return null;
}

updateProfileUI();

// 3. High-performance Nav Scroll & Interactive Reading Progress
let scrollScheduled = false;
function onScroll() {
  const scrollY = window.scrollY;
  nav?.classList.toggle("scrolled", scrollY > 15);

  // Dynamic Scroll Progress Bar
  if (scrollProgressBar) {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(Math.max(scrollY / docHeight, 0), 1) : 0;
    scrollProgressBar.style.transform = `scaleX(${progress})`;
  }

  // ScrollSpy on home page
  const sections = document.querySelectorAll("section[id]");
  if (sections.length > 0) {
    let currentId = "";
    sections.forEach((sec) => {
      const top = sec.offsetTop - 120;
      if (scrollY >= top) {
        currentId = sec.getAttribute("id");
      }
    });

    document.querySelectorAll(".nav-link").forEach((link) => {
      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        link.classList.toggle("active", href === `#${currentId}`);
      } else if (href === "./" && !currentId) {
        link.classList.add("active");
      }
    });
  }

  scrollScheduled = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (!scrollScheduled) {
      window.requestAnimationFrame(onScroll);
      scrollScheduled = true;
    }
  },
  { passive: true }
);

// 4. Smooth Mobile Drawer Toggle
function toggleMenu(forceOpen) {
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !burger?.classList.contains("open");
  burger?.classList.toggle("open", shouldOpen);
  navLinks?.classList.toggle("open", shouldOpen);
  navBackdrop?.classList.toggle("open", shouldOpen);
  burger?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

burger?.addEventListener("click", () => toggleMenu());
navBackdrop?.addEventListener("click", () => toggleMenu(false));

// Close mobile drawer when clicking any link
navLinks?.addEventListener("click", (event) => {
  if (event.target.closest("a") || event.target.closest(".register-open")) {
    toggleMenu(false);
  }
});

// Close mobile menu on Escape key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && burger?.classList.contains("open")) {
    toggleMenu(false);
  }
});

// 5. Scroll Reveal Observer (Immediate above fold)
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
  const rect = el.getBoundingClientRect();
  if (rect.top < window.innerHeight) {
    el.classList.add("visible");
  } else {
    revealObserver.observe(el);
  }
});

// 6. Profile Modal (Native Bottom Sheet on Mobile)
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
    } catch {}
  }
  setTimeout(() => form?.elements.name?.focus(), 60);
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

  updateProfileUI();

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
  }, 950);
});
