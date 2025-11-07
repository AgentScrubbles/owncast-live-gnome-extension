# OwncastLive Panel - GNOME Shell Extension

A GNOME Shell extension that monitors your favorite Owncast instances and notifies you when they go live.

## Features

- Monitor multiple Owncast instances
- Desktop notifications when streams go live
- Multiple display modes (text, count, icons)
- Configurable poll interval (1-30 minutes)
- Click to open streams in your browser
- Sort streams by name, viewer count, or uptime
- Cached instance logos for quick display
- No authentication required (uses public Owncast APIs)

## Installation

### From Source

1. Clone or copy this repository to your GNOME Shell extensions directory:
   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions
   cp -r owncastlive-extension ~/.local/share/gnome-shell/extensions/OwncastLive_Panel@extensions.owncastlive
   ```

2. Compile the settings schema:
   ```bash
   cd ~/.local/share/gnome-shell/extensions/OwncastLive_Panel@extensions.owncastlive
   glib-compile-schemas schemas/
   ```

3. Restart GNOME Shell:
   - On X11: Press `Alt+F2`, type `r`, and press Enter
   - On Wayland: Log out and log back in

4. Enable the extension:
   ```bash
   gnome-extensions enable OwncastLive_Panel@extensions.owncastlive
   ```

   Or use the Extensions app (GNOME Extensions Manager)

## Usage

### Adding Owncast Instances

1. Open the extension preferences:
   - Click on the extension icon in the top panel
   - Or run: `gnome-extensions prefs OwncastLive_Panel@extensions.owncastlive`

2. Click "Add Instance"

3. Enter the Owncast instance URL (e.g., `owncast.example.com` or `https://stream.example.com`)
   - You can omit the `https://` prefix - it will be added automatically
   - Enter just the domain name (e.g., `owncast.scrubbles.tech`)

4. Click "Add"

The extension will start polling the instance immediately and show its status.

### Settings

#### General Settings

- **Update Interval**: How often to check for stream status (1-30 minutes, default: 5)
- **Stream Open Command**: Command executed when clicking a stream
  - Default: `xdg-open https://%instance%`
  - `%instance%` is replaced with the instance URL
  - Example alternatives:
    - `firefox https://%instance%`
    - `mpv https://%instance%/hls/stream.m3u8` (direct stream with MPV)
- **Sort Streams By**: How to order streams in the dropdown
  - Name (alphabetical)
  - Viewer Count (most viewers first)
  - Stream Start Time (most recent first)

#### Display Settings

- **Topbar Display Mode**:
  - **Text Only**: Shows streamer names, rotating every 10 seconds
  - **Count Only**: Shows "X live" (e.g., "3 live")
  - **Icon Only**: Shows instance logos, rotating every 10 seconds

- **Hide When Nobody Streaming**: Hide the panel icon when no streams are live

#### Notifications

- **Enable Notifications**: Show desktop notifications when streams go live
- **Show Icons in Notifications**: Display instance logos in notifications

## How It Works

The extension polls each configured Owncast instance's public API endpoints:

- `/api/status` - Gets stream status, viewer count, and stream title
- `/api/config` - Gets instance name, logo, and metadata

No authentication is required since these are public endpoints on Owncast servers.

When a stream goes live (transitions from offline to online), a desktop notification is sent if enabled.

## Architecture

Based on the TwitchLive GNOME Shell extension but adapted for Owncast:

- **No OAuth required** - Owncast APIs are public
- **Instance-based** - Each Owncast server is one streamer (self-hosted nature)
- **Manual management** - Add instances by URL (no "import followers" feature)
- **Simpler polling** - One API call per instance instead of batch requests

## File Structure

```
owncastlive-extension/
├── extension.js          # Main extension logic
├── api.js               # Owncast API integration
├── icons.js             # Icon caching system
├── topbar.js            # Panel display modes
├── menu_items.js        # Dropdown menu items
├── prefs.js             # Preferences UI
├── metadata.json        # Extension metadata
├── stylesheet.css       # Styling
└── schemas/             # Settings schema
    └── org.gnome.shell.extensions.owncastlive.gschema.xml
```

## Troubleshooting

### Extension won't load

- Make sure you compiled the schemas: `glib-compile-schemas schemas/`
- Check GNOME Shell version compatibility (requires 46 or 47)
- Look for errors: `journalctl -f -o cat /usr/bin/gnome-shell`

### Instance not showing up

- Verify the instance URL is correct and accessible
- Check the instance is actually online (visit it in a browser)
- Make sure the Owncast server has CORS enabled (usually enabled by default)
- Look for errors in the extension logs

### Icons not displaying

- Icons are downloaded and cached in `~/.cache/owncastlive-extension/`
- Make sure the Owncast instance has a logo configured
- Icons are downloaded when the instance is first polled

### Notifications not working

- Enable notifications in the extension preferences
- Check that GNOME notifications are not in Do Not Disturb mode
- Verify the stream actually went from offline to online (no notification on first poll)

## Credits

Inspired by and adapted from:
- [TwitchLive Panel](https://github.com/maweki/twitchlive-extension) by maweki

Built for the [Owncast](https://github.com/owncast/owncast) self-hosted streaming platform.

## License

This extension is provided as-is for use with Owncast instances.
