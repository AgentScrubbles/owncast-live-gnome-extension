const {St, Clutter, Gio, GLib} = imports.gi;
const PopupMenu = imports.ui.popupMenu;

/**
 * Menu item for a streaming instance
 */
function StreamerMenuItem(instanceData, openCommand) {
    this._init(instanceData, openCommand);
}

StreamerMenuItem.prototype = {
    __proto__: PopupMenu.PopupMenuItem.prototype,

    _init: function(instanceData, openCommand) {
        // Call parent with just the instance name as label
        PopupMenu.PopupMenuItem.prototype._init.call(this, instanceData.name || instanceData.instance);

        this.instanceData = instanceData;
        this.openCommand = openCommand;

        // Remove the default label and create our custom layout
        this.label.destroy();

        const box = new St.BoxLayout({
            vertical: false,
            style_class: 'owncast-streamer-box'
        });

        // Icon (if available)
        if (instanceData.iconPath) {
            try {
                const file = Gio.File.new_for_path(instanceData.iconPath);
                const icon = new St.Icon({
                    gicon: new Gio.FileIcon({ file }),
                    icon_size: 32,
                    style_class: 'owncast-streamer-icon'
                });
                box.add_child(icon);
            } catch (error) {
                log(`OwncastLive: Failed to load icon: ${error.message}`);
            }
        }

        // Text container
        const textBox = new St.BoxLayout({
            vertical: true,
            style_class: 'owncast-streamer-text'
        });

        // Streamer name
        const nameLabel = new St.Label({
            text: instanceData.name || instanceData.instance,
            style_class: 'owncast-streamer-name'
        });
        textBox.add_child(nameLabel);

        // Stream title
        if (instanceData.streamTitle) {
            const titleLabel = new St.Label({
                text: instanceData.streamTitle,
                style_class: 'owncast-stream-title'
            });
            textBox.add_child(titleLabel);
        }

        // Viewer count
        if (instanceData.viewerCount > 0) {
            const viewersLabel = new St.Label({
                text: `${instanceData.viewerCount} ${instanceData.viewerCount === 1 ? 'viewer' : 'viewers'}`,
                style_class: 'owncast-viewer-count'
            });
            textBox.add_child(viewersLabel);
        }

        box.add_child(textBox);
        this.actor.add_child(box);

        this.connect('activate', () => {
            try {
                const command = this.openCommand.replace('%instance%', this.instanceData.instance);
                log(`OwncastLive: Opening stream with command: ${command}`);
                GLib.spawn_command_line_async(command);
            } catch (error) {
                log(`OwncastLive: Failed to open stream: ${error.message}`);
            }
        });
    }
};

/**
 * Menu item shown when no streams are online
 */
function NobodyMenuItem() {
    this._init();
}

NobodyMenuItem.prototype = {
    __proto__: PopupMenu.PopupMenuItem.prototype,

    _init: function() {
        PopupMenu.PopupMenuItem.prototype._init.call(this, 'Nobody streaming', { reactive: false });
    }
};

/**
 * Menu item for an instance that had an error
 */
function ErrorMenuItem(instanceData) {
    this._init(instanceData);
}

ErrorMenuItem.prototype = {
    __proto__: PopupMenu.PopupMenuItem.prototype,

    _init: function(instanceData) {
        const text = instanceData.name || instanceData.instance;
        PopupMenu.PopupMenuItem.prototype._init.call(this, text, { reactive: false });

        // Add error/offline text below
        if (instanceData.error) {
            this.label.text = text + '\n' + 'Error: ' + instanceData.error;
        } else {
            this.label.text = text + '\n' + 'Offline';
        }
    }
};

// Exports
var StreamerMenuItem = StreamerMenuItem;
var NobodyMenuItem = NobodyMenuItem;
var ErrorMenuItem = ErrorMenuItem;
