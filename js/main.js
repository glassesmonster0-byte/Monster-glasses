(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- progress bar ---------- */
  const progressEl = document.getElementById("progress");
  function updateProgress() {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (scrolled / max) * 100 : 0;
    progressEl.style.width = pct + "%";
  }

  /* ---------- reveal on scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal, .reveal-scale");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  /* ---------- side rail: build + sync active state ---------- */
  const rail = document.getElementById("rail");
  const railDots = Array.from(document.querySelectorAll(".rail__dot"));
  const trackedSections = railDots
    .map((dot) => ({ dot, el: document.getElementById(dot.dataset.target) }))
    .filter((s) => s.el);

  railDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const target = document.getElementById(dot.dataset.target);
      if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
    if (dot.dataset.accent) {
      dot.style.setProperty("--dot-accent", dot.dataset.accent);
    }
  });

  // reveal the rail once the hero has been scrolled past
  const heroEl = document.getElementById("hero");
  if (heroEl) {
    const railVisibility = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          rail.classList.toggle("is-visible", !entry.isIntersecting);
        });
      },
      { threshold: 0.15 }
    );
    railVisibility.observe(heroEl);
  }

  const sectionActive = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const match = trackedSections.find((s) => s.el === entry.target);
        if (!match) return;
        railDots.forEach((d) => d.classList.remove("is-active"));
        match.dot.classList.add("is-active");
      });
    },
    { threshold: 0.5 }
  );
  trackedSections.forEach((s) => sectionActive.observe(s.el));

  /* ---------- swatch buttons in finale grid ---------- */
  document.querySelectorAll(".swatches button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  /* ---------- subtle parallax on scene backgrounds ---------- */
  const scenes = Array.from(document.querySelectorAll(".scene__bg, .collection__bg"));
  let ticking = false;

  function applyParallax() {
    const vh = window.innerHeight;
    scenes.forEach((layer) => {
      const rect = layer.parentElement.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - vh / 2;
      const offset = Math.max(-1, Math.min(1, center / vh)) * 26; // px
      layer.style.transform = `translate3d(0, ${offset}px, 0)`;
    });
    ticking = false;
  }

  function onScroll() {
    updateProgress();
    if (!reduceMotion) {
      if (!ticking) {
        window.requestAnimationFrame(applyParallax);
        ticking = true;
      }
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    if (!reduceMotion) applyParallax();
  });

  updateProgress();
  if (!reduceMotion) applyParallax();
})();
