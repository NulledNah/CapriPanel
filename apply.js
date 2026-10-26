#!/usr/bin/env node
/*
 * apply.js - install / remove the Capri settings panel into the OpenCode desktop app.
 *
 * This addon shares the append-only main entry out/main/oc-addons.js with the
 * other addons (DeepSeek, Freelancer, Skills). install appends:
 *   + out/main/capri-main.js       (IPC bridge to the Capri app's local API)
 *   + out/renderer/capri-panel.js  (launcher icon + settings panel)
 *   + out/main/oc-addons.js        (shared loader; patched to import capri-main.js)
 *   ~ package.json                 (main -> ./out/main/oc-addons.js)
 *   ~ out/preload/index.js         (expose window.api.capri*)
 *   ~ out/renderer/index.html      (<script src="./capri-panel.js">)
 *
 * Existing data is never moved (only appended). remove neutralizes this addon
 * (its main module becomes an empty stub) and strips its renderer script tag /
 * preload lines, without touching other addons. restore-all copies the shared
 * pristine backup back over app.asar. Run while OpenCode is closed.
 *
 *   node apply.js install|remove|restore-all|status|verify [--app <dir>] [--force]
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const SHARED_BACKUP_SUFFIX = ".ocaddons-backup";
const BLOCK_SIZE = 4194304;
const MARKER = "capri-panel.js";
const SCRIPT_TAG = '<script src="./capri-panel.js" defer></script>';
const REMOVED_SENTINEL = "/* oc-addon-removed: capri */";
const CAPRI_IMPORT = "./capri-main.js";

const MAIN_PARTS = ["out", "main", "capri-main.js"];
const PANEL_PARTS = ["out", "renderer", "capri-panel.js"];
const PRELOAD_PARTS = ["out", "preload", "index.js"];
const PRELOAD_PARTS_CJS = ["out", "preload", "index.cjs"];
const INDEX_PARTS = ["out", "renderer", "index.html"];
const PKG_PARTS = ["package.json"];
const LOADER_PARTS = ["out", "main", "oc-addons.js"];
const LOADER_MAIN = "./out/main/oc-addons.js";
const BASE_MAIN = "./out/main/index.js";

// Shared loader entry. Keep the addon list in sync with the other addons:
// whichever addon installs first creates it, the others reuse or extend it.
const LOADER_SRC =
  "/* oc-addons loader - shared entry for OpenCode desktop addons.\n" +
  " * Loads the base app, then any present addon main module. Addons are\n" +
  " * append-only; a removed addon is neutralized to a no-op stub. */\n" +
  'import "./index.js";\n' +
  'for (const f of ["./deepseek-main.js", "./freelancer-main.js", "./skills-main.js", "./capri-main.js"]) {\n' +
  "  try { await import(f); } catch (e) { /* addon not installed */ }\n" +
  "}\n";

function parseArgs(argv) {
  const args = { cmd: "install", app: null, force: false };
  const rest = argv.slice(2);
  if (rest[0] && !rest[0].startsWith("-")) args.cmd = rest.shift();
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--app") args.app = rest[++i];
    else if (rest[i] === "--force") args.force = true;
  }
  return args;
}

function defaultAppDir() {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Local");
    return path.join(base, "Programs", "@opencode-aidesktop");
  }
  if (process.platform === "darwin") return "/Applications/OpenCode.app";
  return "/opt/OpenCode";
}

function resolveAsar(appDir) {
  let base = appDir;
  if (process.platform === "darwin" && fs.existsSync(path.join(appDir, "Contents", "Resources"))) {
    base = path.join(appDir, "Contents", "Resources");
  }
  return path.join(base, "resources", "app.asar");
}

function appRunning() {
  if (process.platform !== "win32") return false;
  try {
    return /OpenCode\.exe/i.test(execSync('tasklist /FI "IMAGENAME eq OpenCode.exe" /NH', { encoding: "utf8" }));
  } catch (e) { return false; }
}

function integrityOf(buf) {
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  const blocks = [];
  for (let i = 0; i < buf.length; i += BLOCK_SIZE) {
    blocks.push(crypto.createHash("sha256").update(buf.subarray(i, i + BLOCK_SIZE)).digest("hex"));
  }
  if (blocks.length === 0) blocks.push(hash);
  return { algorithm: "SHA256", hash, blockSize: BLOCK_SIZE, blocks };
}

