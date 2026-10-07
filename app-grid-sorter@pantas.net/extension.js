import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import {QuickMenuToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

/**
 * Sort engine: owns InjectionManager patches and sort-mode listeners.
 * Lives on the Extension so sorting works even when Quick Settings UI is hidden.
 */
class AppGridSortEngine {
  constructor(extension) {
    this._settings = extension.getSettings();
    this._injectionManager = new InjectionManager();
    this._appUsage = Shell.AppUsage.get_default();

    const Controls = Main.overview._overview._controls;
    this._appDisplay = Controls._appDisplay;

    this._patchCompareItems();
    this._connectListeners();
  }

  _getDesktopDirs() {
    const dirs = [];
    const seen = new Set();
    const add = (dir) => {
      if (dir && !seen.has(dir)) {
        seen.add(dir);
        dirs.push(dir);
      }
    };

    // Flatpak exports (common on immutable/Atomic desktops like Bazzite)
    add(GLib.build_filenamev([
      GLib.get_home_dir(), '.local', 'share', 'flatpak', 'exports', 'share', 'applications',
    ]));
    add('/var/lib/flatpak/exports/share/applications');
    add('/var/lib/snapd/desktop/applications');

    // XDG user + system data dirs (covers $XDG_DATA_HOME / $XDG_DATA_DIRS)
    add(GLib.build_filenamev([GLib.get_user_data_dir(), 'applications']));
    for (const dataDir of GLib.get_system_data_dirs())
      add(GLib.build_filenamev([dataDir, 'applications']));

    // Explicit fallbacks
    add('/usr/local/share/applications');
    add('/usr/share/applications');

    return dirs;
  }

  _getDesktopFileMtime(appId) {
    for (const dir of this._getDesktopDirs()) {
      const path = GLib.build_filenamev([dir, appId]);
      if (!GLib.file_test(path, GLib.FileTest.EXISTS))
        continue;

      try {
        const file = Gio.File.new_for_path(path);
        const info = file.query_info('time::modified', Gio.FileQueryInfoFlags.NONE, null);
        const dt = info.get_modification_date_time();
        if (dt)
          return dt.to_unix();
      } catch (e) {
        console.error(`[AppGridSorter] Error reading ${path}: ${e.message}`);
      }
    }

    return 0;
  }

  _patchCompareItems() {
    const settings = this._settings;
    const appUsage = this._appUsage;
    const getDesktopFileMtime = this._getDesktopFileMtime.bind(this);

    this._injectionManager.overrideMethod(
      AppDisplay.AppDisplay.prototype,
      '_compareItems',
      () => {
        return function(a, b) {
          const mode = settings.get_string('sort-mode');

          try {
            if (mode === 'alphabetical') {
              if (!a.name || !b.name) return 0;
              return a.name.localeCompare(b.name);
            }

            if (mode === 'usage') {
              if (!a.id || !b.id) return 0;
              return appUsage.compare(a.id, b.id);
            }

            if (mode === 'date-added') {
              if (!a.id || !b.id)
                return 0;
              const aTime = getDesktopFileMtime(a.id);
              const bTime = getDesktopFileMtime(b.id);
              return bTime - aTime;
            }
          } catch (e) {
            console.error(`[AppGridSorter] Error in comparison: ${e}`);
          }

          return 0;
        };
      }
    );

    this._injectionManager.overrideMethod(
      AppDisplay.AppDisplay.prototype,
      '_redisplay',
      () => {
        return function() {
          const mode = settings.get_string('sort-mode');
          const shouldSort = mode !== 'manual';

          let currentApps = this._orderedItems.slice();
          let currentAppIds = currentApps.map(icon => icon.id);

          let newApps = this._loadApps();
          if (shouldSort)
            newApps = newApps.sort(this._compareItems.bind(this));
          let newAppIds = newApps.map(icon => icon.id);

          let addedApps = newApps.filter(icon => !currentAppIds.includes(icon.id));
          let removedApps = currentApps.filter(icon => !newAppIds.includes(icon.id));

          removedApps.forEach((icon) => {
            this._removeItem(icon);
            icon.destroy();
          });

          const {itemsPerPage} = this._grid;
          newApps.forEach((icon, i) => {
            const page = Math.floor(i / itemsPerPage);
            const position = i % itemsPerPage;

            if (addedApps.includes(icon))
              this._addItem(icon, page, position);
            else
              this._moveItem(icon, page, position);
          });

          this._orderedItems = newApps;
          this.emit('view-loaded');
        };
      }
    );
  }

  resort() {
    if (!this._appDisplay)
      return;

    if (!this._appDisplay._pageManager?._updatingPages)
      this._appDisplay._redisplay();
  }

  _connectListeners() {
    this._settingsHandler = this._settings.connect('changed::sort-mode', () => {
      this.resort();
    });
  }

  destroy() {
    if (this._settingsHandler) {
      this._settings.disconnect(this._settingsHandler);
      this._settingsHandler = null;
    }
    this._injectionManager.clear();
    this._appDisplay = null;
    this._settings = null;
  }
}

const SorterToggle = GObject.registerClass(
  class SorterToggle extends QuickMenuToggle {
    _init(extension) {
      super._init({
        title: 'App Sort',
        iconName: 'view-sort-ascending-symbolic',
        toggleMode: false,
      });

      this._extension = extension;
      this._settings = extension.getSettings();
      this._menuItems = new Map();

      this._addMenuItem('Sort A-Z', 'alphabetical');
      this._addMenuItem('Sort by Usage', 'usage');
      this._addMenuItem('Sort by Last Update', 'date-added');
      this._addMenuItem('Manual', 'manual');

      this._updateActiveItem();

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      const prefsItem = new PopupMenu.PopupMenuItem('Settings…');
      prefsItem.connect('activate', () => {
        Main.extensionManager.openExtensionPrefs(this._extension.metadata.uuid, '', null);
      });
      this.menu.addMenuItem(prefsItem);

      this._settingsHandler = this._settings.connect('changed::sort-mode', () => {
        this._updateActiveItem();
      });
    }

    _addMenuItem(label, mode) {
      const item = new PopupMenu.PopupMenuItem(label);
      item.connect('activate', () => {
        this._settings.set_string('sort-mode', mode);
      });
      this.menu.addMenuItem(item);
      this._menuItems.set(mode, item);
    }

    _updateActiveItem() {
      const currentMode = this._settings.get_string('sort-mode');
      this._menuItems.forEach((item, mode) => {
        if (mode === currentMode)
          item.setOrnament(PopupMenu.Ornament.CHECK);
        else
          item.setOrnament(PopupMenu.Ornament.NONE);
      });
    }

    destroy() {
      if (this._settingsHandler) {
        this._settings.disconnect(this._settingsHandler);
        this._settingsHandler = null;
      }
      super.destroy();
    }
  }
);

const SorterIndicator = GObject.registerClass(
  class SorterIndicator extends SystemIndicator {
    _init(extension) {
      super._init();
      this._toggle = new SorterToggle(extension);
      this.quickSettingsItems.push(this._toggle);
    }

    destroy() {
      this._toggle.destroy();
      super.destroy();
    }
  }
);

export default class AppPickerSorterExtension extends Extension {
  enable() {
    this._settings = this.getSettings();

    // Sort engine always runs; Quick Settings is optional UI only.
    this._sortEngine = new AppGridSortEngine(this);

    if (this._settings.get_boolean('show-in-quick-settings'))
      this._showIndicator();

    this._qsSettingsHandler = this._settings.connect('changed::show-in-quick-settings', () => {
      if (this._settings.get_boolean('show-in-quick-settings'))
        this._showIndicator();
      else
        this._hideIndicator();
    });

    // Apply current mode once on enable
    this._sortEngine.resort();
  }

  _showIndicator() {
    if (!this._indicator) {
      this._indicator = new SorterIndicator(this);
      Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }
  }

  _hideIndicator() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }

  disable() {
    if (this._qsSettingsHandler) {
      this._settings.disconnect(this._qsSettingsHandler);
      this._qsSettingsHandler = null;
    }
    this._hideIndicator();
    if (this._sortEngine) {
      this._sortEngine.destroy();
      this._sortEngine = null;
    }
    this._settings = null;
  }
}
