# Contributing

This is the **utilcom** fork of App Grid Sorter — a small GJS GNOME Shell extension, maintained as a vibe-coded project.

## Before you change code

1. Read [AGENTS.md](AGENTS.md) (same guidance for humans and agents).
2. Keep `LICENSE` as GPL-2.0.
3. Push only to `utilcom/gnome-app-grid-sorter`. Do not push to `panta82/gnome-app-grid-sorter`.

## Workflow

```bash
git checkout -b vibe/your-topic
# edit under app-grid-sorter@pantas.net/
./build.sh && ./install.sh
# enable in Extension Manager, log out/in, verify sort modes + QS on/off
git commit
git push -u origin vibe/your-topic
```

## What to test

- Each `sort-mode`: `alphabetical`, `usage`, `date-added`, `manual`
- `show-in-quick-settings` true and false (sorting must work in both)
- Flatpak apps appear with sensible "Last Update" ordering when possible
- Prefs window still sets mode and QS visibility

## Scope tips

- Prefer fixing the sort engine over adding new UI chrome.
- Manual-mode persistence across reboot is a known gap; tackle only when intentional.
- Bump `shell-version` in `metadata.json` only when you’ve exercised that Shell (or clearly note “untested claim”).
