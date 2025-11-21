/**
 * Topbar display module for OwncastLive
 * ESM module for GNOME 45+
 */

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
        return '';
    }
}

/**
 * Creates and manages the topbar panel display
 */
class TopbarDisplay {
    /**
     * @param {Object} params - Constructor parameters
     * @param {Object} params.St - The St module
     * @param {Object} params.Clutter - The Clutter module
     * @param {Object} params.Gio - The Gio module
     * @param {Object} params.GLib - The GLib module
     * @param {string} params.extensionPath - Path to the extension directory
     */
    constructor(params) {
        const { St, Clutter, Gio, GLib, extensionPath } = params;

        this._St = St;
        this._Gio = Gio;

        this.container = new St.BoxLayout({
            style_class: 'panel-button',
            reactive: true,
            can_focus: true,
            track_hover: true
        });

        // Owncast icon (shown when streaming)
        // Try symbolic icon first (adapts to theme), then original, then system fallback
        this.broadcastIcon = this._createBroadcastIcon(GLib, Gio, extensionPath);

        this.icon = new St.Icon({
            style_class: 'system-status-icon',
            icon_size: 16
        });

        this.label = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'owncast-panel-label'
        });

        this.currentMode = 'text_only';
        this.currentIndex = 0;
        this.instances = [];
    }

    /**
     * Sets the display mode
     * @param {string} mode - Display mode: 'text_only', 'count_only', 'icon_only', or 'empty'
     */
    setMode(mode) {
        this.currentMode = mode;
        this.update();
    }

    /**
     * Updates the display with current instance data
     * @param {Array} instances - Array of instance data objects
     * @param {number} index - Current rotation index (for cycling through online instances)
     */
    updateWithData(instances, index = 0) {
        this.instances = instances;
        this.currentIndex = index;
        this.update();
    }

    /**
     * Updates the topbar display based on current mode and data
     */
    update() {
        // Clear current children
        this.container.remove_all_children();

        const onlineInstances = this.instances.filter(i => i.online);
        const onlineCount = onlineInstances.length;

        // If hiding when nobody is streaming
        if (onlineCount === 0) {
            this.label.set_text('');
            return;
        }

        switch (this.currentMode) {
            case 'text_only':
                this._updateTextOnly(onlineInstances);
                break;
            case 'count_only':
                this._updateCountOnly(onlineCount);
                break;
            case 'icon_only':
                this._updateIconOnly(onlineInstances);
                break;
            case 'empty':
                // Don't show anything
                break;
            default:
                this._updateTextOnly(onlineInstances);
        }
    }

    /**
     * Updates display in text-only mode
     * @param {Array} onlineInstances - Array of online instances
     */
    _updateTextOnly(onlineInstances) {
        if (onlineInstances.length === 0) {
            // Show icon only when nobody streaming (unless hidden)
            this.container.add_child(this.broadcastIcon);
            return;
        }

        // Add broadcast icon on the left
        this.container.add_child(this.broadcastIcon);

        const instance = onlineInstances[this.currentIndex % onlineInstances.length];
        const elapsedTime = formatElapsedTime(instance.lastConnectTime);
        const displayText = elapsedTime ? `${elapsedTime} ${instance.name || instance.instance}` : (instance.name || instance.instance);
        this.label.set_text(displayText);
        this.container.add_child(this.label);
    }

    /**
     * Updates display in count-only mode
     * @param {number} count - Number of online instances
     */
    _updateCountOnly(count) {
        // Add broadcast icon on the left
        this.container.add_child(this.broadcastIcon);

        const text = count === 1 ? '1 live' : `${count} live`;
        this.label.set_text(text);
        this.container.add_child(this.label);
    }

    /**
     * Updates display in icon-only mode
     * @param {Array} onlineInstances - Array of online instances
     */
    _updateIconOnly(onlineInstances) {
        if (onlineInstances.length === 0) {
            // Show broadcast icon only when nobody streaming (unless hidden)
            this.container.add_child(this.broadcastIcon);
            return;
        }

        // Add broadcast icon on the left
        this.container.add_child(this.broadcastIcon);

        const instance = onlineInstances[this.currentIndex % onlineInstances.length];

        // Try to load the cached icon
        if (instance.iconPath) {
            try {
                const file = this._Gio.File.new_for_path(instance.iconPath);
                const icon = new this._Gio.FileIcon({ file });
                this.icon.gicon = icon;
                this.container.add_child(this.icon);
                return;
            } catch (error) {
                log(`OwncastLive: Failed to load icon for ${instance.instance}: ${error.message}`);
            }
        }

        // Fallback to text if no icon available
        this.label.set_text(instance.name || instance.instance);
        this.container.add_child(this.label);
    }

    /**
     * Creates the broadcast icon with fallback options
     * @param {Object} GLib - The GLib module
     * @param {Object} Gio - The Gio module
     * @param {string} extensionPath - Path to the extension directory
     * @returns {St.Icon} The created icon
     */
    _createBroadcastIcon(GLib, Gio, extensionPath) {
        // Try symbolic icon first (adapts to theme colors)
        const iconFiles = [
            'owncast-symbolic.svg',
            'owncast-icon.svg'
        ];

        for (const iconName of iconFiles) {
            try {
                const iconPath = GLib.build_filenamev([extensionPath, iconName]);
                const iconFile = Gio.File.new_for_path(iconPath);

                if (iconFile.query_exists(null)) {
                    const gicon = Gio.icon_new_for_string(iconPath);
                    return new this._St.Icon({
                        gicon: gicon,
                        style_class: 'system-status-icon',
                        icon_size: 16
                    });
                }
            } catch (error) {
                console.log(`OwncastLive: Could not load ${iconName}: ${error.message}`);
            }
        }

        // Fallback to system icon
        console.log('OwncastLive: Using fallback system icon');
        return new this._St.Icon({
            icon_name: 'emblem-videos-symbolic',
            style_class: 'system-status-icon',
            icon_size: 16
        });
    }

    /**
     * Gets the container widget to add to the panel
     * @returns {St.BoxLayout} The container widget
     */
    getWidget() {
        return this.container;
    }

    /**
     * Destroys the topbar display
     */
    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }
}

// ESM export (GNOME 45+)
export { TopbarDisplay };