function readHeader(asar) {
  const fd = fs.openSync(asar, "r");
  try {
    const sb = Buffer.alloc(8);
    fs.readSync(fd, sb, 0, 8, 0);
    const size = sb.readUInt32LE(4);
    if (size <= 0 || size > fs.fstatSync(fd).size - 8) throw new Error("invalid app.asar header");
    const hb = Buffer.alloc(size);
    fs.readSync(fd, hb, 0, size, 8);
    const strLen = hb.readUInt32LE(4);
    return { size, json: JSON.parse(hb.subarray(8, 8 + strLen).toString("utf8")), dataStart: 8 + size };
  } finally {
    fs.closeSync(fd);
  }
}

function nodeAt(json, parts) {
  let n = json;
  for (const p of parts) { if (!n || !n.files || !n.files[p]) return null; n = n.files[p]; }
  return n;
}
function setEntry(json, parts, entry) {
  const parent = nodeAt(json, parts.slice(0, -1));
  if (!parent || !parent.files) throw new Error("asar path not found: " + parts.join("/"));
  parent.files[parts[parts.length - 1]] = entry;
}
// The desktop app renamed the preload entry (index.js -> index.cjs): patch whichever is there.
function preloadParts(json) {
  return nodeAt(json, PRELOAD_PARTS_CJS) ? PRELOAD_PARTS_CJS : PRELOAD_PARTS;
}
function readEntry(asar, json, dataStart, parts) {
  const node = nodeAt(json, parts);
  if (!node || node.files) return null;
  const fd = fs.openSync(asar, "r");
  try {
    const buf = Buffer.alloc(node.size);
    fs.readSync(fd, buf, 0, node.size, dataStart + parseInt(node.offset));
    return buf;
  } finally {
    fs.closeSync(fd);
  }
}

function pickleUInt32(value) {
  const payload = Buffer.alloc(4);
  payload.writeUInt32LE(value, 0);
  const out = Buffer.alloc(8);
  out.writeUInt32LE(payload.length, 0);
  payload.copy(out, 4);
  return out;
}
function pickleString(str) {
  const bytes = Buffer.from(str, "utf8");
  const pad = (4 - (bytes.length % 4)) % 4;
  const payload = Buffer.alloc(4 + bytes.length + pad);
  payload.writeUInt32LE(bytes.length, 0);
  bytes.copy(payload, 4);
  const out = Buffer.alloc(4 + payload.length);
  out.writeUInt32LE(payload.length, 0);
  payload.copy(out, 4);
  return out;
}

