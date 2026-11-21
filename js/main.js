/* Metalglass — interacción: scroll suave, tablero de precios, tiras arrastrables, tilt, lightbox */
(function () {
  "use strict";
  var doc = document;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var PHONE = window.MG_PHONE || "573013328814";
  var DATA = window.MG_DATA || [];
  var page = doc.body.getAttribute("data-page");

  var WA_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.5A9.94 9.94 0 1 0 12.04 2Zm0 18.1a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.08.89.9-3-.2-.31a8.1 8.1 0 1 1 6.8 3.73Zm4.45-6.06c-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.25-.63.8-.77.96-.14.17-.28.19-.53.06a6.64 6.64 0 0 1-1.96-1.21 7.4 7.4 0 0 1-1.36-1.69c-.14-.25-.02-.38.1-.5.11-.11.25-.28.37-.42.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47c-.17 0-.43.06-.65.31-.22.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.54.12.16 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.45-.6 1.65-1.17.2-.57.2-1.06.14-1.17-.06-.1-.22-.16-.47-.28Z"/></svg>';

  /* ---------- helpers ---------- */
  function fmt(n) { return "$" + new Intl.NumberFormat("es-CO").format(n); }
  function wa(text) { return "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(text); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var REFERENCE = ["vitrina-bife", "salon-espejo", "ventanal-desde"];
  function isRef(it) { return REFERENCE.some(function (k) { return it.file.indexOf(k) > -1; }); }
  function priceHTML(it) {
    if (it.kind === "cotizar" || it.price == null) return '<span class="price-num">Cotizar</span>';
    var pre = it.kind === "desde" ? "<small>desde</small> " : "";
    return pre + '<span class="price-num">' + fmt(it.price) + "</span>";
  }
  function allItems() {
    var out = [];
    DATA.forEach(function (c) { c.items.forEach(function (i) { out.push(Object.assign({ catTitle: c.title }, i)); }); });
    return out;
  }
  function find(sub) { return allItems().filter(function (i) { return i.file.indexOf(sub) > -1; })[0]; }

  /* ---------- panel markup ---------- */
  function panelHTML(it, opts) {
    opts = opts || {};
    var tag = isRef(it) ? '<span class="tag-ref">Referencia</span>' : it.art ? '<span class="tag-ref">Ilustración</span>' : "";
    var cap = opts.noPrice
      ? '<div class="cap"><b>' + esc(it.name) + "</b></div>"
      : '<div class="cap"><b>' + esc(it.name) + '</b><span class="price-tag">' + priceHTML(it) + "</span></div>";
    return '<div class="ph' + (it.art ? " ph-art" : "") + '"><img src="' + it.file + '" alt="' + esc(it.name) + '" loading="lazy" decoding="async" draggable="false">' + tag + '</div><div class="shine"></div>' + cap;
  }

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      lenis.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  } else if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
  }
  doc.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var el = doc.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -120 }); else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      history.replaceState(null, "", id);
    });
  });

  /* ---------- WhatsApp links ---------- */
  doc.querySelectorAll("[data-wa]").forEach(function (a) { a.href = wa(a.getAttribute("data-wa")); a.target = "_blank"; a.rel = "noopener"; });

  /* ---------- mobile menu ---------- */
  var toggle = doc.querySelector(".menu-toggle"), links = doc.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
    links.addEventListener("click", function (e) { if (e.target.closest("a")) { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); } });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); } });
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    var els = doc.querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) { var d = parseFloat(en.target.getAttribute("data-delay") || 0); en.target.style.transitionDelay = d + "s"; en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- tilt + parallax (delegated) ---------- */
  function initTilt(root) {
    (root || doc).querySelectorAll(".panel:not([data-tilt])").forEach(function (p) {
      p.setAttribute("data-tilt", "1");
      p.addEventListener("pointermove", function (e) {
        if (reduce) return;
        var r = p.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        p.classList.add("is-tilting");
        p.style.setProperty("--rx", ((0.5 - py) * 11).toFixed(2) + "deg");
        p.style.setProperty("--ry", ((px - 0.5) * 13).toFixed(2) + "deg");
        p.style.setProperty("--sx", (130 - px * 160).toFixed(0) + "%");
      });
      function reset() { p.classList.remove("is-tilting"); p.style.setProperty("--rx", "0deg"); p.style.setProperty("--ry", "0deg"); p.style.setProperty("--sx", "120%"); }
      p.addEventListener("pointerleave", reset);
      p.addEventListener("pointercancel", reset);
      p.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") reset(); });
    });
  }
  function initParallax(root) {
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    (root || doc).querySelectorAll(".panel .ph:not(.ph-art) img:not([data-px])").forEach(function (img) {
      img.setAttribute("data-px", "1");
      window.gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: "none", scrollTrigger: { trigger: img.closest(".panel"), start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  /* ---------- draggable strip ---------- */
  function initStrip(strip) {
    var down = false, startX = 0, startLeft = 0, moved = 0, vel = 0, lastX = 0, lastT = 0, raf = 0;
    strip.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = 0; startX = lastX = e.clientX; startLeft = strip.scrollLeft; vel = 0; lastT = performance.now(); cancelAnimationFrame(raf);
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX; moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) strip.classList.add("dragging");
      strip.scrollLeft = startLeft - dx;
      var now = performance.now(); vel = (lastX - e.clientX) / Math.max(1, now - lastT); lastX = e.clientX; lastT = now;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return; down = false;
      var v = vel * 16;
      (function glide() { if (Math.abs(v) < 0.4) { strip.classList.remove("dragging"); return; } strip.scrollLeft += v; v *= 0.94; raf = requestAnimationFrame(glide); })();
      if (moved <= 5) strip.classList.remove("dragging");
    });
    strip.addEventListener("click", function (e) { if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    strip.addEventListener("dragstart", function (e) { e.preventDefault(); });
  }

  /* ---------- lightbox ---------- */
  var lb = null, lbList = [], lbIdx = 0, lbLast = null;
  function buildLB() {
    lb = doc.createElement("div");
    lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Foto ampliada");
    lb.innerHTML = '<button class="lb-close" aria-label="Cerrar">&#10005;</button><button class="lb-nav prev" aria-label="Anterior">&#8592;</button><button class="lb-nav next" aria-label="Siguiente">&#8594;</button><figure><img alt=""><figcaption><div><b></b><div class="price-tag"></div></div><a class="btn" target="_blank" rel="noopener">' + WA_ICON + 'Preguntar por este</a></figcaption></figure>';
    doc.body.appendChild(lb);
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.closest(".lb-close")) closeLB(); });
    lb.querySelector(".prev").addEventListener("click", function () { showLB(lbIdx - 1); });
    lb.querySelector(".next").addEventListener("click", function () { showLB(lbIdx + 1); });
    doc.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLB(); if (e.key === "ArrowLeft") showLB(lbIdx - 1); if (e.key === "ArrowRight") showLB(lbIdx + 1);
    });
    var sx = 0;
    lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) showLB(lbIdx + (dx < 0 ? 1 : -1)); }, { passive: true });
  }
  function showLB(i) {
    lbIdx = (i + lbList.length) % lbList.length;
    var it = lbList[lbIdx], img = lb.querySelector("img");
    img.style.animation = "none"; void img.offsetWidth; img.style.animation = "";
    img.src = it.file; img.alt = it.name;
    lb.querySelector("b").textContent = it.name;
    lb.querySelector(".price-tag").innerHTML = priceHTML(it);
    var msg = "Hola Metalglass, me interesa: " + it.name + (it.price ? " (" + fmt(it.price) + (it.kind === "desde" ? " desde" : "") + ")" : "") + ". ¿Me pueden cotizar?";
    lb.querySelector("figcaption .btn").href = wa(msg);
  }
  function openLB(list, i) {
    if (!lb) buildLB();
    lbList = list; lbLast = doc.activeElement; showLB(i); lb.classList.add("open");
    if (lenis) lenis.stop(); doc.body.style.overflow = "hidden";
    lb.querySelector(".lb-close").focus();
  }
  function closeLB() {
    lb.classList.remove("open"); if (lenis) lenis.start(); doc.body.style.overflow = "";
    if (lbLast) lbLast.focus();
  }
  function bindLB(container, list) {
    container.addEventListener("click", function (e) {
      var b = e.target.closest("[data-i]"); if (!b) return;
      e.preventDefault(); openLB(list, parseInt(b.getAttribute("data-i"), 10));
    });
  }

  /* ================= INICIO ================= */
  function initHome() {
    var rows = doc.querySelectorAll(".board .row"), frame = doc.querySelector(".board-photo .frame");
    if (rows.length && frame) {
      var current = null, timer = null, idx = 0;
      var cache = {};
      rows.forEach(function (r) { var s = r.getAttribute("data-img"); if (s) { var im = new Image(); im.src = s; cache[s] = 1; } });
      function show(r, instant) {
        if (current === r) return;
        rows.forEach(function (x) { x.classList.toggle("is-active", x === r); x.setAttribute("aria-pressed", x === r); });
        current = r;
        var src = r.getAttribute("data-img");
        var old = frame.querySelector("img.in");
        var img = new Image(); img.alt = r.getAttribute("data-alt") || ""; img.src = src;
        img.className = instant ? "in" : "pre";
        frame.appendChild(img);
        if (!instant) { requestAnimationFrame(function () { requestAnimationFrame(function () { img.className = "in"; if (old) { old.className = "out"; setTimeout(function () { old.remove(); }, 800); } }); }); }
        if (r.getAttribute("data-art")) img.style.objectFit = "contain";
      }
      function auto() { clearInterval(timer); if (reduce) return; timer = setInterval(function () { idx = (idx + 1) % rows.length; show(rows[idx]); }, 4200); }
      rows.forEach(function (r, i) {
        r.addEventListener("mouseenter", function () { if (finePointer) { clearInterval(timer); idx = i; show(r); } });
        r.addEventListener("focus", function () { clearInterval(timer); idx = i; show(r); });
        r.addEventListener("click", function () { clearInterval(timer); idx = i; show(r); });
      });
      doc.querySelector(".board").addEventListener("mouseleave", auto);
      show(rows[0], true); idx = 0; auto();
    }

    /* featured strip */
    var strip = doc.getElementById("strip");
    if (strip) {
      var feat = [find("puerta-2000000"), find("cabina-vidrio"), find("cocina-1700000"), find("espejo-con-luces"), find("puerta-1000000.jpeg"), find("ventanal-1700000"), find("pasamanos-escalera-vidrio-led"), find("puerta-750000"), find("reja-casa-horizontal"), find("division-oficina"), find("vitrina-bife")].filter(Boolean);
      strip.innerHTML = feat.map(function (it) {
        var href = "servicios.html#" + it.cat;
        return '<a class="panel" href="' + href + '" aria-label="' + esc(it.name) + '">' + panelHTML(it) + "</a>";
      }).join("");
      initStrip(strip); initTilt(strip); initParallax(strip);
    }

    if (window.gsap && !reduce) {
      var g = window.gsap;
      var tl = g.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".hero h1 .line > span", { yPercent: 115, duration: 1.2, stagger: 0.12 })
        .from(".hero-copy .lede, .hero-actions, .hero-phone", { y: 24, opacity: 0, duration: 0.9, stagger: 0.1 }, "-=0.8")
        .from(".board", { y: 60, opacity: 0, rotate: 3, duration: 1.2 }, "-=1.1")
        .from(".board .row", { x: -24, opacity: 0, duration: 0.7, stagger: 0.07 }, "-=0.7");
      if (window.ScrollTrigger) {
        g.fromTo(".shop-banner img", { scale: 1.14 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".shop-banner", start: "top bottom", end: "bottom 30%", scrub: true } });
        g.utils.toArray(".sign--l").forEach(function (h) {
          g.from(h, { clipPath: "inset(0 100% 0 0)", duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 88%", once: true } });
        });
      }
    }
  }

  /* ================= SERVICIOS ================= */
  var CAT_DESC = {
    puertas: "Aluminio, con vidrio, con persiana o con acabado en madera. El precio cambia según el estilo y el tamaño.",
    ventanas: "Ventanas y ventanales corredizos. El valor depende de la medida: te cotizamos por WhatsApp.",
    espejos: "Espejos a medida, con bisel o con luces LED.",
    banos: "Cabinas de baño en acrílico o vidrio templado, a tu medida.",
    pasamanos: "Para escaleras interiores, balcones, terrazas y puentes. Sin precio de lista: cada obra se cotiza según los metros y el diseño.",
    rejas: "Rejas de seguridad para ventanas, terrazas y frentes de casa. Se cotizan según la medida y el diseño.",
    divisiones: "Divisiones de oficina y de interiores empresariales en aluminio y vidrio. Se cotizan según el espacio.",
    "acabados-en-casa": "Cocinas y acabados en aluminio para tu hogar.",
    otros: "Muebles, vitrinas y otras piezas hechas a la medida."
  };
  var CAT_ORDER = ["puertas", "ventanas", "espejos", "banos", "pasamanos", "rejas", "divisiones", "acabados-en-casa", "otros"];
  var CAT_QUOTE = {
    pasamanos: ["Cotiza el tuyo", "Mándanos fotos y medidas aproximadas de tu balcón, escalera o terraza y te respondemos con el valor.", "Hola Metalglass, quiero cotizar un pasamanos (balcón / escalera)."],
    rejas: ["Cotiza tu reja", "Cuéntanos el tamaño de la ventana, terraza o frente y el diseño que te gusta.", "Hola Metalglass, quiero cotizar una reja para mi casa."],
    divisiones: ["Cotiza tu división", "Dinos cuántos metros y para qué espacio la necesitas.", "Hola Metalglass, quiero cotizar una división de interior para un local u oficina."]
  };
  function initServicios() {
    var host = doc.getElementById("catalog"), chips = doc.getElementById("chips");
    if (!host) return;
    var all = allItems(), list = [], html = "", chipHTML = "";
    var byId = {}; DATA.forEach(function (c) { byId[c.id] = c; });
    CAT_ORDER.forEach(function (id) {
      var c = byId[id]; if (!c) return;
      chipHTML += '<a class="chip" href="#' + id + '">' + esc(c.title) + "</a>";
      html += '<section class="cat" id="' + id + '"><div class="wrap"><div class="cat-head"><h2 class="sign sign--l">' + esc(c.title) + "</h2><p>" + esc(CAT_DESC[id] || "") + '</p></div><div class="grid">';
      c.items.forEach(function (it) {
        var full = all.filter(function (x) { return x.file === it.file; })[0] || it;
        list.push(full);
        html += '<figure class="item reveal"><button class="panel" data-i="' + (list.length - 1) + '" aria-label="Ampliar ' + esc(it.name) + '" style="border:0;font:inherit;text-align:left;color:inherit">' + panelHTML(it) + "</button></figure>";
      });
      if (CAT_QUOTE[id]) {
        var q = CAT_QUOTE[id];
        html += '<div class="quote-card reveal"><span class="script" style="font-size:1.6rem">' + q[0] + "</span><p>" + q[1] + '</p><a class="btn" data-wa="' + esc(q[2]) + '">' + WA_ICON + "Cotizar por WhatsApp</a></div>";
      }
      html += "</div></div></section>";
    });
    host.innerHTML = html; chips.innerHTML = chipHTML;
    bindLB(host, list);
    host.querySelectorAll("[data-wa]").forEach(function (a) { a.href = wa(a.getAttribute("data-wa")); a.target = "_blank"; a.rel = "noopener"; });
    initTilt(host); initParallax(host); initReveal();
    var secs = host.querySelectorAll(".cat"), cs = chips.querySelectorAll(".chip");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { cs.forEach(function (c) { c.classList.toggle("is-on", c.getAttribute("href") === "#" + x.target.id); }); } }); }, { rootMargin: "-30% 0px -60% 0px" });
      secs.forEach(function (s) { io.observe(s); });
    }
    cs.forEach(function (c) { c.addEventListener("click", function (e) {
      var el = doc.querySelector(c.getAttribute("href")); if (!el) return; e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -130 }); else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    }); });
    if (location.hash) { var t = doc.querySelector(location.hash); if (t) setTimeout(function () { if (lenis) lenis.scrollTo(t, { offset: -130, immediate: true }); else t.scrollIntoView(); }, 250); }
  }

  /* ================= GALERÍA ================= */
  function initGaleria() {
    var host = doc.getElementById("mosaic"), chips = doc.getElementById("chips");
    if (!host) return;
    var items = allItems().filter(function (i) { return i.cat !== "puertas" || true; });
    var cats = [{ id: "all", t: "Todo" }].concat(CAT_ORDER.map(function (id) { var t = (DATA.filter(function (c) { return c.id === id; })[0] || {}).title; return { id: id, t: t }; }).filter(function (c) { return c.t; }));
    chips.innerHTML = cats.map(function (c, i) { return '<button class="chip" aria-pressed="' + (i === 0) + '" data-f="' + c.id + '">' + esc(c.t) + "</button>"; }).join("");
    var current = items;
    function render(filter) {
      current = filter === "all" ? items : items.filter(function (i) { return i.cat === filter; });
      host.innerHTML = current.map(function (it, i) {
        return '<figure class="item reveal"><button class="panel" data-i="' + i + '" aria-label="Ampliar ' + esc(it.name) + '" style="border:0;font:inherit;text-align:left;color:inherit;display:block;width:100%">' + panelHTML(it, { noPrice: true }) + "</button></figure>";
      }).join("");
      initTilt(host); initParallax(host); initReveal();
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }
    host.addEventListener("click", function (e) {
      var b = e.target.closest("[data-i]"); if (!b) return; openLB(current, parseInt(b.getAttribute("data-i"), 10));
    });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("[data-f]"); if (!b) return;
      chips.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", c === b); });
      render(b.getAttribute("data-f"));
    });
    render("all");
  }

  /* ================= CONTACTO ================= */
  function initContacto() {
    var f = doc.getElementById("wa-form"); if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(f), n = (d.get("nombre") || "").toString().trim(), s = (d.get("servicio") || "").toString(), m = (d.get("mensaje") || "").toString().trim();
      var txt = "Hola Metalglass, soy " + (n || "un cliente") + ". Quiero cotizar: " + s + "." + (m ? " " + m : "");
      window.open(wa(txt), "_blank", "noopener");
    });
  }

  /* ---------- boot ---------- */
  initReveal();
  if (page === "inicio") initHome();
  if (page === "servicios") initServicios();
  if (page === "galeria") initGaleria();
  if (page === "contacto") initContacto();
  initTilt(); initParallax();
})();
