/* ===========================================================
   COS SEAL — interaction layer (vanilla JS, no deps)
   - sticky header state on scroll
   - scroll-reveal via IntersectionObserver
   - mobile menu toggle
   - active nav link highlight
   - back-to-top button
   =========================================================== */
(function () {
  'use strict';

  var header = document.getElementById('site-header');
  var toggle = document.getElementById('nav-toggle');
  var menu = document.getElementById('mobile-menu');
  var toTop = document.getElementById('to-top');
  var progressBar = document.getElementById('scroll-progress-bar');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- sticky header + scroll progress ---- */
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('scrolled', y > 24);
    if (toTop) toTop.classList.toggle('show', y > 600);
    if (progressBar) {
      var doc = document.documentElement;
      var max = (doc.scrollHeight - doc.clientHeight) || 1;
      progressBar.style.width = Math.min(100, (y / max) * 100) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- mobile menu (with keyboard focus management) ---- */
  function menuItems() {
    return menu ? Array.prototype.slice.call(menu.querySelectorAll('a, button')) : [];
  }
  function setMenu(open) {
    if (!menu || !toggle) return;
    if (open) menu.hidden = false;
    // allow display before transition
    requestAnimationFrame(function () {
      menu.classList.toggle('open', open);
    });
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-locked', open);
    if (open) {
      var first = menuItems()[0];
      if (first) requestAnimationFrame(function () { first.focus(); });
    } else {
      // restore focus to the toggle when closing
      toggle.focus();
      // hide after transition
      setTimeout(function () {
        if (!menu.classList.contains('open')) menu.hidden = true;
      }, 300);
    }
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      setMenu(!menu.classList.contains('open'));
    });
  }
  if (menu) {
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    // Escape closes; Tab traps focus within the open menu
    menu.addEventListener('keydown', function (e) {
      if (!menu.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); setMenu(false); return; }
      if (e.key === 'Tab') {
        var items = menuItems();
        if (!items.length) return;
        var firstEl = items[0], lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    });
  }

  /* ---- smooth-scroll with header offset (native + JS fallback) ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var headerH = header ? header.offsetHeight : 76;
      var top = target.getBoundingClientRect().top + window.scrollY - (headerH + 12);
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ---- scroll reveal ---- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    // stagger siblings within a group for a nicer cascade
    revealEls.forEach(function (el, i) {
      var delay = el.dataset.delay;
      if (delay == null) {
        var siblings = el.parentElement
          ? el.parentElement.querySelectorAll(':scope > .reveal')
          : [];
        var idx = Array.prototype.indexOf.call(siblings, el);
        el.style.setProperty('--reveal-delay', (Math.max(idx, 0) * 80) + 'ms');
      } else {
        el.style.setProperty('--reveal-delay', delay + 'ms');
      }
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---- count-up for hero stats (tabular-nums prevents jitter) ---- */
  function countUp(el) {
    var target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = String(target); return; }
    var dur = 1100, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = String(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counts = document.querySelectorAll('.count');
  if ('IntersectionObserver' in window && counts.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counts.forEach(function (el) { cio.observe(el); });
  } else {
    counts.forEach(function (el) { el.textContent = el.dataset.count || '0'; });
  }

  /* ---- active nav highlight via section observation ---- */
  var navLinks = document.querySelectorAll('.nav-links a');
  var sections = [];
  navLinks.forEach(function (a) {
    var sec = document.querySelector(a.getAttribute('href'));
    if (sec) sections.push({ id: a.getAttribute('href'), el: sec, link: a });
  });
  if ('IntersectionObserver' in window && sections.length) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.remove('active'); });
          var match = sections.find(function (s) { return s.el === entry.target; });
          if (match) match.link.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navIO.observe(s.el); });
  }

  /* ---- KakaoTalk consult buttons ----
     Replace KAKAO_CHANNEL_URL with the real KakaoTalk channel URL
     (e.g. "http://pf.kakao.com/_xxxxx"). Until then, buttons fall back
     to the contact section / email.                                   */
  var KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_ysqxjX'; // 카카오톡 채널
  document.querySelectorAll('[data-kakao]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      if (KAKAO_CHANNEL_URL) {
        e.preventDefault();
        window.open(KAKAO_CHANNEL_URL, '_blank', 'noopener');
      }
      // else: anchors to #contact (default href) — no action needed
    });
  });

  /* ---- footer year safety (kept static 2026 per brand, but guard) ---- */
})();
