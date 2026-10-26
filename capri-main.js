/*
 * Capri bridge for the OpenCode desktop main process.
 *
 * Added to resources/app.asar as out/main/capri-main.js and loaded by the
 * shared entry out/main/oc-addons.js (see apply.js). It proxies a few IPC calls
 * to the Capri app's local HTTP API (127.0.0.1:47823):
 *
 *   capri-state   -> app status + config + plugin + Ollama models
 *   capri-config  -> patch a setting ({ claude, muted, volume, scale, ... })
 *   capri-command -> quick action (teleport, satellite, report, chat, demo, ...)
 *   capri-models  -> Ollama model names
 *   capri-plugin  -> install / remove the OpenCode plugin for Capri
 *
 * The renderer is sandboxed (no http), so the calls live here in main.
 */
import { ipcMain } from "electron";
import http from "node:http";

const PORT = Number(process.env.CAPRI_PORT) || 47823;
const OLLAMA = normalizeBase(process.env.OLLAMA_HOST || "http://127.0.0.1:11434");

function normalizeBase(value) {
  const text = String(value || "").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(text) ? text : "http://" + text;
}

function request(url, { method = "GET", body, timeout = 2000 } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), "utf8");
    const req = http.request(url, {
      method,
      timeout,
      headers: payload
        ? { "content-type": "application/json", "content-length": payload.length }
        : undefined,
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = {};
        try { json = text ? JSON.parse(text) : {}; } catch (e) { json = { ok: false, error: "invalid JSON" }; }
        resolve(json);
      });
    });
    req.on("timeout", () => { req.destroy(new Error("timeout")); });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function capri(path, options) {
  return request(`http://127.0.0.1:${PORT}${path}`, options);
}

async function models() {
  try {
    const tags = await request(`${OLLAMA}/api/tags`, { timeout: 1500 });
    return (tags.models || []).map((m) => m.name).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function safe(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  };
}

ipcMain.handle("capri-state", safe(async () => {
  const state = await capri("/state");
  if (!state || state.ok !== true) return { ok: false, error: (state && state.error) || "Capri is not running" };
  state.models = await models();
  return state;
}));

ipcMain.handle("capri-config", safe((_event, patch) => capri("/config", { method: "POST", body: patch || {} })));

ipcMain.handle("capri-command", safe((_event, name) => capri("/command", { method: "POST", body: { name: String(name || "") } })));

ipcMain.handle("capri-models", safe(() => models()));

ipcMain.handle("capri-plugin", safe((_event, action) => capri("/plugin", { method: "POST", body: { action: String(action || "status") } })));
