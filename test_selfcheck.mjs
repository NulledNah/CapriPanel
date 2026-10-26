import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const apply = require(join(here, "apply.js"));

// Loader: a fresh loader has the capri import; an older loader gets it once.
assert.ok(apply.LOADER_SRC.includes('"./capri-main.js"'), "LOADER_SRC must import capri-main.js");
assert.ok(apply.LOADER_SRC.includes('"./deepseek-main.js"'), "LOADER_SRC keeps the other addons");

const old = 'import "./index.js";\nfor (const f of ["./deepseek-main.js", "./freelancer-main.js"]) {\n  try { await import(f); } catch (e) {}\n}\n';
const once = apply.ensureCapriImport(old);
assert.ok(once.includes('"./capri-main.js"'), "missing import added");
assert.equal(apply.ensureCapriImport(once), once, "idempotent");
assert.ok(!apply.ensureCapriImport(apply.LOADER_SRC).includes('"./deepseek-main.js", "./freelancer-main.js", "./skills-main.js", "./capri-main.js", "'), "no duplicate list entry");

// Preload: inject then strip, keeping the base bridge.
const preload = 'electron.contextBridge.exposeInMainWorld("api", api)';
const injected = apply.patchPreload(preload, true);
assert.ok(injected.includes("capriState") && injected.includes("capriPlugin"), "capri bridge injected");
assert.equal(apply.patchPreload(injected, true), injected, "preload patch idempotent");
const stripped = apply.patchPreload(injected, false);
assert.ok(!stripped.includes("capriState") && stripped.includes("exposeInMainWorld"), "capri bridge stripped");

// Renderer: one script tag, no duplicates.
const html = '<html><body><div id="app"></div></body></html>';
const patched = apply.patchIndexHtml(html);
assert.equal((patched.match(/capri-panel\.js/g) || []).length, 1, "one script tag");
assert.equal(apply.patchIndexHtml(patched), patched, "index patch idempotent");
assert.ok(!apply.stripIndex(patched).includes("capri-panel.js"), "strip removes the tag");

// Shipped files carry the markers verify() looks for.
const main = readFileSync(join(here, "capri-main.js"), "utf8");
const panel = readFileSync(join(here, "capri-panel.js"), "utf8");
assert.ok(main.includes("capri-state") && main.includes("capri-command"), "main IPC handlers");
assert.ok(panel.includes("__capriPanelLoaded") && panel.includes("__CAPRI_PANEL_VERSION__"), "panel guard/version");

console.log("selfcheck ok: loader, preload, index, main, panel");
