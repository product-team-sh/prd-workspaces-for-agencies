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
  toast.style.cssText = "position:fixed;z-index:2147483647;left:50%;bottom:24px;transform:translateX(-50%);display:none;align-items:center;max-width:calc(100vw - 32px);box-sizing:border-box;white-space:nowrap;padding:8px 12px;border-radius:6px;background:" + WHITE + ";color:" + INK + ";border:1px solid " + LINE + ";box-shadow:0 4px 12px rgba(17,24,39,.12);font:500 13px/20px Inter,system-ui,sans-serif";
  document.addEventListener("DOMContentLoaded", mount);
  if (document.readyState !== "loading") mount();
  function mount() { if (!box.isConnected) document.body.append(box, tag, toast); }

  function own(el) { return el === box || el === tag || el === toast || toast.contains(el) || !!(el && el.closest && el.closest("[data-ve-review]")); }   /* E106: the comment link and review pins are not picked */
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
  function hideToast() { toast.style.display = "none"; }
  /* E106: the toast can carry one action, "Comment on this"; it then stays 8s, and while the pointer is on it */
  function say(msg, act) {
    toast.textContent = "";
    var m = document.createElement("span");
    m.textContent = msg; m.style.cssText = "min-width:0;overflow:hidden;text-overflow:ellipsis";
    toast.append(m);
    if (act) {
      var a = document.createElement("a");
      a.href = act.href; a.target = "_blank"; a.rel = "noopener"; a.textContent = act.text;
      a.style.cssText = "flex:none;margin-left:12px;color:" + BLUE + ";font-weight:600;text-decoration:none";
      a.addEventListener("click", function () { setTimeout(hideToast, 300); });
      toast.append(a);
    }
    toast.style.display = "flex";
    clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, act ? 8000 : 2200);
  }
  toast.addEventListener("mouseenter", function () { clearTimeout(toastTimer); });
  toast.addEventListener("mouseleave", function () { clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 2200); });

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
    /* E106: one comment is about the element just picked */
    var rc = window.__veReview, act = rc && rc.commentLink ? { text: "Comment on this", href: rc.commentLink(header(), reference(el), label(el) || short(el)) } : null;
    say(picks.length === 1 ? "Copied: " + clean(label(el) || short(el), 40) : picks.length + " picks copied. Esc clears", act);
  }, true);
  window.__vePickApi = { label: label, short: short };   /* E106: the review pins name elements the same way */
})();

/* vE E106, 29 Oct 2026 (Hitesh: "As we have locator now, can we add ability to comment by tagging location inside
   prototype for people to review"). Review comments, stored as GitHub issues on the public Pages repo:
   - "Comment on this" (the picker's toast) opens GitHub's new-issue page with the pick filled in;
   - the "Review comments" switch, bottom left, pins the open review issues on the elements they name.
   Off by default so demos stay clean; #<state>&review turns it on. No token: issues are read from the public API
   without auth (60 calls an hour per IP), once per page load, and written by the reviewer on github.com.
   Review tooling only, not part of the product. build-pages.py adds it to the published vE. */
