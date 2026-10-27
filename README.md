# CapriPanel

A small Capri icon in the OpenCode desktop prompt bar. Clicking it opens a
settings panel in Capri's colours that drives the [Capri for
OpenCode](https://github.com/NulledNah/capri-opencode) app: master on/off,
teleport/satellite/report/chat/demo, language, size,
animations, rest spot, volume/mute, wander, window possession, AI model and
the OpenCode plugin install/remove.

It works by patching the packaged `app.asar` (append-only and reversible) and
shares the single main entry with the DeepSeek, Freelancer and Skills addons,
so they can be installed, removed and updated independently.

## Requirements

- OpenCode desktop (Electron) installed.
- Node.js 18 or newer (to run the installer).
- Capri running: the [Capri for OpenCode](https://github.com/NulledNah/capri-opencode)
  build, which exposes the local control API on `127.0.0.1:47823`. Upstream
  Capri does not have it, so the panel stays **OFFLINE** with anything else.
- Capri's OpenCode plugin installed — *Plugin OpenCode: Installa* in the panel
  does it. Without the plugin the app has no events to show.

## Compatibility

Built and tested against **Capri for OpenCode 0.4.x**. Older 0.3.x builds
expose the same local API, so the panel still works there; 0.4.x adds the
multi-provider chat, and the model list then follows whatever provider is
picked in Capri (Ollama or a cloud/local one).

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
- OpenCode 2 reloads plugins on change, so install/remove from the panel takes
  effect right away; a restart also works.
- The icon falls back to a floating button if the prompt bar layout changes.

## Check

    node test_selfcheck.mjs

## Credits

Capri / Project Capricorn, Cyberpunk and Cyberpunk: Edgerunners belong to CD
PROJEKT RED, Studio Trigger and Netflix. Non-commercial fan project, no
affiliation. The app is a fork of
[mochiiwuff/capri-desktop](https://github.com/mochiiwuff/capri-desktop):
[Capri for OpenCode](https://github.com/NulledNah/capri-opencode). Code: MIT.
