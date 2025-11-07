const {GLib, Gio, St, Clutter} = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Api = Me.imports.api;
const Icons = Me.imports.icons;
const TopbarDisplay = Me.imports.topbar.TopbarDisplay;

/**
 * Formats elapsed time from a start time to now
 * @param {string} startTimeStr - ISO 8601 timestamp
 * @returns {string} Formatted elapsed time like [4:35] or [1:23:45]
 */
function formatElapsedTime(startTimeStr) {
    if (!startTimeStr) {
        return '';
    }

    try {
        const startTime = new Date(startTimeStr).getTime();
        const now = Date.now();
        const elapsedMs = now - startTime;

        if (elapsedMs < 0) {
            return '';
        }

        const totalSeconds = Math.floor(elapsedMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `[${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
        } else {
            return `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
        }
    } catch (error) {
        log(`OwncastLive: Error formatting elapsed time: ${error.message}`);
        return '';
    }
}

/**
 * Main extension class
 */
class OwncastLiveExtension {
    constructor() {
        this._settings = null;
        this._indicator = null;
        this._updateTimeout = null;
        this._rotateTimeout = null;
        this._instanceData = [];
        this._previousOnlineStates = new Map();
        this._rotationIndex = 0;
    }

    enable() {
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.owncastlive');

        // Create the panel button
        this._indicator = new PanelMenu.Button(0.0, 'OwncastLive', false);

        // Create topbar display
        this._topbar = new TopbarDisplay();
        this._indicator.add_child(this._topbar.getWidget());

        // Add to panel
        Main.panel.addToStatusArea('owncastlive', this._indicator);

        // Connect settings changes
        this._settingsChangedId = this._settings.connect('changed', () => {
            this._onSettingsChanged();
        });

        // Initial update
        this._updateData();
        this._scheduleUpdate();
        this._scheduleRotation();
    }