(function () {
  if (window.__veReview) return;
  var REPO = "product-team-sh/prd-workspaces-for-agencies";
  var LIST = "https://api.github.com/repos/" + REPO + "/issues?state=open&per_page=100";
  var NEW = "https://github.com/" + REPO + "/issues/new";
  var MARK = "<!-- vE-pick v1 -->", PREFIX = "[vE review]", MAX_URL = 7500, KEY = "veReviewOn";
  /* hash parts that do not change the screen: list filters and the demo panel's switches */
  var DROP = /^(review|guide|slow|chrome|cols|(ws|ul)(q|status|usage|team|client|sort|page|size))$/;

  function clean(s, n) { s = (s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pickApi() { return window.__vePickApi || {}; }

  /* The screen a pick was made on: the hash route, the account or workspace in the header, the rail item and the page
     title. The hash alone is not enough: the rail moves between pages without touching it. Width-independent: the
     header's page title is hidden on a phone but still read. */
  function routeOf(href) {
    var h = String(href || "").split("#")[1] || "";
    try { h = decodeURIComponent(h); } catch (e) {}
    return h.split("&").filter(function (x) { return x && !DROP.test(x.split("=")[0]); }).sort().join("&");
  }
  function text(sel) { var e = document.querySelector(sel); return e ? clean(e.textContent, 60) : ""; }
  function screenNow() {
    var nav = document.querySelector('nav [aria-current]:not([aria-current="false"])'), lbl = nav && (nav.querySelector(".lbl") || nav);
    var r = routeOf(location.href), out = [];
    [r ? "#" + r : "start", text("#wsNm"), lbl ? clean(lbl.textContent, 40) : "", text("#crumbPath"), text("#crumbTail")].forEach(function (x) {
      if (x && out.indexOf(x) < 0) out.push(x);
    });
    return out.join(" › ");
  }

  /* ---- writing: the new-issue link */
  function commentLink(head, ref, lbl) {
    var lines = (head + "\nscreen: " + screenNow() + "\n" + ref).split("\n"), u, guard = 0;
    function idx(k) { for (var i = 0; i < lines.length; i++) if (lines[i].indexOf(k + ": ") === 0) return i; return -1; }
    function build() {
      var body = MARK + "\n```text\n" + lines.join("\n") + "\n```\n\nComment: ";
      return NEW + "?title=" + encodeURIComponent(PREFIX + " " + clean(lbl, 60) + ": ") + "&body=" + encodeURIComponent(body);
    }
    /* GitHub refuses very long URLs: drop the path's outer levels first (the inner ones find the element), then
       shorten the longest lines */
    while ((u = build()).length > MAX_URL && guard++ < 60) {
      var p = idx("path"), segs = p < 0 ? [] : lines[p].slice(6).replace(/^… > /, "").split(" > ");
      if (segs.length > 2) { segs.shift(); lines[p] = "path: … > " + segs.join(" > "); continue; }
      var cut = ["element", "where", "screen", "url", "path"].map(idx).filter(function (i) { return i > -1 && lines[i].length > 160; })[0];
      if (cut == null) break;
      lines[cut] = clean(lines[cut], Math.max(160, Math.floor(lines[cut].length * 0.7)));
    }
    return u;
  }

  /* ---- reading: an issue is a review comment when its body carries the marker and a pick block */
  function parse(is) {
    if (!is || is.pull_request) return null;
    var b = String(is.body || "").replace(/\r\n?/g, "\n");
    if (b.indexOf(MARK) < 0) return null;
    var m = /```[a-z]*\n([\s\S]*?)\n```/.exec(b);
    if (!m) return null;
    var f = {};
    m[1].split("\n").forEach(function (l) { var i = l.indexOf(": "); if (i > 0 && !(l.slice(0, i) in f)) f[l.slice(0, i)] = l.slice(i + 2); });
    if (!f.path || !f.url) return null;
    return {
      n: is.number, href: is.html_url, comments: is.comments || 0, user: (is.user && is.user.login) || "someone",
      title: String(is.title || "").replace(/^\s*\[vE review\]\s*/i, "").replace(/:\s*$/, "") || "Untitled",
      url: f.url, screen: f.screen || "", element: f.element || "", where: f.where || "", path: f.path
    };
  }

  /* ---- finding the element: the picker's path (tag#id.classes, up to six levels), checked against its label and data
     attributes. A unique match on the full path is enough; otherwise the label and attributes must agree. */
  function segSel(seg, withCls) {
    var m = /^([a-zA-Z][\w-]*)(?:#([^.]+))?(?:\.(.+))?$/.exec(seg.trim());
    if (!m) return null;
    var s = m[1].toLowerCase();
    if (m[2]) s += "#" + CSS.escape(m[2]);
    if (withCls && m[3]) m[3].split(".").forEach(function (c) { if (c) s += "." + CSS.escape(c); });
    return s;
  }
  function labelOf(line) { var m = /^\S+ "(.*?)"(?: \[.*\])?$/.exec(line || ""); return m ? m[1] : ""; }
  function attrsOf(line) {
    var m = /\[([^\[\]]*)\]$/.exec(line || ""), out = [], re = /([\w:-]+)="([^"]*)"/g, a;
    if (m) while ((a = re.exec(m[1]))) out.push([a[1], a[2]]);
    return out;
  }
  function shown(el) { return el.getClientRects().length > 0 && !el.closest("[data-ve-review]"); }
  function all(sel) { try { return Array.prototype.slice.call(document.querySelectorAll(sel)).filter(shown); } catch (e) { return []; } }
  function resolve(it) {
    var segs = it.path.replace(/^… > /, "").split(" > "), lab = labelOf(it.element), at = attrsOf(it.element), A = pickApi();
    function fits(el) {
      return (!lab || !A.label || A.label(el) === lab) && at.every(function (a) { return clean(el.getAttribute(a[0]), 40) === a[1]; });
    }
    for (var pass = 0; pass < 2; pass++) {
      var sel = segs.map(function (x) { return segSel(x, pass === 0); });
      if (sel.some(function (x) { return !x; })) return null;
      var c = all(sel.join(" > ")), f = c.filter(fits);
      if (f.length) return f[0];
      if (pass === 0 && c.length === 1) return c[0];
    }
    return null;
  }

  /* ---- UI */
  var CSS_TEXT = [
    ".ver,.ver *{box-sizing:border-box;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}",
    ".ver a{color:#1D4ED8;text-decoration:none}.ver a:hover{text-decoration:underline}",
    /* the switch: the Demo pill's size and look, mirrored to the left edge of the page; below the rail (z 999), so the
       rail never sits under it when it opens, and below every dialog */
    ".ver-tog{position:fixed;left:73px;bottom:16px;z-index:998;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:28px;min-width:28px;margin:0;padding:0 6px;border:1px solid #E5E7EB;border-radius:14px;background:#FFFFFF;color:#6B7280;font:600 12px/20px Inter,system-ui,sans-serif;box-shadow:0 1.62px 3.24px rgba(0,0,0,.16);cursor:pointer}",
    ".ver-tog svg{width:14px;height:14px;flex:none}",
    ".ver-tog-t,.ver-tog-n{display:none}",
    ".ver-tog:hover{color:#1D4ED8}",
    ".ver-tog:focus-visible{outline:2px solid #1D4ED8;outline-offset:2px}",
    ".ver.is-on .ver-tog{padding:0 12px 0 10px;color:#1D4ED8;border-color:#BFDBFE;background:#EFF6FF}",
    ".ver.is-on .ver-tog-t{display:inline}",
    ".ver.is-on .ver-tog-n:not(:empty){display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 4px;border-radius:9999px;background:#1D4ED8;color:#FFFFFF;font-size:11px;line-height:14px}",
    ".ver-card{position:fixed;left:73px;bottom:52px;z-index:998;width:max-content;max-width:min(300px,calc(100vw - 89px));max-height:min(360px,calc(100vh - 120px));overflow:auto;padding:12px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 4px 12px rgba(17,24,39,.12);color:#111827;font:400 13px/20px Inter,system-ui,sans-serif}",
    ".ver-card[hidden],.ver-pop[hidden]{display:none}",
    ".ver-line{font-weight:600}.ver-quiet{color:#6B7280}",
    ".ver-hint{margin-top:2px;color:#6B7280;font-size:12px;line-height:16px}",
    ".ver-sec{margin-top:10px;padding-top:8px;border-top:1px solid #E5E7EB}",
    ".ver-sec summary{cursor:pointer;color:#374151;font-size:12px;line-height:20px;font-weight:600;list-style-position:inside}",
    ".ver-row{padding:6px 0 0}",
    ".ver-row a.ver-t{display:block;color:#111827;font-weight:500;overflow-wrap:anywhere}.ver-row a.ver-t:hover{color:#1D4ED8}",
    ".ver-sub{color:#6B7280;font-size:12px;line-height:16px;overflow-wrap:anywhere}",
    ".ver-pin{position:fixed;z-index:2147483000;display:none;width:20px;height:20px;margin:0;padding:0;border:2px solid #FFFFFF;border-radius:50%;background:#1D4ED8;color:#FFFFFF;font:600 11px/16px Inter,system-ui,sans-serif;text-align:center;box-shadow:0 1px 3px rgba(17,24,39,.3);cursor:pointer}",
    ".ver-pin:hover,.ver-pin[aria-expanded=true]{background:#1E40AF}",
    ".ver-pin:focus-visible{outline:2px solid #1D4ED8;outline-offset:2px}",
    ".ver-pop{position:fixed;z-index:2147483001;width:280px;max-width:calc(100vw - 32px);padding:12px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 4px 12px rgba(17,24,39,.12);color:#111827;font:400 13px/20px Inter,system-ui,sans-serif}",
    ".ver-pop-t{font-weight:600;overflow-wrap:anywhere}",
    ".ver-pop-m{margin-top:2px;color:#6B7280;font-size:12px;line-height:16px}",
    ".ver-pop a{display:inline-block;margin-top:8px;font-weight:600}"
  ].join("\n");
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  var on = false, items = null, loading = false, failed = false, here = [], away = [], popN = null, awayOpen = false;
  try { on = sessionStorage.getItem(KEY) === "1"; } catch (e) {}
  if (window.__veReviewHash) on = true;

  var root = document.createElement("div"), style = document.createElement("style");
  root.className = "ver"; root.setAttribute("data-ve-review", "");
  style.textContent = CSS_TEXT;
  root.innerHTML = '<div class="ver-pins"></div><div class="ver-pop" role="dialog" aria-label="Review comment" hidden></div>' +
    '<div class="ver-card" role="region" aria-label="Review comments" hidden></div>' +
    '<button type="button" class="ver-tog" role="switch" aria-checked="false" aria-label="Review comments" title="Review comments">' + ICON +
    '<span class="ver-tog-t">Review comments</span><span class="ver-tog-n"></span></button>';
  var pinsEl = root.querySelector(".ver-pins"), pop = root.querySelector(".ver-pop"), card = root.querySelector(".ver-card"), tog = root.querySelector(".ver-tog");

  function setOn(v) {
    on = !!v;
    try { sessionStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
    if (on && !items && !loading && !failed) load();
    refresh();
  }

  function load() {
    loading = true;
    fetch(LIST).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        items = (Array.isArray(d) ? d : []).map(parse).filter(Boolean).sort(function (a, b) { return a.n - b.n; });
      })
      .catch(function () { failed = true; })
      .then(function () { loading = false; refresh(); });
  }

  /* which comments are on this screen and found, and which are not */
  function classify() {
    here = []; away = [];
    if (!items) return;
    var cur = screenNow(), route = routeOf(location.href);
    items.forEach(function (it) {
      var same = it.screen ? it.screen === cur : routeOf(it.url) === route;
      var el = same ? resolve(it) : null;
      if (el) here.push({ it: it, el: el }); else away.push({ it: it, missing: same });
    });
  }

  function screenLink(it) { return location.pathname + location.search + "#" + (String(it.url).split("#")[1] || ""); }

  function renderCard() {
    var h;
    if (loading) h = '<div class="ver-quiet">Loading comments…</div>';
    else if (failed) h = '<div class="ver-quiet">Comments couldn\'t load</div>';
    else if (!items || !items.length) h = '<div class="ver-line">No review comments yet</div><div class="ver-hint">Alt+click any element, then Comment on this</div>';
    else {
      h = '<div class="ver-line">' + (here.length ? here.length + (here.length === 1 ? " comment" : " comments") + " on this screen" : "None on this screen") + '</div>' +
        '<div class="ver-hint">Alt+click any element, then Comment on this</div>';
      if (away.length) h += '<details class="ver-sec"' + (awayOpen ? " open" : "") + '><summary>Not on this screen (' + away.length + ')</summary>' +
        away.map(function (a) {
          var it = a.it;
          return '<div class="ver-row"><a class="ver-t" href="' + esc(it.href) + '" target="_blank" rel="noopener">#' + it.n + " " + esc(it.title) + '</a>' +
            '<div class="ver-sub"><a href="' + esc(screenLink(it)) + '">' + esc(it.screen || "#" + routeOf(it.url)) + '</a>' +
            (a.missing ? " · element not found on this build" : "") + '</div></div>';
        }).join("") + '</details>';
    }
    if (card.innerHTML !== h) card.innerHTML = h;
  }

  function renderPins() {
    var want = on ? here.map(function (h, i) { return h.it.n + ":" + (i + 1); }).join(",") : "";
    if (pinsEl.getAttribute("data-k") !== want) {
      pinsEl.setAttribute("data-k", want);
      pinsEl.innerHTML = on ? here.map(function (h, i) {
        return '<button type="button" class="ver-pin" data-n="' + h.it.n + '" aria-haspopup="dialog" aria-expanded="false" aria-label="Review comment ' + (i + 1) + ": " + esc(h.it.title) + '">' + (i + 1) + "</button>";
      }).join("") : "";
    }
    if (popN != null && !here.some(function (h) { return h.it.n === popN; })) closePop();
  }

  function refresh() {
    root.classList.toggle("is-on", on);
    tog.setAttribute("aria-checked", on ? "true" : "false");
    card.hidden = !on;
    if (on) classify(); else { here = []; away = []; }
    tog.querySelector(".ver-tog-n").textContent = on && here.length ? String(here.length) : "";
    if (on) renderCard();
    renderPins();
    place();
  }

  /* pins sit on the element's top-right corner and hide while it is scrolled away or covered (a dialog, the open rail) */
  function place() {
    if (!on) return;
    var tally = {};
    var sb = document.querySelector("nav.sb"), left = sb && sb.getClientRects().length ? 73 : 16;
    tog.style.left = card.style.left = left + "px";
    card.style.maxWidth = "min(300px, calc(100vw - " + (left + 16) + "px))";
    here.forEach(function (h) {
      var pin = pinsEl.querySelector('.ver-pin[data-n="' + h.it.n + '"]');
      if (!pin) return;
      var el = h.el.isConnected ? h.el : null, r = el && el.getBoundingClientRect();
      var cx = r && Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), cy = r && Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
      var top = r && document.elementFromPoint(cx, cy);
      var ok = r && (r.width || r.height) && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth &&
        (!top || root.contains(top) || el.contains(top) || top.contains(el));
      if (!ok) { pin.style.display = "none"; if (popN === h.it.n) closePop(); return; }
      var k = Math.round(r.right) + ":" + Math.round(r.top), off = (tally[k] = (tally[k] || 0) + 1) - 1;
      pin.style.display = "block";
      pin.style.left = Math.min(Math.max(r.right - 10 - off * 22, 2), innerWidth - 22) + "px";
      pin.style.top = Math.min(Math.max(r.top - 10, 2), innerHeight - 22) + "px";
      if (popN === h.it.n) placePop(pin);
    });
  }

  function placePop(pin) {
    var pr = pin.getBoundingClientRect(), w = pop.offsetWidth, ht = pop.offsetHeight;
    var x = Math.min(Math.max(pr.left + pr.width / 2 - w / 2, 16), innerWidth - w - 16);
    var y = pr.bottom + 8 + ht > innerHeight - 8 ? pr.top - 8 - ht : pr.bottom + 8;
    pop.style.left = x + "px"; pop.style.top = Math.max(8, y) + "px";
  }

  function openPop(n) {
    var h = here.filter(function (x) { return x.it.n === n; })[0];
    if (!h) return;
    var it = h.it, pin = pinsEl.querySelector('.ver-pin[data-n="' + n + '"]');
    popN = n;
    pop.innerHTML = '<div class="ver-pop-t">' + esc(it.title) + '</div>' +
      '<div class="ver-pop-m">#' + it.n + " · " + esc(it.user) + " · " + it.comments + (it.comments === 1 ? " comment" : " comments") + '</div>' +
      '<a href="' + esc(it.href) + '" target="_blank" rel="noopener">Open on GitHub</a>';
    pop.hidden = false;
    Array.prototype.forEach.call(pinsEl.children, function (b) { b.setAttribute("aria-expanded", String(b === pin)); });
    if (pin) placePop(pin);
  }
  function closePop() {
    popN = null; pop.hidden = true;
    Array.prototype.forEach.call(pinsEl.children, function (b) { b.setAttribute("aria-expanded", "false"); });
  }

  root.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest(".ver-tog")) setOn(!on);
    else if (t.closest(".ver-pin")) { var n = +t.closest(".ver-pin").getAttribute("data-n"); if (popN === n) closePop(); else openPop(n); }
    e.stopPropagation();
  });
  root.addEventListener("toggle", function (e) { if (e.target.matches && e.target.matches("details.ver-sec")) awayOpen = e.target.open; }, true);
  document.addEventListener("click", function (e) { if (popN != null && !root.contains(e.target)) closePop(); }, true);
  addEventListener("keydown", function (e) { if (e.key === "Escape" && popN != null) closePop(); });

  var raf = 0, timer = 0;
  function soon() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; place(); }); }
  function later() { clearTimeout(timer); timer = setTimeout(refresh, 120); }
  addEventListener("scroll", soon, true);
  addEventListener("resize", later);
  /* the prototype re-renders on every move, and the rail changes screens without touching the hash */
  new MutationObserver(function (ms) {
    if (!on) return;
    for (var i = 0; i < ms.length; i++) if (!root.contains(ms[i].target) && ms[i].target !== root) { later(); return; }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current", "hidden", "open"] });

  function mount() {
    if (root.isConnected) return;
    document.head.append(style); document.body.append(root);
    if (on) setOn(true); else refresh();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();

  window.__veReview = { commentLink: commentLink, screen: screenNow, setOn: setOn, parse: parse };
})();
