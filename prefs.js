const {Gtk, Gio} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

function init() {
}

function buildPrefsWidget() {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.owncastlive');

    // Create a simple grid layout
    let grid = new Gtk.Grid();
    grid.margin = 20;
    grid.row_spacing = 10;
    grid.column_spacing = 10;

    let row = 0;

    // Title
    let titleLabel = new Gtk.Label({
        label: '<b>OwncastLive Settings</b>',
        use_markup: true,
        halign: Gtk.Align.START
    });
    grid.attach(titleLabel, 0, row++, 2, 1);

    // Instances entry
    let instancesLabel = new Gtk.Label({
        label: 'Owncast Instances (comma-separated):',
        halign: Gtk.Align.START
    });
    let instancesEntry = new Gtk.Entry({
        text: settings.get_string('instances'),
        hexpand: true,
        tooltip_text: 'Enter Owncast instance URLs separated by commas (e.g., owncast.example.com,stream.another.com)'
    });
    instancesEntry.connect('changed', function(widget) {
        settings.set_string('instances', widget.get_text());
    });
    grid.attach(instancesLabel, 0, row, 1, 1);
    grid.attach(instancesEntry, 1, row++, 1, 1);

    // Update interval
    let intervalLabel = new Gtk.Label({
        label: 'Update Interval (minutes):',
        halign: Gtk.Align.START
    });
    let intervalSpin = new Gtk.SpinButton();
    intervalSpin.set_range(1, 30);
    intervalSpin.set_increments(1, 5);
    intervalSpin.set_value(settings.get_int('update-interval'));
    intervalSpin.connect('value-changed', function(widget) {
        settings.set_int('update-interval', widget.get_value());
    });
    grid.attach(intervalLabel, 0, row, 1, 1);
    grid.attach(intervalSpin, 1, row++, 1, 1);

    // Display mode
    let modeLabel = new Gtk.Label({
        label: 'Display Mode:',
        halign: Gtk.Align.START
    });
    let modeCombo = new Gtk.ComboBoxText();
    modeCombo.append('text_only', 'Text Only');
    modeCombo.append('count_only', 'Count Only');
    modeCombo.append('icon_only', 'Icon Only');
    modeCombo.set_active_id(settings.get_string('topbar-mode'));
    modeCombo.connect('changed', function(widget) {
        settings.set_string('topbar-mode', widget.get_active_id());
    });
    grid.attach(modeLabel, 0, row, 1, 1);
    grid.attach(modeCombo, 1, row++, 1, 1);

    // Notifications
    let notifLabel = new Gtk.Label({
        label: 'Enable Notifications:',
        halign: Gtk.Align.START
    });
    let notifSwitch = new Gtk.Switch({
        active: settings.get_boolean('notifications')
    });
    notifSwitch.connect('notify::active', function(widget) {
        settings.set_boolean('notifications', widget.get_active());
    });
    grid.attach(notifLabel, 0, row, 1, 1);
    grid.attach(notifSwitch, 1, row++, 1, 1);

    // Hide when nobody streaming
    let hideLabel = new Gtk.Label({
        label: 'Hide When Nobody Streaming:',
        halign: Gtk.Align.START
    });
    let hideSwitch = new Gtk.Switch({
        active: settings.get_boolean('hideplaylists')
    });
    hideSwitch.connect('notify::active', function(widget) {
        settings.set_boolean('hideplaylists', widget.get_active());
    });
    grid.attach(hideLabel, 0, row, 1, 1);
    grid.attach(hideSwitch, 1, row++, 1, 1);

    // Open command
    let cmdLabel = new Gtk.Label({
        label: 'Stream Open Command:',
        halign: Gtk.Align.START
    });
    let cmdEntry = new Gtk.Entry({
        text: settings.get_string('opencmd'),
        hexpand: true,
        tooltip_text: 'Command to execute when clicking a stream. Use %instance% for the URL.'
    });
    cmdEntry.connect('changed', function(widget) {
        settings.set_string('opencmd', widget.get_text());
    });
    grid.attach(cmdLabel, 0, row, 1, 1);
    grid.attach(cmdEntry, 1, row++, 1, 1);

    return grid;
}
