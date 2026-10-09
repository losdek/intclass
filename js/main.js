/**
 * intclass — Main Script (Mobile-First Native UI, Theming & Controls)
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

// iOS Safari :active pseudo-class enabler & touch feedback
document.addEventListener("touchstart", () => {}, { passive: true });

// Mobile light haptics on physical tap if supported
document.addEventListener(
  "click",
  (event) => {
    if (
      event.target.closest(
        "button, .btn, .chip, .bottom-bar-item, .nav-toggle, .subject-card, .guide-topic-card, .theme-toggle-btn"
      )
    ) {
      if (typeof navigator.vibrate === "function") {
        try {
          navigator.vibrate(10);
        } catch {}
      }
    }
  },
  { passive: true }
);

// 2. Theme Management (Light / Dark with localStorage & System OS detection)
const THEME_STORAGE_KEY = "intclass_theme";
const MOON_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const SUN_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", theme === "dark" ? "#0a0a0b" : "#ffffff");
  }

  // Update all theme toggle buttons
  document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
    btn.setAttribute("aria-label", theme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему");
    btn.setAttribute("title", theme === "dark" ? "Светлая тема" : "Тёмная тема");
    const iconSpan = btn.querySelector(".theme-icon");
    if (iconSpan) {
      iconSpan.innerHTML = theme === "dark" ? SUN_ICON : MOON_ICON;
    }
    const labelSpan = btn.querySelector(".theme-label");
    if (labelSpan) {
      labelSpan.textContent = theme === "dark" ? "Светлая тема" : "Тёмная тема";
    }
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || getPreferredTheme();
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, next);
  applyTheme(next);
  showToast(next === "dark" ? "Тёмная тема включена" : "Светлая тема включена", "info", 1800);
}

// Initialize theme immediately to prevent flashing
applyTheme(getPreferredTheme());

// Listen for OS theme changes if user hasn't set explicit manual preference
if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem(THEME_STORAGE_KEY)) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
}

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

// 3. Cookie & Progress Utilities
function readCookie(name) {
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1];
}

function getCompletedLessonsCount() {
  try {
    const raw = localStorage.getItem("intclass_progress");
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function getBookmarkedLessonsCount() {
  try {
    const raw = localStorage.getItem("intclass_bookmarks");
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

// Update profile badge, greeting, and learning stats in header & mobile drawer
function updateProfileUI() {
  const saved = readCookie("intclass_profile");
  const completedCount = getCompletedLessonsCount();
  const bookmarksCount = getBookmarkedLessonsCount();

  // Profile modal stats element
  const statsElem = document.getElementById("profileStats");
  if (statsElem) {
    statsElem.innerHTML = `
      <div class="profile-stats-grid">
        <div class="profile-stat-box">
          <span class="stat-number">${completedCount}</span>
          <span class="stat-label">Изучено уроков</span>
        </div>
        <div class="profile-stat-box">
          <span class="stat-number">${bookmarksCount}</span>
          <span class="stat-label">В избранном</span>
        </div>
      </div>
    `;
  }

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

  if (headerProfileDot) headerProfileDot.hidden = completedCount === 0;
  if (navUserGreeting) navUserGreeting.textContent = "Привет, друг!";
  return null;
}

updateProfileUI();

// 4. Toast Notification System
function showToast(message, type = "info", duration = 2600) {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "toast-container";
    toastContainer.setAttribute("aria-live", "polite");
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  toastContainer.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => {
    toast.classList.add("visible");
  });

  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => {
      toast.remove();
    }, 280);
  }, duration);
}

// Expose showToast globally
window.showToast = showToast;
window.updateProfileUI = updateProfileUI;

// 5. High-performance Nav Scroll & Interactive Reading Progress
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

    // Sync mobile bottom dock active items
    const homeBottomItem = document.querySelector('.bottom-bar-item[data-nav="home"]');
    const topicsBottomItem = document.querySelector('.bottom-bar-item[data-nav="topics"]');
    if (homeBottomItem && topicsBottomItem) {
      if (currentId === "topics" || currentId === "curriculum" || currentId === "grades") {
        topicsBottomItem.classList.add("active");
        homeBottomItem.classList.remove("active");
      } else {
        homeBottomItem.classList.add("active");
        topicsBottomItem.classList.remove("active");
      }
    }
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

// 6. Smooth Mobile Drawer Toggle
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

// Close mobile drawer when clicking navigation link
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

// 7. Scroll Reveal Observer (Immediate above fold)
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

// 8. Profile Modal (Native Bottom Sheet on Mobile)
function openModal() {
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  updateProfileUI();

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

  showToast(`Профиль сохранён! Привет, ${profile.name || "друг"}!`, "success");

  setTimeout(() => {
    closeModal();
    if (submitBtn) submitBtn.textContent = "Сохранить профиль";
    if (status) status.textContent = "";
  }, 950);
});

// Reset progress button in modal
const resetProgressBtn = document.getElementById("resetProgressBtn");
resetProgressBtn?.addEventListener("click", () => {
  if (confirm("Сбросить историю пройденных уроков и тестов?")) {
    localStorage.removeItem("intclass_progress");
    localStorage.removeItem("intclass_bookmarks");
    updateProfileUI();
    if (typeof window.reloadLessonsProgress === "function") {
      window.reloadLessonsProgress();
    }
    showToast("Прогресс обучения сброшен", "info");
  }
});

// Bind Theme Toggles
document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
  btn.addEventListener("click", toggleTheme);
});

// 9. Register Service Worker for Offline / PWA Support
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  window.addEventListener("load", () => {
    const swPath = location.pathname.includes("/lessons/") ? "../sw.js" : "./sw.js";
    navigator.serviceWorker
      .register(swPath)
      .then((reg) => {
        // SW registered
      })
      .catch(() => {
        // SW registration skipped or failed silently
      });
  });
}
