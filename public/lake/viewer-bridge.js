(function () {
  function notify(type, payload) {
    try { parent.postMessage(Object.assign({ source: "qianqiu-lake-view", type: type }, payload || {}), "*"); } catch (e) {}
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText = function (text) {
      notify("copy", { text: String(text || "") });
      return Promise.resolve();
    };
  }
  function absoluteUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url) || url.indexOf("data:") === 0) return url;
    return window.location.origin + (url.charAt(0) === "/" ? url : "/" + url);
  }
  function cardUrl(card) {
    var raw = card.getAttribute("value") || "";
    if (raw.indexOf("data:") === 0) {
      try {
        var json = JSON.parse(decodeURIComponent(raw.replace(/^data:/i, "")));
        return json.src || json.url || json.href || (json.original && json.original.src) || "";
      } catch (error) { /* ignore */ }
    }
    var link = card.querySelector("a[href]");
    return link ? link.getAttribute("href") : "";
  }
  document.addEventListener("click", function (event) {
    var node = event.target;
    if (!node || !node.closest) return;
    var card = node.closest("ne-card");
    if (card) {
      var cardName = (card.getAttribute("name") || card.getAttribute("data-card-name") || "").toLowerCase();
      var url = cardUrl(card);
      if ((cardName === "file" || cardName === "localdoc" || cardName === "attachment") && url) {
        event.preventDefault();
        notify("open-url", { url: absoluteUrl(url) });
        return;
      }
    }
    var btn = node.closest("button, [role='button']");
    if (!btn) return;
    var label = ((btn.getAttribute("aria-label") || "") + " " + (btn.textContent || "") + " " + String(btn.className || "")).toLowerCase();
    if (!/\bcopy\b/.test(label) && label.indexOf("复制") < 0) return;
    var block = btn.closest("[class*='code'], pre, figure, details");
    var text = "";
    if (block) {
      var body = block.querySelector("pre, code, .cm-content");
      text = ((body || block).innerText || "").replace(/^\s*\d+[\s\u00a0]*/gm, "").trim();
    }
    if (text) notify("copy", { text: text });
  }, true);
  var lastHeight = 0;
  function contentHeight() {
    var engine = document.querySelector(".ne-engine") || document.querySelector(".ne-engine-view");
    if (!engine) return Math.max(document.body.scrollHeight, 120);
    var bottom = 0;
    var children = engine.children;
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      var top = node.offsetTop || 0;
      var height = Math.max(node.offsetHeight || 0, node.scrollHeight || 0);
      if (height) bottom = Math.max(bottom, top + height);
    }
    if (!bottom) bottom = engine.scrollHeight;
    return Math.ceil(bottom + 16);
  }
  function reportHeight() {
    var height = contentHeight();
    if (Math.abs(height - lastHeight) < 6) return;
    lastHeight = height;
    notify("view-height", { height: height });
  }
  document.addEventListener("click", function () {
    window.setTimeout(reportHeight, 80);
  });
  var scheduled = false;
  new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      reportHeight();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", reportHeight);
})();
