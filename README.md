# CapriPanel

A small Capri icon in the OpenCode desktop prompt bar. Clicking it opens a
settings panel in Capri's colours that drives the [Capri](https://github.com/mochiiwuff/capri-desktop)
app: master on/off, teleport/satellite/report/chat/demo, language, size,
animations, rest spot, volume/mute, wander, window possession, Ollama model and
the OpenCode plugin install/remove.

It works by patching the packaged `app.asar` (append-only and reversible) and
shares the single main entry with the DeepSeek, Freelancer and Skills addons,
so they can be installed, removed and updated independently.

## Requirements

- OpenCode desktop (Electron) installed.
- Node.js 18 or newer (to run the installer).
- Capri running (this fork, which exposes the local control API on
  `127.0.0.1:47823`). Without it the panel shows **OFFLINE** and controls are
  disabled.

## Install

Close OpenCode first.

    node apply.js install

or double-click `install.bat`. The CAPRI icon appears in the prompt bar, after
the model/effort controls. Capri must be running to use the panel.

Remove it with `node apply.js remove` (Capri only) or `node apply.js restore-all`
(all addons). `node apply.js status|verify` to inspect.

## How it talks to Capri

The renderer is sandboxed, so `capri-main.js` proxies IPC calls to Capri's local
API:

| IPC | Capri endpoint | |
|---|---|---|
| `capri-state` | `GET /state` | status + config + plugin + models |
| `capri-config` | `POST /config` | patch a setting |
| `capri-command` | `POST /command` | teleport, satellite, report, chat, demo, show/hide, enable/disable |
| `capri-models` | Ollama `/api/tags` | model list |
| `capri-plugin` | `POST /plugin` | install/remove the OpenCode plugin |

`CAPRI_PORT` overrides the port, `OLLAMA_HOST` the Ollama address.

## Notes

- The master switch sends `disable` (watching off + put away) or `enable`.
- Removing/installing the OpenCode plugin takes effect after an OpenCode
  restart (plugins load at startup).
- The icon falls back to a floating button if the prompt bar layout changes.

## Check

    node test_selfcheck.mjs
