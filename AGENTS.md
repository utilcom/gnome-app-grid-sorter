# AGENTS.md — coding-agent guide for App Grid Sorter

This is a **vibe coded** GNOME Shell extension fork (`utilcom/gnome-app-grid-sorter`). Prefer small, reviewable commits. Push only to `origin` (utilcom). Never push to `upstream` (fetch-only original project).

## Repo layout

| Path | Role |
|------|------|
| `app-grid-sorter@utilcom/extension.js` | Runtime: sort engine + optional Quick Settings UI |
| `app-grid-sorter@utilcom/prefs.js` | Adw preferences window |
| `app-grid-sorter@utilcom/metadata.json` | UUID, shell-version, url |
| `app-grid-sorter@utilcom/schemas/*.gschema.xml` | GSettings keys |
| `build.sh` / `install.sh` / `uninstall.sh` | Pack, install to `~/.local/share/gnome-shell/extensions/`, remove |
| `LICENSE` | **GPL-2.0 — do not rewrite** |

UUID is `app-grid-sorter@utilcom` (matches installed path). GSettings schema id remains `org.gnome.shell.extensions.app-grid-sorter`.

## Git remotes

- `origin` → `https://github.com/utilcom/gnome-app-grid-sorter.git` (fetch + push)
- `upstream` → original project (fetch only; push disabled) — see README Credits

Work on a feature branch (e.g. `vibe/fixes`), then merge/push to utilcom. No force-push to shared branches unless the human asks. Ask before every push.

## Design rules (do not regress)

1. **Sort engine ≠ Quick Settings.** `AppGridSortEngine` must start in `Extension.enable()` and stop in `disable()`. QS toggle is optional chrome only.
2. **Manual mode must call `originalMethod`.** `InjectionManager.overrideMethod` passes the saved Shell method — use it for `_compareItems` and `_redisplay` when `sort-mode === 'manual'` so `app-picker-layout` / page manager order survives redisplay and reboot. Sorted modes keep the custom index-based `_redisplay`.
3. **Last Update** resolves `.desktop` mtimes via Flatpak exports + XDG user/system data dirs. Cache mtimes per redisplay; reject `appId` values that contain `/`, `\\`, or NUL (no path escape). Prefer `GLib.get_user_data_dir()` / `GLib.get_system_data_dirs()` over hardcoding only `/usr/share/applications`.
4. Match existing GJS style: ESM imports, `InjectionManager.overrideMethod`, Adw prefs, `console.error` with `[AppGridSorter]` prefix.

## Build / install / debug

```bash
./build.sh
./install.sh          # do NOT pass --restart unless the human wants a shell kill
# Human enables in Extension Manager and logs out/in on Wayland (Bazzite)

journalctl -f /usr/bin/gnome-shell | grep -i sort
gsettings get org.gnome.shell.extensions.app-grid-sorter sort-mode
```

Installed path:

`~/.local/share/gnome-shell/extensions/app-grid-sorter@utilcom/`

After schema edits, `install.sh` runs `glib-compile-schemas` on that path.

## Supported Shell versions

Target Ubuntu LTS **current minus one** through current: GNOME Shell **46+** (24.04 = 46; drop 45). Claim `shell-version` entries only for 46–50 in `metadata.json`. Prefer smoke tests on those versions before releasing.

## Shell APIs used

- Override `AppDisplay.AppDisplay.prototype._compareItems` and `_redisplay`
- `Shell.AppUsage.get_default().compare(id_a, id_b)` for usage mode
- `Main.overview._overview._controls._appDisplay` for forced redisplay
- Quick Settings: `QuickMenuToggle` + `SystemIndicator` + `addExternalIndicator`

## Common pitfalls

- Putting `InjectionManager` on the QS toggle → sorting dies when QS is hidden
- Ignoring `originalMethod` in overrides → Manual mode breaks (order won't stick)
- Claiming shell versions in `metadata.json` without a smoke test on that Shell
- Changing LICENSE to GPL-3 to "match" an old README typo
- Pushing to upstream / opening PRs against the original project unless the human explicitly asks
- Changing UUID without uninstalling the old install path and a logout/in

## When unsure

Ask the human before: force-push, changing UUID/schema id, relicensing, killing gnome-shell, or publishing releases.