function stripIndex(html) {
  return html.replace(/<script[^>]*src=["']\.\/capri-panel\.js["'][^>]*><\/script>/g, "");
}
function patchIndexHtml(html) {
  let out = stripIndex(html);
  if (out.includes("</body>")) out = out.replace("</body>", SCRIPT_TAG + "</body>");
  else out += SCRIPT_TAG;
  return out;
}

function patchPreload(src, add) {
  // Drop any previously injected capri line so the patch stays idempotent.
  src = src.split("\n").filter((line) => !/capri(State|Config|Command|Models|Plugin)\s*:/.test(line)).join("\n");
  if (!add) return src;
  // The app's own preload no longer exposes a window.api object to extend, so expose
  // the bridge under its own key; the renderer reads window.capriApi first, window.api after.
  const inject =
    ';{const e=require("electron");e.contextBridge.exposeInMainWorld("capriApi",{' +
    'capriState:()=>e.ipcRenderer.invoke("capri-state"),' +
    'capriConfig:(p)=>e.ipcRenderer.invoke("capri-config",p),' +
    'capriCommand:(n)=>e.ipcRenderer.invoke("capri-command",n),' +
    'capriModels:()=>e.ipcRenderer.invoke("capri-models"),' +
    'capriPlugin:(a)=>e.ipcRenderer.invoke("capri-plugin",a)});}';
  return (src.endsWith("\n") ? src : src + "\n") + inject + "\n";
}

// An existing loader (created by another addon) may not know about this addon:
// add a standalone import so remove/install order does not matter.
function ensureCapriImport(src) {
  if (src.includes('"./capri-main.js"') || src.includes("'./capri-main.js'")) return src;
  const line = 'try { await import("./capri-main.js"); } catch (e) { /* addon not installed */ }\n';
  return src.endsWith("\n") ? src + line : src + "\n" + line;
}

function panelVersion() {
  try {
    const v = fs.readFileSync(path.join(__dirname, "VERSION"), "utf8").trim();
    if (v) return v;
  } catch (e) { /* no VERSION file */ }
  return "dev";
}

function sharedBackup(asar) { return asar + SHARED_BACKUP_SUFFIX; }

function pkgMainOf(asar) {
  try {
    const header = readHeader(asar);
    const raw = readEntry(asar, header.json, header.dataStart, PKG_PARTS);
    return raw ? JSON.parse(raw.toString("utf8")).main : null;
  } catch (e) { return null; }
}

// Ensure a pristine copy of app.asar exists for restore-all. If another addon is
// already installed it seeded the shared backup, so this is a no-op.
function ensureSharedBackup(asar) {
  const shared = sharedBackup(asar);
  if (fs.existsSync(shared)) return shared;
  if (pkgMainOf(asar) === BASE_MAIN) {
    fs.copyFileSync(asar, shared);
    console.log("Shared backup created from app.asar (pristine)");
    return shared;
  }
  const legacy = asar + ".deepseek-backup";
  if (fs.existsSync(legacy) && pkgMainOf(legacy) === BASE_MAIN) {
    fs.copyFileSync(legacy, shared);
    console.log("Shared backup created from " + legacy);
    return shared;
  }
  console.warn("No pristine backup found: 'restore-all' will not be possible until one exists.");
  return null;
}

function install(args) {
  const appDir = args.app || defaultAppDir();
  const asar = resolveAsar(appDir);
  if (!fs.existsSync(asar)) { console.error("app.asar not found: " + asar); process.exit(1); }
  if (appRunning() && !args.force) {
    console.error("OpenCode is running. Close it before applying the patch (or use --force).");
    process.exit(1);
  }

  const mainSrc = path.join(__dirname, "capri-main.js");
  const panelSrc = path.join(__dirname, "capri-panel.js");
  for (const f of [mainSrc, panelSrc]) {
    if (!fs.existsSync(f)) { console.error(path.basename(f) + " not found next to apply.js"); process.exit(1); }
  }
  ensureSharedBackup(asar);

  const header = readHeader(asar);
  const preloadAt = preloadParts(header.json);
  const pkgRaw = readEntry(asar, header.json, header.dataStart, PKG_PARTS);
  const preloadRaw = readEntry(asar, header.json, header.dataStart, preloadAt);
  const indexRaw = readEntry(asar, header.json, header.dataStart, INDEX_PARTS);
  if (!pkgRaw || !preloadRaw || !indexRaw) { console.error("expected files not found in the asar"); process.exit(1); }

  const mainBuf = fs.readFileSync(mainSrc);
  const panelBuf = Buffer.from(
    fs.readFileSync(panelSrc, "utf8").replace("__CAPRI_PANEL_VERSION__", panelVersion()),
    "utf8"
  );
  const preloadBuf = Buffer.from(patchPreload(preloadRaw.toString("utf8"), true), "utf8");
  const indexBuf = Buffer.from(patchIndexHtml(indexRaw.toString("utf8")), "utf8");
  const pkg = JSON.parse(pkgRaw.toString("utf8"));
  pkg.main = LOADER_MAIN;
  const pkgBuf = Buffer.from(JSON.stringify(pkg, null, 2) + "\n", "utf8");

  const existing = nodeAt(header.json, LOADER_PARTS)
    ? readEntry(asar, header.json, header.dataStart, LOADER_PARTS).toString("utf8")
    : null;
  const loaderBuf = Buffer.from(existing ? ensureCapriImport(existing) : LOADER_SRC, "utf8");

  const full = fs.readFileSync(asar);
  const dataBuf = full.subarray(header.dataStart);
  let cursor = dataBuf.length;
  const appended = [];
  const add = (parts, buf) => {
    setEntry(header.json, parts, { size: buf.length, offset: String(cursor), integrity: integrityOf(buf) });
    cursor += buf.length;
    appended.push(buf);
  };
  add(MAIN_PARTS, mainBuf);
  add(PANEL_PARTS, panelBuf);
  add(LOADER_PARTS, loaderBuf);
  add(preloadAt, preloadBuf);
  add(INDEX_PARTS, indexBuf);
  add(PKG_PARTS, pkgBuf);

  const newData = Buffer.concat([dataBuf].concat(appended));
  const headerBytes = pickleString(JSON.stringify(header.json));
  const output = Buffer.concat([pickleUInt32(headerBytes.length), headerBytes, newData]);

  const tmp = asar + ".capri-new";
  fs.writeFileSync(tmp, output);
  const check = readHeader(tmp);
  if (!nodeAt(check.json, MAIN_PARTS) || !nodeAt(check.json, PANEL_PARTS) || !nodeAt(check.json, LOADER_PARTS)) {
    throw new Error("validation of the new app.asar failed");
  }
  fs.renameSync(tmp, asar);

  console.log("Patch applicata: " + asar);
  console.log("Restart OpenCode. The Capri icon is in the prompt bar.");
  console.log("To remove it: node apply.js remove (Capri only) or restore-all (all addons).");
}

function remove(args) {
  const appDir = args.app || defaultAppDir();
  const asar = resolveAsar(appDir);
  if (!fs.existsSync(asar)) { console.error("app.asar not found: " + asar); process.exit(1); }
  if (appRunning() && !args.force) {
    console.error("OpenCode is running. Close it before removing (or use --force).");
    process.exit(1);
  }
  const header = readHeader(asar);
  const preloadAt = preloadParts(header.json);
  const pkgRaw = readEntry(asar, header.json, header.dataStart, PKG_PARTS);
  const preloadRaw = readEntry(asar, header.json, header.dataStart, preloadAt);
  const indexRaw = readEntry(asar, header.json, header.dataStart, INDEX_PARTS);
  if (!pkgRaw || !preloadRaw || !indexRaw) { console.error("expected files not found in the asar"); process.exit(1); }

  const hasLoader = !!nodeAt(header.json, LOADER_PARTS);
  const pkg = JSON.parse(pkgRaw.toString("utf8"));
  // Keep the shared loader as entry when present so other addons keep working.
  pkg.main = hasLoader ? LOADER_MAIN : BASE_MAIN;
  const pkgBuf = Buffer.from(JSON.stringify(pkg, null, 2) + "\n", "utf8");
  const stubBuf = Buffer.from(REMOVED_SENTINEL + "\n", "utf8");
  const preloadBuf = Buffer.from(patchPreload(preloadRaw.toString("utf8"), false), "utf8");
  const indexBuf = Buffer.from(stripIndex(indexRaw.toString("utf8")), "utf8");

  const full = fs.readFileSync(asar);
  const dataBuf = full.subarray(header.dataStart);
  let cursor = dataBuf.length;
  const appended = [];
  const add = (parts, buf) => {
    setEntry(header.json, parts, { size: buf.length, offset: String(cursor), integrity: integrityOf(buf) });
    cursor += buf.length;
    appended.push(buf);
  };
  add(MAIN_PARTS, stubBuf);
  add(preloadAt, preloadBuf);
  add(INDEX_PARTS, indexBuf);
  add(PKG_PARTS, pkgBuf);

  const newData = Buffer.concat([dataBuf].concat(appended));
  const headerBytes = pickleString(JSON.stringify(header.json));
  const output = Buffer.concat([pickleUInt32(headerBytes.length), headerBytes, newData]);
  const tmp = asar + ".capri-new";
  fs.writeFileSync(tmp, output);
  readHeader(tmp);
  fs.renameSync(tmp, asar);
  console.log("Capri panel removed (module neutralized, entry preserved).");
  console.log("Restart OpenCode.");
}

function restoreAll(args) {
  const appDir = args.app || defaultAppDir();
  const asar = resolveAsar(appDir);
  const shared = sharedBackup(asar);
  const legacy = asar + ".deepseek-backup";
  const src = fs.existsSync(shared) ? shared : (fs.existsSync(legacy) ? legacy : null);
  if (!src) { console.error("No backup found (" + shared + ")."); process.exit(1); }
  if (appRunning() && !args.force) {
    console.error("OpenCode is running. Close it before restoring (or use --force).");
    process.exit(1);
  }
  const tmp = asar + ".capri-restore";
  fs.copyFileSync(src, tmp);
  fs.renameSync(tmp, asar);
  console.log("original app.asar restored from: " + src);
  console.log("All addons (DeepSeek, Freelancer, Skills and Capri) have been removed.");
}

function loaderOf(asar, header) {
  return nodeAt(header.json, LOADER_PARTS)
    ? readEntry(asar, header.json, header.dataStart, LOADER_PARTS).toString("utf8")
    : "";
}

function status(args) {
  const appDir = args.app || defaultAppDir();
  const asar = resolveAsar(appDir);
  const shared = sharedBackup(asar);
  console.log("Install dir  : " + appDir);
  console.log("app.asar     : " + (fs.existsSync(asar) ? "ok" : "MISSING"));
  console.log("backup shared: " + (fs.existsSync(shared) ? shared : "absent"));
  if (fs.existsSync(asar)) {
    const header = readHeader(asar);
    const pkg = JSON.parse(readEntry(asar, header.json, header.dataStart, PKG_PARTS).toString("utf8"));
    const mainNode = nodeAt(header.json, MAIN_PARTS);
    const neutral = mainNode ? readEntry(asar, header.json, header.dataStart, MAIN_PARTS).toString("utf8").includes("oc-addon-removed") : false;
    console.log("main         : " + pkg.main);
    console.log("loader       : " + (nodeAt(header.json, LOADER_PARTS) ? "present" : "absent") +
      (loaderOf(asar, header).includes(CAPRI_IMPORT) ? " (capri import ok)" : ""));
    console.log("capri        : " + (neutral ? "removed (stub)" : (mainNode ? "installed" : "absent")));
  }
  console.log("running      : " + (appRunning() ? "yes" : "no"));
}

function verify(args) {
  const appDir = args.app || defaultAppDir();
  const asar = resolveAsar(appDir);
  const header = readHeader(asar);
  const pkg = JSON.parse(readEntry(asar, header.json, header.dataStart, PKG_PARTS).toString("utf8"));
  const preload = readEntry(asar, header.json, header.dataStart, preloadParts(header.json)).toString("utf8");
  const index = readEntry(asar, header.json, header.dataStart, INDEX_PARTS).toString("utf8");
  const main = readEntry(asar, header.json, header.dataStart, MAIN_PARTS);
  const panel = readEntry(asar, header.json, header.dataStart, PANEL_PARTS);
  if (pkg.main !== LOADER_MAIN) throw new Error("package.json main is not the shared loader");
  if (!nodeAt(header.json, LOADER_PARTS)) throw new Error("oc-addons.js (loader) missing");
  if (!loaderOf(asar, header).includes(CAPRI_IMPORT)) throw new Error("loader does not import capri-main.js");
  if (!preload.includes("capriState")) throw new Error("preload: capri bridge missing");
  if (!preload.includes("capriPlugin")) throw new Error("preload: capri plugin bridge missing");
  if (!index.includes(MARKER)) throw new Error("index.html: script tag missing");
  if (!main || !main.toString("utf8").includes("capri-state")) throw new Error("capri-main.js missing/invalid");
  if (!panel || !panel.toString("utf8").includes("__capriPanelLoaded")) throw new Error("capri-panel.js missing/invalid");
  console.log("verify ok: loader + entry + preload + index + panel (" + panel.length + " byte) + main (" + main.length + " byte)");
}

module.exports = { patchPreload, patchIndexHtml, stripIndex, ensureCapriImport, LOADER_SRC, CAPRI_IMPORT };

if (require.main === module) {
  const args = parseArgs(process.argv);
  try {
    if (args.cmd === "install") install(args);
    else if (args.cmd === "remove") remove(args);
    else if (args.cmd === "restore" || args.cmd === "restore-all") restoreAll(args);
    else if (args.cmd === "status") status(args);
    else if (args.cmd === "verify") verify(args);
    else { console.error("Unknown command: " + args.cmd); process.exit(1); }
  } catch (err) {
    console.error("Error: " + (err && err.message ? err.message : err));
    process.exit(1);
  }
}
