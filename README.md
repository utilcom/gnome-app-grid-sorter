# App Grid Sorter

A minimal GNOME Shell extension to sort the app grid.

> **Note:** This repository (`utilcom/gnome-app-grid-sorter`) is a **vibe coded** fork.
> Expect agent-assisted edits, small iterative commits, and docs aimed at coding agents.
> Upstream: [panta82/gnome-app-grid-sorter](https://github.com/panta82/gnome-app-grid-sorter).

![screenshot1.png](misc/screenshot1.png)

## Features

- **Multiple Sort Modes**
  - A-Z — Alphabetical order
  - By Usage — Most used apps first
  - By Last Update — Newest installed/modified `.desktop` files first
  - Manual — Default drag-and-drop
- **Quick Settings Toggle** (optional)
  - Switch sort modes from Quick Settings
  - Can be hidden; **sorting still works** from extension preferences / `gsettings`

## Usage

**Via Quick Settings:**
1. Open Quick Settings (top-right corner)
2. Click "App Sort"
3. Choose: Sort A-Z, Sort by Usage, Sort by Last Update, or Manual
4. Click "Settings…" to open preferences

**Via Settings:**
1. Open Extensions / Extension Manager
2. Find "App Grid Sorter"
3. Click the gear icon
4. Choose sort mode and toggle Quick Settings visibility

## Requirements

- GNOME Shell 45, 46, 47, 48, 49, or 50

Extension UUID: `app-grid-sorter@utilcom` (installs under `~/.local/share/gnome-shell/extensions/app-grid-sorter@utilcom/`).

## Development workflow

Build and install:

```bash
./build.sh
./install.sh
```

Then log out and back in (Wayland) or press Alt+F2 → `r` (X11).

On Bazzite / immutable desktops, use Extension Manager to enable the extension, then log out and back in.

Uninstall with:

```bash
./uninstall.sh
```

Useful CLI:

```bash
# View logs
journalctl -f /usr/bin/gnome-shell | grep -i sort

# Set mode via CLI
gsettings set org.gnome.shell.extensions.app-grid-sorter sort-mode 'alphabetical'
gsettings set org.gnome.shell.extensions.app-grid-sorter sort-mode 'usage'
gsettings set org.gnome.shell.extensions.app-grid-sorter sort-mode 'date-added'
gsettings set org.gnome.shell.extensions.app-grid-sorter sort-mode 'manual'

# Toggle Quick Settings visibility
gsettings set org.gnome.shell.extensions.app-grid-sorter show-in-quick-settings true
```

## Architecture (short)

- `AppGridSortEngine` in `extension.js` owns `InjectionManager` patches and `sort-mode` listeners. It always runs from `Extension.enable()` / `disable()`.
- Quick Settings `SorterToggle` is UI only; hiding it must not tear down sorting.
- "Last Update" uses `.desktop` mtimes from Flatpak export dirs, Snap, and XDG data dirs.

See [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md) for agent/contributor guidance.

## Credits

Forked from [panta82/gnome-app-grid-sorter](https://github.com/panta82/gnome-app-grid-sorter).

Inspired by:
- [Alphabetical App Grid](https://github.com/stuarthayhurst/alphabetical-grid-extension)
- [App Grid Wizard](https://github.com/MahdiMirzadeh/app-grid-wizard)

## License

GPL-2.0 (see [LICENSE](LICENSE)). Do not change the LICENSE file to GPL-3 without a clear legal reason and relicensing from all copyright holders.
