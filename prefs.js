/**
 * OwncastLive Panel Extension Preferences - ESM version for GNOME 45+
 */

import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class OwncastLivePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.owncastlive');

        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });

        // Main settings group
        const mainGroup = new Adw.PreferencesGroup({
            title: 'OwncastLive Settings',
            description: 'Configure your Owncast instance monitoring',
        });

        // Instances entry
        const instancesRow = new Adw.EntryRow({
            title: 'Owncast Instances',
            text: settings.get_string('instances'),
        });
        instancesRow.set_tooltip_text('Enter Owncast instance URLs separated by commas (e.g., owncast.example.com,stream.another.com)');
        instancesRow.connect('changed', () => {
            settings.set_string('instances', instancesRow.get_text());
        });
        mainGroup.add(instancesRow);

        // Update interval
        const intervalRow = new Adw.SpinRow({
            title: 'Update Interval',
            subtitle: 'Minutes between status checks',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 30,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('update-interval'),
            }),
        });
        intervalRow.connect('notify::value', () => {
            settings.set_int('update-interval', intervalRow.get_value());
        });
        mainGroup.add(intervalRow);

        // Display mode
        const modeRow = new Adw.ComboRow({
            title: 'Display Mode',
            subtitle: 'How to show stream info in the panel',
        });
        const modeModel = new Gtk.StringList();
        modeModel.append('Text Only');
        modeModel.append('Count Only');
        modeModel.append('Icon Only');
        modeRow.set_model(modeModel);

        // Set initial selection based on current setting
        const currentMode = settings.get_string('topbar-mode');
        const modeMap = { 'text_only': 0, 'count_only': 1, 'icon_only': 2 };
        modeRow.set_selected(modeMap[currentMode] || 0);

        modeRow.connect('notify::selected', () => {
            const modes = ['text_only', 'count_only', 'icon_only'];
            settings.set_string('topbar-mode', modes[modeRow.get_selected()]);
        });
        mainGroup.add(modeRow);

        // Sort by
        const sortRow = new Adw.ComboRow({
            title: 'Sort Streams By',
            subtitle: 'Order of streams in the menu',
        });
        const sortModel = new Gtk.StringList();
        sortModel.append('Name');
        sortModel.append('Viewer Count');
        sortModel.append('Stream Start Time');
        sortRow.set_model(sortModel);

        const currentSort = settings.get_string('sort-key');
        const sortMap = { 'name': 0, 'viewers': 1, 'uptime': 2 };
        sortRow.set_selected(sortMap[currentSort] || 0);

        sortRow.connect('notify::selected', () => {
            const sorts = ['name', 'viewers', 'uptime'];
            settings.set_string('sort-key', sorts[sortRow.get_selected()]);
        });
        mainGroup.add(sortRow);

        page.add(mainGroup);

        // Notifications group
        const notifGroup = new Adw.PreferencesGroup({
            title: 'Notifications',
        });

        // Enable notifications
        const notifRow = new Adw.SwitchRow({
            title: 'Enable Notifications',
            subtitle: 'Get notified when streams go live',
        });
        settings.bind('notifications', notifRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        notifGroup.add(notifRow);

        // Notification icons
        const notifIconRow = new Adw.SwitchRow({
            title: 'Show Icons in Notifications',
            subtitle: 'Display stream logos in notifications',
        });
        settings.bind('notification-icons', notifIconRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        notifGroup.add(notifIconRow);

        page.add(notifGroup);

        // Display group
        const displayGroup = new Adw.PreferencesGroup({
            title: 'Panel Display',
        });

        // Hide when nobody streaming
        const hideRow = new Adw.SwitchRow({
            title: 'Hide When Nobody Streaming',
            subtitle: 'Hide the panel indicator when no streams are live',
        });
        settings.bind('hideplaylists', hideRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(hideRow);

        page.add(displayGroup);

        // Advanced group
        const advGroup = new Adw.PreferencesGroup({
            title: 'Advanced',
        });

        // Open command
        const cmdRow = new Adw.EntryRow({
            title: 'Stream Open Command',
            text: settings.get_string('opencmd'),
        });
        cmdRow.set_tooltip_text('Command to execute when clicking a stream. Use %instance% for the URL.');
        cmdRow.connect('changed', () => {
            settings.set_string('opencmd', cmdRow.get_text());
        });
        advGroup.add(cmdRow);

        page.add(advGroup);

        window.add(page);
    }
}
