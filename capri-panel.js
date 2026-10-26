/*
 * Capri settings panel for the OpenCode desktop UI.
 *
 * Injected as out/renderer/capri-panel.js (see apply.js). Adds the Capri tray
 * icon in the prompt bar; clicking it opens a Capri-themed settings card next to
 * the button and drives the Capri app through window.api.capri* (IPC ->
 * 127.0.0.1:47823). No dependencies.
 */
(function () {
  "use strict";

  if (window.__capriPanelLoaded) return;
  window.__capriPanelLoaded = true;

  var PANEL_VERSION = "__CAPRI_PANEL_VERSION__";
  var api = window.api || {};
  var ICON = "data:image/png;base64,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";

  var LANGS = [
    ["auto", "Automatica"], ["it", "Italiano"], ["en", "English"], ["fr", "Français"],
    ["es", "Español"], ["pt", "Português"], ["ru", "Русский"],
  ];
  var SIZES = [["0.45", "S"], ["0.6", "M"], ["0.8", "L"]];
  var MOTIONS = [["auto", "Come Windows"], ["full", "Complete"], ["reduced", "Ridotte"]];
  var RESTS = [["corner", "Angolo"], ["taskbar", "Barra"]];
  var QUICK = [
    ["teleport", "Teletrasporta"],
    ["satellite", "Satellite"],
    ["report", "Rapporto"],
    ["chat", "Parlami"],
    ["demo", "Demo"],
    ["toggle", "Nascondi"],
  ];

  var state = {
    ok: false,
    error: "",
    open: false,
    cfg: null,
    linked: false,
    plugin: false,
    models: [],
    version: PANEL_VERSION,
    busy: false,
  };

  // ---- DOM helpers --------------------------------------------------------
  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      for (var key in props) {
        var value = props[key];
        if (value === undefined || value === null) continue;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else if (key === "html") node.innerHTML = value;
        else if (key === "on") {
          for (var evt in value) node.addEventListener(evt, value[evt]);
        } else if (key === "dataset") {
          for (var d in value) node.dataset[d] = value[d];
        } else node.setAttribute(key, value);
      }
    }
    if (children) {
      [].concat(children).forEach(function (child) {
        if (child === null || child === undefined) return;
        node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
      });
    }
    return node;
  }

  // ---- styles -------------------------------------------------------------
  var CLIP = "polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))";
  var CSS =
    ':root{--cap-ink:#0e0815;--cap-ink2:#1a0f26;--cap-paper:#f3eaf6;--cap-dim:#a190b3;--cap-violet:#a45bff;--cap-red:#ff3652;--cap-green:#4dff8e;--cap-orange:#ff8a3d}' +
    '.cap-slot{display:flex;align-items:center;gap:6px}' +
    '.cap-launch{display:flex;align-items:center;justify-content:center;flex:none;padding:0;border:1px solid transparent;background:transparent;color:inherit;cursor:pointer;transition:background .14s ease,border-color .14s ease}' +
    '.cap-rail-btn{width:32px;height:32px;border-radius:9px}' +
    '.cap-slot-btn{width:28px;height:28px;border-radius:6px}' +
    '.cap-float-btn{position:fixed;left:16px;bottom:16px;z-index:2147483000;width:34px;height:34px;border-radius:9px;border-color:rgba(164,91,255,.45);background:rgba(14,8,21,.85)}' +
    '.cap-launch:hover{background:var(--surface-base-hover,rgba(255,255,255,.07))}' +
    '.cap-launch.cap-on{border-color:var(--cap-violet);background:rgba(164,91,255,.16)}' +
    '.cap-launch .cap-mark{width:18px;height:18px;display:block;border-radius:3px}' +
    '.cap-slot-btn .cap-mark{width:16px;height:16px}' +
    '.cap-frame{position:fixed;z-index:2147483600;display:none;padding:2px;filter:drop-shadow(5px 5px 0 rgba(164,91,255,.9))}' +
    '.cap-frame.cap-open{display:block}' +
    '.cap-frame::before{content:"";position:absolute;inset:0;background:linear-gradient(140deg,var(--cap-orange),var(--cap-green) 45%,var(--cap-violet));clip-path:' + CLIP + ';pointer-events:none}' +
    '#cap-panel{position:relative;padding:14px;clip-path:' + CLIP + ';color:var(--cap-paper);' +
    'background:linear-gradient(160deg,rgba(26,15,38,.985),rgba(12,7,18,.985));' +
    'font-family:"Chakra Petch","Segoe UI",sans-serif;font-size:13px;line-height:1.35}' +
    '#cap-panel *{box-sizing:border-box}' +
    '#cap-panel .cap-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}' +
    '#cap-panel .cap-brand{min-width:0;flex:1}' +
    '#cap-panel .cap-title{font-size:15px;letter-spacing:.22em;font-weight:700}' +
    '#cap-panel .cap-sub{font-size:9px;letter-spacing:.14em;color:var(--cap-dim);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px;margin-top:1px}' +
    '#cap-panel .cap-chip{flex:none;font-size:9px;font-weight:700;letter-spacing:.14em;padding:2px 8px;color:#07120a;' +
    'background:var(--cap-green);clip-path:polygon(0 0,100% 0,100% 62%,calc(100% - 6px) 100%,0 100%)}' +
    '#cap-panel .cap-chip.off{background:var(--cap-red);color:#1a0307}' +
    '#cap-panel .cap-x{flex:none;background:none;border:0;color:var(--cap-dim);cursor:pointer;font-size:18px;line-height:1;padding:0 2px}' +
    '#cap-panel .cap-x:hover{color:var(--cap-paper)}' +
    '#cap-panel .cap-master{display:flex;align-items:center;gap:10px;padding:9px 11px;margin-bottom:10px;' +
    'background:rgba(164,91,255,.08);border:1px solid rgba(164,91,255,.28)}' +
    '#cap-panel .cap-mlabel{font-size:12px;letter-spacing:.1em;font-weight:600;text-transform:uppercase}' +
    '#cap-panel .cap-mhint{display:block;font-size:10px;color:var(--cap-dim);letter-spacing:.03em;font-weight:400;margin-top:2px}' +
    '#cap-panel .cap-switch{margin-left:auto;position:relative;width:38px;height:20px;flex:none;cursor:pointer}' +
    '#cap-panel .cap-switch input{position:absolute;opacity:0;width:0;height:0}' +
    '#cap-panel .cap-slider{position:absolute;inset:0;border-radius:10px;background:#2a1b38;border:1px solid rgba(164,91,255,.35);transition:.15s}' +
    '#cap-panel .cap-slider::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:var(--cap-dim);transition:.15s}' +
    '#cap-panel input:checked + .cap-slider{background:rgba(77,255,142,.2);border-color:rgba(77,255,142,.55)}' +
    '#cap-panel input:checked + .cap-slider::after{transform:translateX(18px);background:var(--cap-green)}' +
    '#cap-panel .cap-quick{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:6px}' +
    '#cap-panel .cap-qbtn{height:28px;border-radius:5px;border:1px solid rgba(164,91,255,.28);background:rgba(255,255,255,.03);color:var(--cap-paper);' +
    'font:inherit;font-size:9px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}' +
    '#cap-panel .cap-qbtn:hover{background:rgba(164,91,255,.18);border-color:var(--cap-violet)}' +
    '#cap-panel .cap-sec{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--cap-dim);margin:12px 0 4px;' +
    'border-bottom:1px solid rgba(164,91,255,.18);padding-bottom:4px}' +
    '#cap-panel .cap-row{display:flex;align-items:center;gap:10px;min-height:29px}' +
    '#cap-panel .cap-row > span{flex:1;font-size:12px}' +
    '#cap-panel select{flex:none;max-width:172px;background:#1b1027;color:var(--cap-paper);border:1px solid rgba(164,91,255,.3);' +
    'border-radius:5px;padding:3px 6px;font:inherit;font-size:11px}' +
    '#cap-panel .cap-seg{display:flex;gap:4px;align-items:center}' +
    '#cap-panel .cap-seg button{min-width:26px;height:23px;padding:0 7px;border-radius:5px;border:1px solid rgba(164,91,255,.28);' +
    'background:transparent;color:var(--cap-dim);font:inherit;font-size:11px;cursor:pointer}' +
    '#cap-panel .cap-seg button.on{background:rgba(164,91,255,.24);border-color:var(--cap-violet);color:#fff}' +
    '#cap-panel input[type=range]{flex:none;width:118px;accent-color:var(--cap-violet)}' +
    '#cap-panel .cap-vol{width:36px;text-align:right;font-size:11px;color:var(--cap-dim);font-variant-numeric:tabular-nums}' +
    '#cap-panel details{margin-top:8px;border-top:1px solid rgba(164,91,255,.14);padding-top:6px}' +
    '#cap-panel summary{cursor:pointer;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--cap-dim);list-style:none}' +
    '#cap-panel summary::-webkit-details-marker{display:none}' +
    '#cap-panel summary::after{content:"›";float:right;transition:transform .15s}' +
    '#cap-panel details[open] summary::after{transform:rotate(90deg)}' +
    '#cap-panel .cap-plugin{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:8px;border-top:1px solid rgba(164,91,255,.14)}' +
    '#cap-panel .cap-pstate{flex:1;font-size:11px;color:var(--cap-dim)}' +
    '#cap-panel .cap-pbtn{height:25px;padding:0 10px;border-radius:5px;border:1px solid rgba(255,54,82,.4);background:rgba(255,54,82,.08);' +
    'color:#ff9aa8;font:inherit;font-size:10px;text-transform:uppercase;letter-spacing:.08em;cursor:pointer}' +
    '#cap-panel .cap-pbtn.install{border-color:rgba(77,255,142,.45);background:rgba(77,255,142,.1);color:#9dffc0}' +
    '#cap-panel .cap-pbtn:hover{filter:brightness(1.25)}' +
    '#cap-panel .cap-foot{display:flex;justify-content:space-between;gap:8px;margin-top:10px;font-size:9px;letter-spacing:.1em;color:#6d5f7c}' +
    '#cap-panel .cap-err{padding:7px 9px;margin-bottom:8px;border:1px solid rgba(255,54,82,.4);background:rgba(255,54,82,.08);color:#ffb3bd;font-size:11px}' +
    '#cap-panel .cap-off{opacity:.45;pointer-events:none}';

  var style = el("style", { text: CSS });
  (document.head || document.documentElement).appendChild(style);

  // ---- launcher -----------------------------------------------------------
  var btn = el("button", {
    class: "cap-launch cap-rail-btn",
    type: "button",
    title: "Capri",
    "aria-label": "Capri settings",
    "data-capri-panel": "1",
  }, [el("img", { class: "cap-mark", src: ICON, alt: "" })]);

  // ---- panel --------------------------------------------------------------
  var chip = el("span", { class: "cap-chip", text: "OFFLINE" });
  var closeBtn = el("button", { class: "cap-x", type: "button", title: "Chiudi", text: "×" });
  var sub = el("div", { class: "cap-sub", text: "" });
  var head = el("div", { class: "cap-head" }, [
    el("div", { class: "cap-brand" }, [
      el("div", { class: "cap-title", text: "CAPRI" }),
      sub,
    ]),
    chip,
    closeBtn,
  ]);

  var masterInput = el("input", { type: "checkbox" });
  var master = el("div", { class: "cap-master" }, [
    el("div", {}, [
      el("div", { class: "cap-mlabel", text: "Capri attiva" }),
      el("span", { class: "cap-mhint", text: "sorveglianza, voce e modello" }),
    ]),
    el("label", { class: "cap-switch" }, [masterInput, el("span", { class: "cap-slider" })]),
  ]);

  var errorBox = el("div", { class: "cap-err", hidden: "" });

  var quick = el("div", { class: "cap-quick" }, QUICK.map(function (pair) {
    return el("button", { class: "cap-qbtn", type: "button", dataset: { cap: pair[0] }, text: pair[1] });
  }));

  function row(label, control) {
    return el("div", { class: "cap-row" }, [el("span", { text: label }), control]);
  }

  function select(options, onChange) {
    var node = el("select", {});
    options.forEach(function (pair) {
      node.appendChild(el("option", { value: pair[0], text: pair[1] }));
    });
    node.addEventListener("change", function () { onChange(node.value); });
    return node;
  }

  function segmented(options, onChange) {
    var wrap = el("div", { class: "cap-seg" });
    options.forEach(function (pair) {
      var b = el("button", { type: "button", dataset: { value: pair[0] }, text: pair[1] });
      b.addEventListener("click", function () { onChange(pair[0]); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  var langSel = select(LANGS, function (v) { setConfig({ lang: v }); });
  var scaleSeg = segmented(SIZES, function (v) { setConfig({ scale: Number(v) }); });
  var motionSel = select(MOTIONS, function (v) { setConfig({ motion: v }); });
  var restSeg = segmented(RESTS, function (v) { setConfig({ rest: v }); });

  var volume = el("input", { type: "range", min: "0", max: "100", step: "5" });
  var volumeText = el("span", { class: "cap-vol", text: "70%" });
  var volumeRow = row("Volume", el("div", { class: "cap-seg" }, [volume, volumeText]));

  function toggleRow(label, onToggle) {
    var input = el("input", { type: "checkbox" });
    input.addEventListener("change", function () { onToggle(input.checked); });
    return { row: row(label, el("label", { class: "cap-switch" }, [input, el("span", { class: "cap-slider" })])), input: input };
  }

  var muteRow = toggleRow("Muto", function (v) { setConfig({ muted: v }); });
  var wanderRow = toggleRow("Vaga quando è inattiva", function (v) { setConfig({ wander: v }); });
  var possessRow = toggleRow("Possiedi le finestre", function (v) { setConfig({ possess: v }); });

  var modelSel = el("select", {});
  modelSel.addEventListener("change", function () { setConfig({ chatModel: modelSel.value || null }); });

  var pluginState = el("span", { class: "cap-pstate", text: "Plugin OpenCode: —" });
  var pluginBtn = el("button", { class: "cap-pbtn", type: "button", text: "Installa" });
  pluginBtn.addEventListener("click", function () {
    if (state.busy) return;
    state.busy = true;
    whenReady().then(function () {
      return api.capriPlugin(state.plugin ? "remove" : "install");
    }).then(function (res) {
      if (res && res.ok) state.plugin = !!(res.plugin && res.plugin.installed);
      return refresh();
    }).catch(noop).then(function () { state.busy = false; });
  });

  var advanced = el("details", {}, [
    el("summary", { text: "Avanzate" }),
    row("Animazioni", motionSel),
    row("Riposo", restSeg),
    muteRow.row,
    wanderRow.row,
    possessRow.row,
  ]);

  var card = el("div", { id: "cap-panel" }, [
    head,
    master,
    errorBox,
    quick,
    el("div", { class: "cap-sec", text: "Impostazioni" }),
    row("Lingua", langSel),
    row("Dimensione", scaleSeg),
    volumeRow,
    row("Modello IA (Ollama)", modelSel),
    advanced,
    el("div", { class: "cap-plugin" }, [pluginState, pluginBtn]),
    el("div", { class: "cap-foot" }, [
      el("span", { text: "v" + PANEL_VERSION }),
      el("span", { text: "127.0.0.1:47823" }),
    ]),
  ]);

  var frame = el("div", { class: "cap-frame" }, [card]);
  document.documentElement.appendChild(frame);

  // ---- wiring -------------------------------------------------------------
  function noop() {}

  function whenReady() {
    if (api.capriState) return Promise.resolve();
    return Promise.reject(new Error("preload non aggiornato: reinstalla il pannello"));
  }

  function setConfig(patch) {
    if (!state.ok || state.busy) return;
    state.busy = true;
    whenReady().then(function () {
      return api.capriConfig(patch);
    }).then(function (res) {
      if (res && res.ok && res.config) state.cfg = res.config;
      return refresh();
    }).catch(noop).then(function () { state.busy = false; });
  }

  function command(name) {
    if (!state.ok || state.busy) return;
    state.busy = true;
    whenReady().then(function () {
      return api.capriCommand(name);
    }).then(function () {
      return refresh();
    }).catch(noop).then(function () { state.busy = false; });
  }

  masterInput.addEventListener("change", function () {
    command(masterInput.checked ? "enable" : "disable");
  });

  volume.addEventListener("input", function () {
    volumeText.textContent = Math.round(Number(volume.value)) + "%";
  });
  volume.addEventListener("change", function () {
    setConfig({ volume: Math.max(0, Math.min(100, Number(volume.value))) / 100 });
  });

  quick.addEventListener("click", function (event) {
    var target = event.target.closest("[data-cap]");
    if (!target) return;
    var name = target.dataset.cap;
    if (name === "toggle") command(state.cfg && state.cfg.visible ? "hide" : "show");
    else command(name);
  });

  function positionCard() {
    var r = btn.getBoundingClientRect();
    var width = Math.min(348, Math.max(260, window.innerWidth - 32));
    var left;
    var bottom;
    if (btn.classList.contains("cap-float-btn")) {
      left = r.left;
      bottom = window.innerHeight - r.top + 8;
    } else {
      left = r.right + 8;
      bottom = window.innerHeight - r.top + 6;
      if (left + width > window.innerWidth - 8) left = Math.max(8, r.left - width - 8);
    }
    if (left + width > window.innerWidth - 8) width = Math.max(220, window.innerWidth - left - 16);
    frame.style.left = Math.round(left) + "px";
    frame.style.bottom = Math.round(bottom) + "px";
    frame.style.width = Math.round(width) + "px";
  }

  function openPanel(open) {
    state.open = open;
    frame.classList.toggle("cap-open", open);
    btn.classList.toggle("cap-on", open);
    if (open) {
      positionCard();
      refresh();
      if (!poll) poll = setInterval(refresh, 3000);
    } else if (poll) {
      clearInterval(poll);
      poll = null;
    }
  }

  btn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    openPanel(!state.open);
  });
  closeBtn.addEventListener("click", function () { openPanel(false); });
  document.addEventListener("mousedown", function (event) {
    if (!state.open) return;
    if (card.contains(event.target) || btn.contains(event.target)) return;
    openPanel(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && state.open) openPanel(false);
  });
  window.addEventListener("resize", function () {
    if (state.open) positionCard();
  });

  // ---- state --------------------------------------------------------------
  var poll = null;

  function refresh() {
    if (!api.capriState) {
      state.ok = false;
      state.error = "Preload non aggiornato: reinstalla il pannello e riavvia OpenCode.";
      render();
      return Promise.resolve();
    }
    return api.capriState().then(function (st) {
      if (!st || !st.ok) {
        state.ok = false;
        state.error = (st && st.error) || "";
        render();
        return;
      }
      state.ok = true;
      state.error = "";
      state.linked = !!st.linked;
      state.cfg = st.config || {};
      state.plugin = !!(st.plugin && st.plugin.installed);
      state.models = st.models || [];
      state.version = st.version || PANEL_VERSION;
      render();
    }).catch(function (err) {
      state.ok = false;
      state.error = err && err.message ? err.message : "";
      render();
    });
  }

  function render() {
    chip.textContent = state.ok ? (state.linked ? "LINK" : "ONLINE") : "OFFLINE";
    chip.classList.toggle("off", !state.ok);

    var cfg = state.cfg || {};
    var model = cfg.chatModel || "auto";
    sub.textContent = state.ok
      ? model + (state.linked ? " · collegata a OpenCode" : " · in attesa di OpenCode")
      : "Capri non in esecuzione";
    errorBox.hidden = !state.error;
    errorBox.textContent = state.error || "";

    var disabled = !state.ok;
    masterInput.disabled = disabled;
    masterInput.checked = !!(cfg.claude && cfg.visible);
    master.classList.toggle("cap-off", disabled);
    quick.classList.toggle("cap-off", disabled);

    card.querySelectorAll("select, input, .cap-seg button, .cap-qbtn").forEach(function (node) {
      node.disabled = disabled;
    });

    langSel.value = cfg.lang || "auto";
    motionSel.value = cfg.motion || "auto";
    scaleSeg.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("on", Math.abs(Number(b.dataset.value) - Number(cfg.scale || 0.6)) < 0.01);
    });
    restSeg.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.value === (cfg.rest || "corner"));
    });
    volume.value = String(Math.round((cfg.volume == null ? 0.7 : cfg.volume) * 100));
    volumeText.textContent = Math.round(Number(volume.value)) + "%";
    muteRow.input.checked = !!cfg.muted;
    wanderRow.input.checked = cfg.wander !== false;
    possessRow.input.checked = cfg.possess !== false;

    var options = [["", "Predefinito"]].concat(state.models.map(function (name) { return [name, name]; }));
    if (cfg.chatModel && !state.models.some(function (name) { return name === cfg.chatModel; })) {
      options.push([cfg.chatModel, cfg.chatModel]);
    }
    var key = options.map(function (pair) { return pair[0]; }).join("|");
    if (modelSel.dataset.key !== key) {
      modelSel.dataset.key = key;
      modelSel.textContent = "";
      options.forEach(function (pair) { modelSel.appendChild(el("option", { value: pair[0], text: pair[1] })); });
    }
    modelSel.value = cfg.chatModel || "";

    pluginState.textContent = state.plugin ? "Plugin OpenCode: installato" : "Plugin OpenCode: non installato";
    pluginBtn.textContent = state.plugin ? "Rimuovi" : "Installa";
    pluginBtn.classList.toggle("install", !state.plugin);
    pluginBtn.disabled = disabled;

    var toggleBtn = quick.querySelector('[data-cap="toggle"]');
    if (toggleBtn) toggleBtn.textContent = cfg.visible === false ? "Mostra" : "Nascondi";
  }

  // ---- mount --------------------------------------------------------------
  function composerRow() {
    var forms = document.querySelectorAll("form");
    for (var i = forms.length - 1; i >= 0; i--) {
      if (String(forms[i].className).indexOf("prompt-input") < 0) continue;
      var rows = forms[i].querySelectorAll("div.flex.h-11");
      for (var j = rows.length - 1; j >= 0; j--) {
        if (rows[j].querySelector("button")) return rows[j];
      }
    }
    return null;
  }

  function pluginSlot(group) {
    var slot = document.getElementById("dsp-plugin-slot") ||
      document.getElementById("fln-plugin-slot") ||
      document.getElementById("cap-plugin-slot");
    if (!slot) slot = el("div", { id: "cap-plugin-slot", class: "cap-slot" });
    if (slot.parentNode !== group) group.appendChild(slot);
    return slot;
  }

  function mountComposer() {
    var row = composerRow();
    if (!row) return false;
    var group = null;
    var kids = row.children;
    for (var i = 0; i < kids.length; i++) {
      if (/flex-1/.test(kids[i].className) && kids[i].querySelector("button")) { group = kids[i]; break; }
    }
    if (!group) group = row;
    btn.classList.remove("cap-rail-btn", "cap-float-btn");
    btn.classList.add("cap-slot-btn");
    var slot = pluginSlot(group);
    if (btn.parentNode !== slot) slot.appendChild(btn);
    return true;
  }

  function mount() {
    if (mountComposer()) {
      if (state.open) positionCard();
      return;
    }
    if (btn.parentNode === document.body) return;
    btn.classList.remove("cap-rail-btn", "cap-slot-btn");
    btn.classList.add("cap-float-btn");
    document.body.appendChild(btn);
    if (state.open) positionCard();
  }

  mount();
  setInterval(mount, 1500);
  setTimeout(refresh, 400);
})();
