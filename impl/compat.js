/**
 * Compatibility layer for GNOME Shell version differences
 * This module provides unified APIs that work across GNOME 42-49
 */

/**
 * Sends a notification using the appropriate API for the GNOME version
 * @param {Object} params - Notification parameters
 * @param {Object} params.Main - The Main module (ui/main.js)
 * @param {Object} params.MessageTray - The MessageTray module
 * @param {Object} params.Gio - The Gio module (for icons)
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body text
 * @param {string} [params.iconPath] - Optional path to icon file
 * @param {boolean} [params.useIcon] - Whether to use the icon
 */
function sendNotification(params) {
    const { Main, MessageTray, Gio, title, body, iconPath, useIcon } = params;

    // Detect GNOME 46+ by checking for object-style constructor support
    // In GNOME 46+, Source constructor takes an object parameter
    const isGnome46Plus = _isGnome46Plus(MessageTray);

    let source;
    let notification;

    if (isGnome46Plus) {
        // GNOME 46+ API: Object-style constructors
        source = new MessageTray.Source({
            title: 'OwncastLive',
            iconName: 'emblem-videos-symbolic',
        });
        Main.messageTray.add(source);

        notification = new MessageTray.Notification({
            source: source,
            title: title,
            body: body,
        });

        // Set icon if available
        if (useIcon && iconPath) {
            try {
                const file = Gio.File.new_for_path(iconPath);
                const gicon = new Gio.FileIcon({ file });
                notification.gicon = gicon;
            } catch (error) {
                log(`OwncastLive: Failed to set notification icon: ${error.message}`);
            }
        }

        source.addNotification(notification);
    } else {
        // GNOME 45 and earlier API: Positional arguments
        source = new MessageTray.Source('OwncastLive', 'emblem-videos-symbolic');
        Main.messageTray.add(source);

        notification = new MessageTray.Notification(source, title, body);

        // Set icon if available
        if (useIcon && iconPath) {
            try {
                const file = Gio.File.new_for_path(iconPath);
                const icon = new Gio.FileIcon({ file });
                notification.setIcon(icon);
            } catch (error) {
                log(`OwncastLive: Failed to set notification icon: ${error.message}`);
            }
        }

        source.showNotification(notification);
    }
}

/**
 * Detects if we're running on GNOME 46+ by checking MessageTray.Source behavior
 * @param {Object} MessageTray - The MessageTray module
 * @returns {boolean} True if GNOME 46+
 */
function _isGnome46Plus(MessageTray) {
    // In GNOME 46+, Source requires an object parameter
    // We can detect this by checking if the constructor signature changed
    // A safer approach is to check for the existence of new methods/properties
    try {
        // GNOME 46+ has addNotification instead of showNotification on Source prototype
        // Check if Source.prototype.addNotification exists
        if (MessageTray.Source.prototype.addNotification) {
            return true;
        }
    } catch (e) {
        // Fallback to false if we can't determine
    }
    return false;
}

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

// ESM exports (GNOME 45+)
export { sendNotification, formatElapsedTime };
