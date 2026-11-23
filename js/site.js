/* armghanahmad.com
   Reveals, sliding rows, photo loading, the enlarged photograph, and a scroll-motion fallback. No dependencies. */
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

  /* 0. Count each click on a link that leaves the site (LinkedIn, Substack, a client, email).
        The count goes to GoatCounter. When the counter is not on the page, this does nothing. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || !window.goatcounter || !window.goatcounter.count) return;
    var href = a.getAttribute('href') || '';
    var mail = /^mailto:/i.test(href);
    if (!mail && !(/^https?:/i.test(href) && a.host !== window.location.host)) return;
    var name = mail ? 'email' : a.host.replace(/^www\./, '') + (a.pathname.length > 1 ? a.pathname.replace(/\/$/, '') : '');
    var text = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').slice(0, 80);
    window.goatcounter.count({ path: 'click: ' + name, title: text || name, event: true });
  });

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
  /* a sliding row must not scroll by itself, for example when a photograph in it takes focus */
  each(rows, function (row) {
    row.addEventListener('scroll', function () {
      if (row.scrollLeft && window.getComputedStyle(row).overflowX === 'hidden') row.scrollLeft = 0;
    });
  });
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

  /* 3b. A photograph opens large on a click or a tap. Arrow keys, the two round buttons and a swipe
         move to the next one. Escape, Close, the Back button and a click outside close it.
         Without this script each photograph is a plain link to its large file. */
  var shots = root.querySelectorAll('.gal .track a');
  var lb = document.createElement('dialog');
  if (shots.length && typeof lb.showModal === 'function') {
    var arrow = function (d) {
      return '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.4"></path></svg>';
    };
    lb.className = 'lb';
    lb.setAttribute('aria-label', 'Photograph');
    lb.innerHTML = '<div class="lb-bg"></div>' +
      '<div class="lb-top"><span class="lab lb-s"></span><button type="button" class="lab lb-x">Close</button></div>' +
      '<figure class="lb-fig"><img class="lb-img" alt="" decoding="async"></figure>' +
      '<div class="lb-nav"><button type="button" class="lb-a" aria-label="Previous photograph">' + arrow('M13 7 H1 M6 2 L1 7 L6 12') + '</button>' +
      '<button type="button" class="lb-a" aria-label="Next photograph">' + arrow('M1 7 H13 M8 2 L13 7 L8 12') + '</button></div>' +
      '<p class="lb-live" aria-live="polite"></p>';
    root.appendChild(lb);

    var BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    var EASE = 'cubic-bezier(.23,1,.32,1)';
    var bg = lb.querySelector('.lb-bg');
    var big = lb.querySelector('.lb-img');
    big.src = BLANK;
    var ser = lb.querySelector('.lb-s');
    var live = lb.querySelector('.lb-live');
    var turns = lb.querySelectorAll('.lb-a');
    var frame = [lb.querySelector('.lb-top'), lb.querySelector('.lb-nav')];
    var at = 0, turn = 0, pushed = false, popping = false, closing = false, opener = null;
    var motion = !reduce && typeof big.animate === 'function';
    var mouse = !!(window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches);

    var thumb = function (i) { return shots[i].querySelector('img'); };
    var onScreen = function (r) {
      return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    };
    /* the transform that puts the large photograph exactly on the rectangle r */
    var onto = function (r) {
      var b = big.getBoundingClientRect();
      if (!b.width || !b.height) return 'none';
      return 'translate(' + (r.left - b.left).toFixed(2) + 'px,' + (r.top - b.top).toFixed(2) + 'px) scale(' +
        (r.width / b.width).toFixed(5) + ',' + (r.height / b.height).toFixed(5) + ')';
    };
    var settle = function () {
      if (lb.getAnimations) each(lb.getAnimations({ subtree: true }), function (x) { x.cancel(); });
    };
    var warm = function (i) { var n = new Image(); n.src = shots[(i + shots.length) % shots.length].href; };

    var show = function (i, fade) {
      at = (i + shots.length) % shots.length;
      var a = shots[at], th = thumb(at), mine = ++turn;
      var w = +a.getAttribute('data-w') || 1500, h = +a.getAttribute('data-h') || 1000;
      var sec = a.closest ? a.closest('.sr') : null;
      big.style.setProperty('--ar', (w / h).toFixed(5));
      big.style.setProperty('--fw', String(w));
      big.alt = th.alt;
      live.textContent = th.alt;
      ser.textContent = sec ? sec.id.replace(/-/g, ' ') : '';
      if (fade) big.classList.add('sw');
      /* the small copy shows at once when it is already loaded; the large file takes its place */
      big.src = th.complete && th.naturalWidth > 0 ? (th.currentSrc || th.src) : BLANK;
      if (fade) { void big.offsetWidth; big.classList.remove('sw'); }
      var full = new Image();
      var put = function () { if (mine === turn && lb.open && !closing) big.src = full.src; };
      full.src = a.href;
      if (full.decode) full.decode().then(put, put); else full.onload = put;
      window.setTimeout(function () { if (mine === turn && lb.open) { warm(at + 1); warm(at - 1); } }, 300);
    };

    var open = function (i, origin) {
      if (lb.open) return;
      opener = origin || shots[i];
      var r = thumb(i).getBoundingClientRect();
      show(i, false);
      lb.showModal();
      try { window.history.pushState({ photo: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
      if (!motion) return;
      bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
      each(frame, function (f) {
        f.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 140, easing: 'ease-out', fill: 'backwards' });
      });
      /* the photograph grows from its place in the row */
      if (onScreen(r)) big.animate([{ transform: onto(r) }, { transform: 'none' }], { duration: 380, easing: EASE });
      else big.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
    };

    var shut = function () {
      if (!lb.open || closing) return;
      if (!motion) { lb.close(); return; }
      closing = true;
      settle();
      var r = thumb(at).getBoundingClientRect();
      bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'forwards' });
      each(frame, function (f) { f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }); });
      /* it returns to its place in the row when that place is in view */
      var out = onScreen(r)
        ? big.animate([{ transform: 'none' }, { transform: onto(r) }], { duration: 300, easing: EASE, fill: 'forwards' })
        : big.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
      out.onfinish = function () { if (lb.open) lb.close(); };
      window.setTimeout(function () { if (lb.open && closing) lb.close(); }, 600);
    };

    var step = function (d) { if (lb.open && !closing) show(at + d, !reduce); };

    lb.addEventListener('close', function () {
      var back = pushed && !popping;
      closing = false; pushed = false; popping = false; turn++;
      settle();
      big.src = BLANK;
      if (back) window.history.back();
      if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (e) {} }
    });
    lb.addEventListener('cancel', function (e) { e.preventDefault(); shut(); });
    window.addEventListener('popstate', function () { if (lb.open) { popping = true; shut(); } });

    lb.addEventListener('click', function (e) {
      var t = e.target;
      /* outside the photograph closes; with a mouse, so does the photograph itself */
      if (t === bg || (t === big && (e.pointerType ? e.pointerType === 'mouse' : mouse))) shut();
    });
    lb.querySelector('.lb-x').addEventListener('click', shut);
    turns[0].addEventListener('click', function () { step(-1); });
    turns[1].addEventListener('click', function () { step(1); });

    /* on the document, so the arrow keys work wherever the focus is while a photograph is open */
    document.addEventListener('keydown', function (e) {
      if (!lb.open) return;
      var k = e.key;
      if (k === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (k === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'PageUp' || k === 'PageDown' || k === 'Home' || k === 'End' ||
        (k === ' ' && e.target.tagName !== 'BUTTON')) e.preventDefault();
    });

    /* the page behind stays still. Two fingers still zoom the photograph. */
    var zoomed = function () { return !!(window.visualViewport && window.visualViewport.scale > 1.02); };
    lb.addEventListener('wheel', function (e) { if (!e.ctrlKey) e.preventDefault(); }, { passive: false });
    lb.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1 && !zoomed()) e.preventDefault();
    }, { passive: false });
    var t0 = null;
    lb.addEventListener('touchstart', function (e) {
      t0 = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null;
    }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (!t0 || e.touches.length || !e.changedTouches.length) { t0 = null; return; }
      var dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y;
      if (!zoomed() && Date.now() - t0.t < 800 && Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
      t0 = null;
    }, { passive: true });

    each(shots, function (a, i) {
      a.setAttribute('tabindex', '-1');
      a.addEventListener('click', function (e) {
        if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   /* a new tab still works */
        e.preventDefault();
        open(i, a);
      });
    });
    /* keyboard: one button for each series, shown when it has focus. The arrow keys do the rest. */
    each(root.querySelectorAll('.gal .sr'), function (sec) {
      var first = sec.querySelector('.track a'), head = sec.querySelector('.h2');
      if (!first || !head) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lab lb-k';
      b.textContent = 'View large';
      b.setAttribute('aria-label', 'View the ' + sec.id.replace(/-/g, ' ') + ' photographs large');
      b.addEventListener('click', function () { open(Array.prototype.indexOf.call(shots, first), b); });
      head.parentNode.insertBefore(b, head.nextSibling);
    });
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
