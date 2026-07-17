(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const html = document.documentElement;

  /* ---------- intro / opening sequence ---------- */
  const intro = document.getElementById("intro");
  let introDone = false;

  function finishIntro() {
    if (introDone) return;
    introDone = true;
    intro.classList.add("is-done");
    document.body.classList.remove("lock-scroll");
    html.classList.remove("lock-scroll");
    window.setTimeout(() => {
      intro.style.display = "none";
    }, 1200);
  }

  if (reduceMotion) {
    finishIntro();
  } else {
    intro.addEventListener("click", finishIntro);
    window.setTimeout(finishIntro, 2600);
  }

  /* ---------- progress bar ---------- */
  const progressEl = document.getElementById("progress");
  function updateProgress() {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (scrolled / max) * 100 : 0;
    progressEl.style.width = pct + "%";
  }

  /* ---------- reveal on scroll — replays both scrolling down and back up ---------- */
  const revealEls = document.querySelectorAll(".reveal, .reveal-scale");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-in", entry.isIntersecting);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  /* ---------- side rail: build + sync active state ---------- */
  const rail = document.getElementById("rail");
  const railDots = Array.from(document.querySelectorAll(".rail__dot"));
  const trackedSections = railDots
    .map((dot) => ({ dot, el: document.getElementById(dot.dataset.target), accent: dot.dataset.accent }))
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

  const NEUTRAL_ACCENT = "#8f8f8f";

  const sectionActive = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const match = trackedSections.find((s) => s.el === entry.target);
        if (!match) return;
        railDots.forEach((d) => d.classList.remove("is-active"));
        match.dot.classList.add("is-active");
        html.style.setProperty("--live-accent", match.accent || NEUTRAL_ACCENT);
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

  /* ---------- nav: hide on scroll down, reveal on scroll up ---------- */
  const navEl = document.getElementById("nav");
  let lastY = window.scrollY;

  function updateNav(y) {
    if (y < 90) {
      navEl.classList.remove("nav--hidden");
    } else if (y > lastY + 4) {
      navEl.classList.add("nav--hidden");
    } else if (y < lastY - 4) {
      navEl.classList.remove("nav--hidden");
    }
    lastY = y;
  }

  /* ---------- layered scroll motion: bg parallax + scale breathe + counter-drift on text ---------- */
  const scenes = Array.from(document.querySelectorAll(".scene, .collection"));
  let ticking = false;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function applyMotion() {
    const vh = window.innerHeight;

    scenes.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - vh / 2;
      const normalized = clamp(center / vh, -1, 1); // -1..1, 0 = centered
      const closeness = 1 - Math.abs(normalized); // 0..1, 1 = centered

      const bg = section.querySelector(".scene__bg, .collection__bg");
      if (bg) {
        const offset = normalized * 30;
        const scale = 1 + closeness * 0.06;
        bg.style.transform = `translate3d(0, ${offset}px, 0) scale(${scale})`;
      }

      const frame = section.querySelector(".scene__frame, .collection__content");
      if (frame) {
        frame.style.transform = `translate3d(0, ${normalized * -14}px, 0)`;
      }

      const card = section.querySelector(".detail-card");
      if (card) {
        card.style.transform =
          window.innerWidth > 760 ? `rotate(${2.5 + normalized * 4}deg) translate3d(0, ${normalized * 18}px, 0)` : "";
      }
    });

    ticking = false;
  }

  function onScroll() {
    const y = window.scrollY;
    updateProgress();
    updateNav(y);
    if (!reduceMotion) {
      if (!ticking) {
        window.requestAnimationFrame(applyMotion);
        ticking = true;
      }
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    if (!reduceMotion) applyMotion();
  });

  updateProgress();
  if (!reduceMotion) applyMotion();
})();
