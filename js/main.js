/* intclass — shared interactions */

// Nav: subtle border when scrolled
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY >8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Mobile menu
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
if (burger && navLinks) {
 burger.addEventListener("click", () => {
 burger.classList.toggle("open");
 navLinks.classList.toggle("open");
 });
 navLinks.addEventListener("click", (e) => {
 if (e.target.closest("a")) {
 burger.classList.remove("open");
 navLinks.classList.remove("open");
 }
 });
}

// Scroll-reveal with a gentle stagger between siblings
const revealObserver = new IntersectionObserver(
 (entries) => {
 entries.forEach((entry) => {
 if (!entry.isIntersecting) return;
 const el = entry.target;
 const siblings = [...el.parentElement.children].filter((c) =>
 c.classList.contains("reveal")
 );
 const index = siblings.indexOf(el);
 el.style.transitionDelay = `${Math.min(index *90,450)}ms`;
 el.classList.add("visible");
 revealObserver.unobserve(el);
 });
 },
 { threshold:0.12, rootMargin: "0px0px-40px0px" }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
