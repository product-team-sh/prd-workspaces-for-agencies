/* Review picker: hold Alt (Option on Mac) and click any element to copy a reference
   to it, so a review note can point at the exact element instead of a screenshot.
   Alt+Shift+click adds to the list; Escape clears it. Review tooling only: inert
   until Alt is held, and not part of the product. build-pages.py adds it to the
   published vE; the prototype source does not load it. */
(function () {
  if (window.__reviewPicker) return;
  window.__reviewPicker = true;

  var BLUE = "#1D4ED8", INK = "#111827", MUTED = "#6B7280", LINE = "#E5E7EB", WHITE = "#FFFFFF";
  var CONTROL = "button,a,input,select,textarea,label,summary,[role=button],[role=tab],[role=menuitem],[role=option],[role=switch],[role=checkbox]";
  var MEANINGFUL = "th,td,li,tr,h1,h2,h3,h4,h5,h6,img,svg,[role],[data-act],[data-id],[data-tab]";
  var HEADING = "h1,h2,h3,h4,legend,caption,[class*=title],[class*=-h],[class*=hd]";
  var picks = [], altDown = false, current = null;

  var box = document.createElement("div"), tag = document.createElement("div"), toast = document.createElement("div");
  box.style.cssText = "position:fixed;z-index:2147483646;pointer-events:none;border:2px solid " + BLUE + ";border-radius:4px;background:rgba(29,78,216,.06);display:none";
  tag.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;display:none;max-width:420px;padding:4px 8px;border-radius:4px;background:" + INK + ";color:" + WHITE + ";font:500 12px/16px Inter,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
  toast.style.cssText = "position:fixed;z-index:2147483647;left:50%;bottom:24px;transform:translateX(-50%);display:none;padding:8px 12px;border-radius:6px;background:" + WHITE + ";color:" + INK + ";border:1px solid " + LINE + ";box-shadow:0 4px 12px rgba(17,24,39,.12);font:500 13px/20px Inter,system-ui,sans-serif";
  document.addEventListener("DOMContentLoaded", mount);
  if (document.readyState !== "loading") mount();
  function mount() { if (!box.isConnected) document.body.append(box, tag, toast); }

  function own(el) { return el === box || el === tag || el === toast; }
  function clean(s, n) { s = (s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  /* The smallest element worth naming: a span inside a button names the button. */
  function pickable(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el instanceof SVGElement && el.ownerSVGElement) el = el.ownerSVGElement;
    var m = el.closest(CONTROL) || el.closest(MEANINGFUL);
    return m && !m.matches(".page,.main,.app,body,html") ? m : el;
  }

  function label(el) {
    var t = el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("placeholder") || el.getAttribute("alt") || "";
    if (!t && el.tagName === "INPUT") t = el.value;
    if (!t) t = el.innerText || el.textContent;
    return clean(t, 80);
  }

  function short(el) {
    var s = el.tagName.toLowerCase();
    if (el.id && !/^\d/.test(el.id)) s += "#" + el.id;
    var cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3) : [];
    if (cls.length) s += "." + cls.join(".");
    return s;
  }

  function dataAttrs(el) {
    return Array.prototype.filter.call(el.attributes, function (a) { return /^data-|^role$|^aria-(label|controls|expanded)$/.test(a.name); })
      .slice(0, 5).map(function (a) { return a.name + '="' + clean(a.value, 40) + '"'; }).join(" ");
  }

  function path(el) {
    var out = [], n = el;
    while (n && n.nodeType === 1 && out.length < 6 && !n.matches("#page,.main,body")) { out.unshift(short(n)); n = n.parentElement; }
    return out.join(" > ");
  }

  /* Where the element sits: nav item › breadcrumb › the dialog it is in, else the
     nearest heading-like element above it. */
  function context(el) {
    var parts = [], nav = document.querySelector('nav [aria-current]:not([aria-current="false"])');
    var crumb = document.querySelector(".crumb");
    if (nav) parts.push(clean(nav.innerText.split("\n")[0], 40));
    if (crumb && crumb.offsetParent && clean(crumb.innerText, 60) !== parts[0]) parts.push(clean(crumb.innerText, 60));
    var dlg = el.closest('[role="dialog"],.modal,.drawer');
    if (dlg) {
      var dt = dlg.querySelector(HEADING) || dlg;
      parts.push("dialog " + JSON.stringify(clean(dlg.getAttribute("aria-label") || dt.innerText, 50)));
    }
    for (var n = el.parentElement; n && !n.matches("#page,body,[role=dialog],.modal,.drawer"); n = n.parentElement) {
      var h = Array.prototype.find.call(n.querySelectorAll(HEADING), function (x) {
        return x !== el && !x.contains(el) && !el.contains(x) && x.offsetParent && clean(x.innerText, 50) &&
          (x.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      if (h) { parts.push("under " + JSON.stringify(clean(h.innerText, 50))); break; }
    }
    return parts.join(" › ");
  }

  function reference(el) {
    var lines = [
      "element: " + short(el) + (label(el) ? ' "' + label(el) + '"' : "") + (dataAttrs(el) ? " [" + dataAttrs(el) + "]" : ""),
      "where: " + context(el),
      "path: " + path(el)
    ];
    return lines.join("\n");
  }

  function header() {
    return "vE pick · build " + (window.__B || "?") + " · " + innerWidth + "×" + innerHeight + "\nurl: " + location.href;
  }

  function copy(text) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
      document.body.append(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
  }

  var toastTimer;
  function say(msg) {
    toast.textContent = msg; toast.style.display = "block";
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.style.display = "none"; }, 2200);
  }

  function show(el) {
    current = el;
    if (!el || !altDown) { box.style.display = tag.style.display = "none"; return; }
    var r = el.getBoundingClientRect();
    box.style.display = "block";
    box.style.left = r.left - 2 + "px"; box.style.top = r.top - 2 + "px";
    box.style.width = r.width + 4 + "px"; box.style.height = r.height + 4 + "px";
    tag.textContent = short(el) + (label(el) ? '  "' + label(el) + '"' : "");
    tag.style.display = "block";
    var top = r.top - 26;
    tag.style.top = (top < 4 ? r.bottom + 6 : top) + "px";
    tag.style.left = Math.max(4, Math.min(r.left, innerWidth - tag.offsetWidth - 4)) + "px";
  }

  addEventListener("keydown", function (e) {
    if (e.key === "Alt") { altDown = true; show(current); }
    else if (e.key === "Escape" && picks.length) { picks = []; say("Pick list cleared"); }
  }, true);
  addEventListener("keyup", function (e) { if (e.key === "Alt") { altDown = false; show(null); } }, true);
  addEventListener("blur", function () { altDown = false; show(null); });

  addEventListener("mousemove", function (e) {
    if (altDown !== e.altKey) altDown = e.altKey;
    var el = own(e.target) ? current : pickable(e.target);
    if (altDown || el !== current) show(el);
  }, true);

  function block(e) { if (e.altKey && !own(e.target)) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); } }
  ["mousedown", "mouseup", "pointerdown", "pointerup", "auxclick", "dblclick"].forEach(function (t) { addEventListener(t, block, true); });

  addEventListener("click", function (e) {
    if (!e.altKey || own(e.target)) return;
    block(e);
    var el = pickable(e.target);
    if (!el) return;
    if (!e.shiftKey) picks = [];
    picks.push(reference(el));
    var body = picks.length === 1 ? picks[0] : picks.map(function (p, i) { return "[" + (i + 1) + "]\n" + p; }).join("\n\n");
    copy(header() + "\n" + body);
    say(picks.length === 1 ? "Copied: " + clean(label(el) || short(el), 40) : picks.length + " picks copied. Esc clears");
  }, true);
})();
