/* armghanahmad.com
   Reveals, sliding rows, photo loading, and a scroll-motion fallback. No dependencies. */
(function () {
  'use strict';
  var root = document.querySelector('.cl');
  if (!root) return;
  root.setAttribute('data-js', '1');

  /* Add ?debug to the address to see what this browser reports. For fault finding only. */
  if (/[?&]debug\b/.test(window.location.search)) {
    var box = document.createElement('pre');
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;margin:0;padding:12px;background:#fff;color:#000;font:12px/1.45 monospace;white-space:pre-wrap;word-break:break-word;border:2px solid #b5122f;max-height:70vh;overflow:auto';
    box.textContent = 'checking...';
    document.body.appendChild(box);
    var faults = [];
    window.addEventListener('error', function (e) { faults.push(e.message + ' @' + (e.lineno || '?')); });
    var mm = function (q) { try { return String(window.matchMedia(q).matches); } catch (e) { return 'error'; } };
    var sup = function (d) { try { return String(CSS.supports(d)); } catch (e) { return 'error'; } };
    window.setTimeout(function () {
      var el = document.querySelector('.chr, .ln > span');
      var cs = el ? window.getComputedStyle(el) : null;
      box.textContent = [
        'reduce motion: ' + mm('(prefers-reduced-motion: reduce)'),
        'scroll-driven css: ' + sup('animation-timeline: view()'),
        'observer: ' + ('IntersectionObserver' in window),
        'data-js: ' + root.getAttribute('data-js') + ' / data-sl: ' + root.getAttribute('data-sl'),
        'root class: ' + root.className,
        'first animation: ' + (cs ? cs.animationName + ' ' + cs.animationDuration + ' ' + cs.animationPlayState : 'none found'),
        'animations on page: ' + (document.getAnimations ? document.getAnimations().length : 'n/a'),
        'revealed: ' + root.querySelectorAll('.in').length,
        'window: ' + window.innerWidth + 'x' + window.innerHeight + ' / page: ' + document.documentElement.scrollHeight,
        'faults: ' + (faults.join(' | ') || 'none'),
        window.navigator.userAgent
      ].join('\n');
    }, 3000);
  }

  var each = function (list, fn) { for (var i = 0; i < list.length; i++) fn(list[i], i); };
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* 1. How far each sliding row runs past its frame. The stylesheet reads it as --over. */
  var rows = root.querySelectorAll('.gal .strip');
  function measure() {
    each(rows, function (row) {
      var track = row.firstElementChild;
      if (track) row.style.setProperty('--over', Math.max(0, track.scrollWidth - row.clientWidth) + 'px');
    });
  }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  /* 2. Reveal sections as they enter. If the page cannot scroll, show everything. */
  var targets = root.querySelectorAll('.rv, .up, .lt, .sr, .gal .strip');
  var noScroll = window.innerHeight >= document.documentElement.scrollHeight - 8;
  if ('IntersectionObserver' in window && !noScroll) {
    var io = new IntersectionObserver(function (entries) {
      each(entries, function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0.04 });
    each(targets, function (t) { io.observe(t); });
  } else {
    each(targets, function (t) { t.classList.add('in'); });
  }

  /* 2b. The shelf of volumes: point at one, or tap it, to open its first lines.
         The words ink in the first time the passage is seen, and on each change. */
  var vols = root.querySelectorAll('.vol');
  var pas = root.querySelectorAll('.pas');
  var read = root.querySelector('.read');
  if (vols.length && vols.length === pas.length && read) {
    var cur = 0, seen = false;
    var ink = function (i) { pas[i].classList.remove('go'); void pas[i].offsetWidth; pas[i].classList.add('go'); };
    var open = function (i) {
      if (i === cur) return;
      cur = i;
      each(vols, function (v, k) {
        v.classList.toggle('on', k === i);
        v.setAttribute('aria-pressed', k === i ? 'true' : 'false');
        pas[k].classList.toggle('on', k === i);
        pas[k].classList.remove('go');
      });
      if (seen) ink(i);
    };
    each(vols, function (v, i) {
      v.addEventListener('mouseenter', function () { open(i); });
      v.addEventListener('focus', function () { open(i); });
      v.addEventListener('click', function () { open(i); });
    });
    /* the two round buttons move the shelf toward older or newer volumes */
    var wrap = root.querySelector('.shelf-wrap');
    var prev = root.querySelector('.sn-prev');
    var next = root.querySelector('.sn-next');
    if (wrap && prev && next) {
      var ends = function () {
        prev.disabled = wrap.scrollLeft < 4;
        next.disabled = wrap.scrollLeft + wrap.clientWidth > wrap.scrollWidth - 4;
      };
      var move = function (dir) {
        wrap.scrollBy({ left: dir * wrap.clientWidth * 0.72, behavior: reduce ? 'auto' : 'smooth' });
      };
      prev.addEventListener('click', function () { move(-1); });
      next.addEventListener('click', function () { move(1); });
      wrap.addEventListener('scroll', ends, { passive: true });
      window.addEventListener('resize', ends);
      ends();
    }
    if ('IntersectionObserver' in window && !noScroll) {
      var ro = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { seen = true; ink(cur); ro.disconnect(); }
      }, { threshold: 0.35 });
      ro.observe(read);
    } else {
      seen = true;
      pas[cur].classList.add('go');
    }
  }

  /* 2c. The questions on the Work page: one at a time, each inking in word by word. */
  var qs = root.querySelectorAll('.q1 .q');
  var qbox = root.querySelector('.q1');
  if (qs.length && qbox) {
    var qi = 0, qt = null;
    var nextQ = function () {
      var old = qs[qi];
      old.classList.add('out');
      window.setTimeout(function () {
        old.classList.remove('on', 'go', 'out');
        qi = (qi + 1) % qs.length;
        qs[qi].classList.add('on');
        void qs[qi].offsetWidth;
        qs[qi].classList.add('go');
      }, 450);
    };
    var startQ = function () {
      if (qt) return;
      qs[0].classList.add('go');
      qt = window.setInterval(nextQ, 4200);
    };
    if (!reduce) {
      if ('IntersectionObserver' in window && !noScroll) {
        var qo = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { startQ(); qo.disconnect(); }
        }, { threshold: 0.5 });
        qo.observe(qbox);
      } else {
        startQ();
      }
    }
  }

  /* 3. Load a whole row of photographs shortly before it arrives. */
  var series = root.querySelectorAll('.gal .strip');
  if (series.length && 'IntersectionObserver' in window) {
    var pre = new IntersectionObserver(function (entries) {
      each(entries, function (e) {
        if (!e.isIntersecting) return;
        each(e.target.querySelectorAll('img[loading="lazy"]'), function (img) { img.loading = 'eager'; });
        pre.unobserve(e.target);
      });
    }, { rootMargin: '1400px 0px' });
    each(series, function (s) { pre.observe(s); });
  }

  /* 4. Scroll-linked motion for browsers without CSS scroll-driven animations.
        Each linked element gets --p, its progress from 0 to 1 through the viewport.
        Add ?sl=js to the address to force this path in any browser. */
  var native = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  var forced = /[?&]sl=js\b/.test(window.location.search);
  if (reduce || (native && !forced)) return;
  root.setAttribute('data-sl', 'js');

  var linked = [];
  function link(selector, from, to, box) {
    each(root.querySelectorAll(selector), function (el) {
      linked.push({ el: el, box: box ? el.parentElement : el, from: from, to: to });
    });
  }
  link('.st', 0, 1);                 /* the statement inks in */
  link('.px', 0, 1, true);           /* the tall photograph drifts; measured on its frame */
  link('.gal .strip', 0.12, 0.88);   /* photo strips slide */
  if (!linked.length) return;

  var queued = false;
  function update() {
    queued = false;
    var vh = window.innerHeight;
    each(linked, function (l) {
      var r = l.box.getBoundingClientRect();
      var p = ((vh - r.top) / (vh + r.height) - l.from) / (l.to - l.from);
      l.el.style.setProperty('--p', p <= 0 ? '0' : p >= 1 ? '1' : p.toFixed(4));
    });
  }
  function queue() {
    if (!queued) { queued = true; window.requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('load', queue);
  update();
})();
