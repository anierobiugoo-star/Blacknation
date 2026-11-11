/**
 * app.js
 * Application entry point: global event listeners, page routing/init,
 * and the shared logout action. Page-specific logic (auth, dashboard)
 * lives in its own module; this file wires up whichever page is loaded.
 */

import { debounce } from './utils.js?v=5';
import { initLoginForm, initRegisterForm, redirectIfAuthenticated, requireAuth, logout } from './auth.js?v=5';
import { initDashboard } from './dashboard.js?v=5';

const PAGE = document.body.dataset.page;

/* ==========================================================================
   Global: button ripple effect (works on every .btn on every page)
   ========================================================================== */
function initRippleEffect() {
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.btn');
    if (!btn) return;

    const ripple = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

/* ==========================================================================
   Landing page: sticky navbar shrink-on-scroll
   ========================================================================== */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const applyState = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 24);
  };
  applyState();
  window.addEventListener('scroll', debounce(applyState, 10));
}

/* ==========================================================================
   Landing page: mobile nav toggle
   ========================================================================== */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    links.classList.toggle('open');
  });

  links.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      links.classList.remove('open');
    });
  });
}

/* ==========================================================================
   Landing page: scroll-reveal animations via IntersectionObserver
   ========================================================================== */
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!revealEls.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  revealEls.forEach((el) => observer.observe(el));
}

/* ==========================================================================
   Landing page: FAQ accordion
   ========================================================================== */
function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach((item) => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      items.forEach((other) => other.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

/* ==========================================================================
   Landing page: signature focus ring — a real, running countdown preview
   (25:00 Pomodoro ring) that ties the hero visual to the actual product
   feature rather than an abstract decoration.
   ========================================================================== */
function initHeroFocusRing() {
  const ring = document.querySelector('.focus-ring-progress');
  const timeLabel = document.querySelector('.focus-ring-time');
  if (!ring || !timeLabel) return;

  const RADIUS = Number(ring.getAttribute('r'));
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  ring.style.strokeDasharray = `${CIRCUMFERENCE}`;

  const TOTAL_SECONDS = 25 * 60;
  let secondsElapsed = 0;

  function render() {
    const remaining = TOTAL_SECONDS - secondsElapsed;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timeLabel.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const progress = secondsElapsed / TOTAL_SECONDS;
    const offset = CIRCUMFERENCE * (1 - progress);
    ring.style.strokeDashoffset = `${offset}`;
  }

  render();

  // Advance the demo ring once per second, sped up ~30x so a visitor
  // actually sees the ring move without waiting 25 real minutes.
  setInterval(() => {
    secondsElapsed = (secondsElapsed + 18) % TOTAL_SECONDS;
    render();
  }, 1000);
}

/* ==========================================================================
   Page router
   ========================================================================== */
function init() {
  initRippleEffect();

  if (PAGE === 'landing') {
    initNavbarScroll();
    initMobileNav();
    initScrollReveal();
    initFaqAccordion();
    initHeroFocusRing();
  }

  if (PAGE === 'login') {
    redirectIfAuthenticated();
    initLoginForm();
  }

  if (PAGE === 'register') {
    redirectIfAuthenticated();
    initRegisterForm();
  }

  if (PAGE === 'dashboard') {
    requireAuth();
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    initDashboard();
  }
}

document.addEventListener('DOMContentLoaded', init);