    disable() {
        // Cancel timeouts
        if (this._updateTimeout) {
            GLib.Source.remove(this._updateTimeout);
            this._updateTimeout = null;
        }

        if (this._rotateTimeout) {
            GLib.Source.remove(this._rotateTimeout);
            this._rotateTimeout = null;
        }

        // Disconnect settings
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        // Destroy UI
        if (this._topbar) {
            this._topbar.destroy();
            this._topbar = null;
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        this._settings = null;
    }

    /**
     * Schedules the next data update
     */
    _scheduleUpdate() {
        if (this._updateTimeout) {
            GLib.Source.remove(this._updateTimeout);
        }

        const interval = this._settings.get_int('update-interval');
        const milliseconds = interval * 60 * 1000;

        this._updateTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, milliseconds, () => {
            this._updateData();
            this._scheduleUpdate();
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Schedules the rotation of displayed streamers
     */
    _scheduleRotation() {
        if (this._rotateTimeout) {
            GLib.Source.remove(this._rotateTimeout);
        }

        this._rotateTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10000, () => {
            this._rotationIndex++;
            this._updateDisplay();
            this._scheduleRotation();
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Fetches data from all configured instances
     */
    async _updateData() {
        const instancesStr = this._settings.get_string('instances');
        if (!instancesStr || instancesStr.trim() === '') {
            this._instanceData = [];
            this._updateDisplay();
            return;
        }

        const instances = instancesStr.split(',').map(i => i.trim()).filter(i => i !== '');

        try {
            // Fetch data from all instances in parallel
            const promises = instances.map(instance => Api.getInstanceData(instance));
            const results = await Promise.all(promises);

            // Cache icons for instances that have them
            for (const data of results) {
                if (data.logo) {
                    const iconPath = await Icons.getIcon(data.instance, data.logo);
                    if (iconPath) {
                        data.iconPath = iconPath;
                    }
                }
            }

            this._instanceData = results;
            this._checkForNewStreams();
            this._updateDisplay();
        } catch (error) {
            log(`OwncastLive: Failed to update data: ${error.message}`);
        }
    }

    /**
     * Checks for streams that just went live and sends notifications
     */
    _checkForNewStreams() {
        if (!this._settings.get_boolean('notifications')) {
            return;
        }

        for (const instance of this._instanceData) {
            const wasOnline = this._previousOnlineStates.get(instance.instance);
            const isOnline = instance.online;

            // Stream just went live
            if (!wasOnline && isOnline) {
                this._sendNotification(instance);
            }

            // Update state
            this._previousOnlineStates.set(instance.instance, isOnline);
        }
    }

    /**
     * Sends a desktop notification for a stream going live
     * @param {Object} instance - The instance data
     */
    _sendNotification(instance) {
        const title = `${instance.name} is live!`;
        const body = instance.streamTitle || 'Stream has started';

        const source = new MessageTray.Source('OwncastLive', 'emblem-videos-symbolic');
        Main.messageTray.add(source);

        const notification = new MessageTray.Notification(source, title, body);

        // Add icon if available and enabled
        if (this._settings.get_boolean('notification-icons') && instance.iconPath) {
            try {
                const file = Gio.File.new_for_path(instance.iconPath);
                const icon = new Gio.FileIcon({ file });
                notification.setIcon(icon);
            } catch (error) {
                log(`OwncastLive: Failed to set notification icon: ${error.message}`);
            }
        }

        source.showNotification(notification);
    }

    /**
     * Updates the display (topbar and menu)
     */
    _updateDisplay() {
        this._updateTopbar();
        this._updateMenu();
    }

    /**
     * Updates the topbar display
     */
    _updateTopbar() {
        const mode = this._settings.get_string('topbar-mode');
        const hidePlaylists = this._settings.get_boolean('hideplaylists');

        // Hide if configured and nobody is streaming
        const onlineCount = this._instanceData.filter(i => i.online).length;
        if (hidePlaylists && onlineCount === 0) {
            this._topbar.setMode('empty');
            this._indicator.visible = false;
            return;
        }

        this._indicator.visible = true;
        this._topbar.setMode(mode);
        this._topbar.updateWithData(this._instanceData, this._rotationIndex);
    }

    /**
     * Updates the dropdown menu
     */
    _updateMenu() {
        // Clear existing menu items
        this._indicator.menu.removeAll();

        const sortKey = this._settings.get_string('sort-key');
        const openCommand = this._settings.get_string('opencmd');

        // Sort instances
        const sorted = [...this._instanceData].sort((a, b) => {
            if (sortKey === 'viewers') {
                return b.viewerCount - a.viewerCount;
            } else if (sortKey === 'uptime') {
                // Sort by lastConnectTime (most recent first)
                const aTime = a.lastConnectTime ? new Date(a.lastConnectTime).getTime() : 0;
                const bTime = b.lastConnectTime ? new Date(b.lastConnectTime).getTime() : 0;
                return bTime - aTime;
            } else {
                // Sort by name
                return (a.name || a.instance).localeCompare(b.name || b.instance);
            }
        });

        // Add online streams first
        const onlineInstances = sorted.filter(i => i.online);
        for (const instance of onlineInstances) {
            // Create menu item directly with elapsed time
            const elapsedTime = formatElapsedTime(instance.lastConnectTime);
            const timePrefix = elapsedTime ? `${elapsedTime} ` : '';
            const label = `${timePrefix}${instance.name || instance.instance}\n${instance.streamTitle || ''}\n${instance.viewerCount} viewers`;
            const item = new PopupMenu.PopupMenuItem(label);

            // Connect click handler
            item.connect('activate', () => {
                try {
                    const command = openCommand.replace('%instance%', instance.instance);
                    log(`OwncastLive: Opening stream with command: ${command}`);
                    GLib.spawn_command_line_async(command);
                } catch (error) {
                    log(`OwncastLive: Failed to open stream: ${error.message}`);
                }
            });

            this._indicator.menu.addMenuItem(item);
        }

        // Show "Nobody streaming" if no online streams
        if (onlineInstances.length === 0) {
            const item = new PopupMenu.PopupMenuItem('Nobody streaming', { reactive: false });
            this._indicator.menu.addMenuItem(item);
        }

        // Optionally show offline instances
        const offlineInstances = sorted.filter(i => !i.online);
        if (offlineInstances.length > 0 && onlineInstances.length > 0) {
            // Add separator
            this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // Add offline instances
            for (const instance of offlineInstances) {
                const label = `${instance.name || instance.instance}\nOffline`;
                const item = new PopupMenu.PopupMenuItem(label, { reactive: false });
                this._indicator.menu.addMenuItem(item);
            }
        }
    }

    /**
     * Called when settings change
     */
    _onSettingsChanged() {
        // Reschedule update with new interval
        this._scheduleUpdate();

        // Update display immediately
        this._updateData();
    }
}

let extension = null;

function init() {
    log('OwncastLive: Initializing extension');
}

function enable() {
    log('OwncastLive: Enabling extension');
    extension = new OwncastLiveExtension();
    extension.enable();
}

function disable() {
    log('OwncastLive: Disabling extension');
    if (extension) {
        extension.disable();
        extension = null;
    }
}
