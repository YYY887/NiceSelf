(function () {
  var lastMarkdown = "";
  function notify(type, payload) {
    try { parent.postMessage(Object.assign({ source: "qianqiu-lake", type: type }, payload || {}), "*"); } catch (e) {}
  }
  function looksLikeMarkdown(text) {
    if (!text || text.length < 4) return false;
    return /(^|\n)\s{0,3}#{1,6}\s+\S|(^|\n)\s*[-*+]\s+\S|(^|\n)\s*\d+\.\s+\S|(^|\n)\s*```|(^|\n)\s*>\s+\S|\[[^\]]+\]\([^)]+\)/.test(text);
  }
  function isBlobLike(value) {
    return !!value && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.size === "number";
  }
  function extFromType(type, fallback) {
    var mime = String(type || "").toLowerCase();
    if (mime.indexOf("png") >= 0) return "png";
    if (mime.indexOf("jpeg") >= 0 || mime.indexOf("jpg") >= 0) return "jpg";
    if (mime.indexOf("gif") >= 0) return "gif";
    if (mime.indexOf("webp") >= 0) return "webp";
    if (mime.indexOf("svg") >= 0) return "svg";
    if (mime.indexOf("mp4") >= 0) return "mp4";
    if (mime.indexOf("webm") >= 0) return "webm";
    if (mime.indexOf("pdf") >= 0) return "pdf";
    return fallback;
  }
  function safeName(name, fallback, type) {
    var base = String(name || "").split(/[/\\]/).pop().replace(/[<>:"|?*]/g, "").trim();
    if (!base || base === "." || base.length > 180) return fallback + "." + extFromType(type, "bin");
    if (base.indexOf(".") < 0) return base + "." + extFromType(type, "bin");
    return base;
  }
  async function toFile(data, fallback, filename) {
    if (isBlobLike(data)) {
      var buffer = await data.arrayBuffer();
      var type = data.type || "application/octet-stream";
      return new File([buffer], safeName(data.name || filename, fallback, type), { type: type });
    }
    if (typeof data === "string") {
      if (data.indexOf("blob:") === 0) {
        var blob = await fetch(data).then(function (response) { return response.blob(); });
        return toFile(blob, fallback, filename);
      }
      var match = /^data:([^;]+);base64,(.+)$/i.exec(data);
      if (!match) throw new Error("无法识别要上传的文件");
      var binary = atob(match[2]);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new File([bytes], safeName(filename, fallback, match[1]), { type: match[1] });
    }
    throw new Error("无法识别要上传的文件");
  }
  function absoluteUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url) || url.indexOf("data:") === 0) return url;
    return window.location.origin + (url.charAt(0) === "/" ? url : "/" + url);
  }
  function isExistingAsset(value) {
    return typeof value === "string" && (/^https?:\/\//i.test(value) || value.indexOf("/api/uploads/") === 0 || value.indexOf("/uploads/") === 0);
  }
  function placeTitle() {
    var title = document.querySelector(".title-wrap");
    var engine = document.querySelector(".ne-engine");
    if (!title || !engine || !engine.parentNode) return;
    if (title.nextElementSibling === engine) return;
    engine.parentNode.insertBefore(title, engine);
  }
  window.__qianqiuUpload = async function (input, kind) {
    var fallback = kind === "video" ? "video" : kind === "file" ? "file" : "image";
    var payload = input && typeof input === "object" && !isBlobLike(input) ? input : { data: input };
    var data = payload.data || payload.file || payload.originFileObj || payload.src || payload.url || input;
    var filename = payload.filename || payload.name || payload.fileName || "";
    if (isExistingAsset(data)) {
      var ready = absoluteUrl(String(data));
      return { url: ready, size: Number(payload.size || 0), filename: filename || fallback };
    }
    notify("upload-start", { name: filename || fallback });
    try {
      var file = await toFile(data, fallback, filename);
      var form = new FormData();
      form.append("file", file);
      var response = await fetch("/api/admin/uploads", { method: "POST", body: form, credentials: "same-origin" });
      var saved = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(saved.error || ("上传失败 (" + response.status + ")"));
      var url = saved.url || "";
      if (url && !/^https?:\/\//i.test(url)) url = window.location.origin + url;
      notify("upload-ok", { name: saved.name || file.name, url: url });
      return { url: url, size: saved.size || file.size, filename: saved.name || file.name };
    } catch (error) {
      notify("upload-fail", { message: error && error.message ? error.message : "上传失败" });
      throw error;
    }
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText = function (text) {
      notify("copy", { text: String(text || "") });
      return Promise.resolve();
    };
  }
  document.addEventListener("paste", function (event) {
    var data = event.clipboardData;
    if (!data) return;
    if (data.files && data.files.length) return;
    var text = data.getData("text/plain") || "";
    if (!looksLikeMarkdown(text)) return;
    lastMarkdown = text;
    event.preventDefault();
    event.stopImmediatePropagation();
    notify("markdown-prompt", { text: text });
  }, true);
  function cardUrl(card) {
    if (!card) return "";
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
    var chrome = node.closest(".ne-ui-toolbar, .ne-ui-inner-toolbar, .ant-dropdown, .ne-slash, .ne-ui-slash, .ne-ui-overlay");
    if (chrome) {
      var item = node.closest("button, [role='button'], .ant-dropdown-menu-item, li, .ne-toolbar-item");
      var label = "";
      if (item) label = ((item.getAttribute("aria-label") || "") + " " + (item.getAttribute("title") || "") + " " + (item.textContent || "")).replace(/\s+/g, "");
      if (/图片|图像|Image/i.test(label) && label.indexOf("库") < 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        notify("open-library", { kind: "image" });
        return;
      }
      if (/附件|文件|File|localdoc/i.test(label) && !/库|类型|格式/.test(label)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        notify("open-library", { kind: "file" });
        return;
      }
    }
    var card = node.closest("ne-card");
    if (card) {
      var cardName = (card.getAttribute("name") || card.getAttribute("data-card-name") || "").toLowerCase();
      var url = cardUrl(card);
      if ((cardName === "file" || cardName === "localdoc" || cardName === "attachment" || cardName === "video") && url) {
        event.preventDefault();
        event.stopPropagation();
        notify("open-url", { url: absoluteUrl(url), name: card.textContent || "" });
        return;
      }
    }
    var fileLink = node.closest("a[href]");
    var engine = document.querySelector(".ne-engine");
    if (fileLink && engine && engine.contains(fileLink)) {
      var href = fileLink.getAttribute("href") || "";
      if (href && (fileLink.getAttribute("download") != null || href.indexOf("/api/uploads/") >= 0 || href.indexOf("/uploads/") >= 0)) {
        event.preventDefault();
        notify("open-url", { url: absoluteUrl(href), name: fileLink.textContent || "" });
        return;
      }
    }
    var btn = node.closest("button, [role='button']");
    if (!btn) return;
    var label = ((btn.getAttribute("aria-label") || "") + " " + (btn.textContent || "") + " " + String(btn.className || "")).replace(/\s+/g, "");
    if (label.indexOf("立即转换") >= 0 || (label.indexOf("样式转换") >= 0 && label.indexOf("转换") >= 0)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var md = lastMarkdown;
      if (!md) {
        var block = document.querySelector(".ne-codeblock, [class*='codeblock']");
        md = block ? (block.innerText || "") : "";
      }
      if (md) notify("convert-markdown", { text: md, replace: true });
      return;
    }
    var copyLabel = ((btn.getAttribute("aria-label") || "") + " " + (btn.textContent || "") + " " + String(btn.className || "")).toLowerCase();
    if (!/\bcopy\b/.test(copyLabel) && copyLabel.indexOf("复制") < 0) return;
    var codeBlock = btn.closest("[class*='code'], pre, figure");
    var text = "";
    if (codeBlock) {
      var body = codeBlock.querySelector("pre, code, .cm-content");
      text = ((body || codeBlock).innerText || "").replace(/^\s*\d+[\s\u00a0]*/gm, "").trim();
    }
    if (!text && window.getSelection) text = String(window.getSelection());
    notify("copy", { text: text });
  }, true);
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.source !== "qianqiu-parent") return;
    if (data.type === "scroll-heading") {
      var title = String(data.title || "").replace(/\s+/g, " ").trim();
      if (!title) return;
      var nodes = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
      for (var i = 0; i < nodes.length; i++) {
        if (String(nodes[i].innerText || "").replace(/\s+/g, " ").trim() === title) {
          nodes[i].scrollIntoView({ behavior: "smooth", block: "start" });
          break;
        }
      }
    }
    if (data.type === "insert-html" || data.type === "insert-text") {
      var editor = window.__lake;
      var html = String(data.html || data.text || "");
      if (!editor || !html) return;
      try { editor.execCommand("insertHTML", html); }
      catch (e1) {
        try { editor.kernel && editor.kernel.execCommand("insertHTML", html); }
        catch (e2) {
          var engine = document.querySelector(".ne-engine");
          if (engine) {
            engine.focus();
            document.execCommand("insertHTML", false, html);
          }
        }
      }
    }
  });
  var hideConvert = new MutationObserver(function () {
    var nodes = document.querySelectorAll(".ant-notification-notice, .ant-message, .ant-modal");
    for (var i = 0; i < nodes.length; i++) {
      if ((nodes[i].textContent || "").indexOf("样式转换") >= 0) nodes[i].style.display = "none";
    }
  });
  hideConvert.observe(document.documentElement, { childList: true, subtree: true });
  new MutationObserver(placeTitle).observe(document.documentElement, { childList: true, subtree: true });
  placeTitle();

  var menu = document.createElement("div");
  menu.id = "block-menu";
  menu.innerHTML = [
    '<button type="button" data-cmd="undo">撤销</button>',
    '<button type="button" data-cmd="redo">恢复</button>',
    '<div class="block-menu-sep"></div>',
    '<button type="button" data-cmd="cut">剪切</button>',
    '<button type="button" data-cmd="copy">复制</button>',
    '<button type="button" data-cmd="paste">粘贴</button>',
    '<button type="button" data-cmd="pasteText">粘贴并匹配样式</button>',
    '<button type="button" data-cmd="delete">删除</button>',
    '<button type="button" data-cmd="selectAll">全选</button>'
  ].join("");
  document.body.appendChild(menu);

  function hideMenu() { menu.style.display = "none"; }
  var contextCardId = "";
  function removeContextCard(editor) {
    if (!editor || !contextCardId) return false;
    var source = editor.getDocument("text/lake", { includeMeta: true });
    var removed = false;
    var updated = source.replace(/<card\b[^>]*><\/card>/gi, function (card) {
      if (removed) return card;
      var value = /\bvalue="([^"]*)"/i.exec(card);
      var id = /\bid="([^"]*)"/i.exec(card);
      if (id && id[1] === contextCardId) { removed = true; return ""; }
      if (!value) return card;
      try {
        var data = JSON.parse(decodeURIComponent(value[1].replace(/^data:(?:application\/json,)?/i, "")));
        if (data.id === contextCardId) { removed = true; return ""; }
      } catch (e) { /* Ignore cards with another value format. */ }
      return card;
    });
    if (!removed) return false;
    editor.setDocument("text/lake", updated);
    notify("document-change", { lake: editor.getDocument("text/lake", { includeMeta: true }) });
    return true;
  }
  function runCommand(name) {
    var editor = window.__lake;
    if (name === "delete" && contextCardId) {
      try {
        if (removeContextCard(editor)) { contextCardId = ""; notify("delete-ok"); return; }
      } catch (e) { notify("delete-fail"); return; }
      contextCardId = "";
      notify("delete-fail");
      return;
    }
    var engine = document.querySelector(".ne-engine");
    if (engine) engine.focus();
    if (name === "pasteText") {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (text) {
          var html = String(text || "").split(/\n/).map(function (line) {
            return "<p>" + line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>";
          }).join("");
          if (editor) {
            try { editor.execCommand("insertHTML", html); return; } catch (e) {}
          }
          document.execCommand("insertHTML", false, html);
        }).catch(function () { document.execCommand("paste"); });
      } else {
        document.execCommand("paste");
      }
      return;
    }
    var commands = name === "delete" ? ["delete", "backspace", "remove"] : [name];
    for (var i = 0; i < commands.length; i++) {
      try {
        if (!editor) throw new Error("no editor");
        var before = name === "delete" ? editor.getDocument("text/lake", { includeMeta: true }) : "";
        editor.execCommand(commands[i]);
        if (name !== "delete" || editor.getDocument("text/lake", { includeMeta: true }) !== before) return;
      }
      catch (e1) {
        try { if (editor && editor.kernel) editor.kernel.execCommand(commands[i]); else throw new Error("no kernel"); return; }
        catch (e2) {
          if (document.execCommand(commands[i])) return;
        }
      }
    }
    if (name === "delete") {
      var card = document.querySelector("ne-card.ne-selected, ne-card[data-card-selected], .ne-selected ne-card, .ne-card-container.ne-selected");
      if (!card) card = document.querySelector("ne-card:hover");
      if (card && card.parentNode) {
        card.parentNode.removeChild(card);
        if (editor && editor.kernel) {
          try { editor.execCommand("focus"); } catch (e3) {}
        }
      }
    }
  }
  menu.addEventListener("click", function (event) {
    var btn = event.target.closest("button");
    if (!btn) return;
    hideMenu();
    runCommand(btn.getAttribute("data-cmd"));
  });
  document.addEventListener("contextmenu", function (event) {
    var engine = document.querySelector(".ne-engine");
    if (!engine || !engine.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    var card = event.target.closest && event.target.closest("ne-card");
    contextCardId = card ? card.id || "" : "";
    if (card) {
      try { card.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window, clientX: event.clientX, clientY: event.clientY })); } catch (e) {}
    }
    var x = event.clientX;
    var y = event.clientY;
    menu.style.display = "block";
    var rect = menu.getBoundingClientRect();
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
    menu.style.left = Math.max(8, x) + "px";
    menu.style.top = Math.max(8, y) + "px";
  }, true);
  document.addEventListener("mousedown", function (event) {
    if (!menu.contains(event.target)) hideMenu();
  }, true);
  window.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "s") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      var editor = window.__lake;
      if (!editor) return;
      notify("save-request", {
        lake: editor.getDocument("text/lake", { includeMeta: true }),
        title: (document.getElementById("doc-title") || {}).value || ""
      });
    }
  }, true);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") hideMenu();
  });
  window.addEventListener("blur", hideMenu);
  window.addEventListener("scroll", hideMenu, true);
})();
