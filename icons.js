const {GLib, Gio, Soup} = imports.gi;

const CACHE_DIR = GLib.build_filenamev([GLib.get_user_cache_dir(), 'owncastlive-extension']);
const TIMEOUT = 10; // 10 seconds

/**
 * Ensures the cache directory exists
 */
function ensureCacheDir() {
    const dir = Gio.File.new_for_path(CACHE_DIR);
    if (!dir.query_exists(null)) {
        dir.make_directory_with_parents(null);
    }
}

/**
 * Gets a safe filename from an instance URL
 * @param {string} instanceUrl - The instance URL
 * @returns {string} Safe filename
 */
function getSafeFilename(instanceUrl) {
    // Remove protocol and replace special chars with underscores
    return instanceUrl
        .replace(/^https?:\/\//, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Gets the cached icon path for an instance
 * @param {string} instanceUrl - The instance URL
 * @returns {string|null} Path to cached icon, or null if not cached
 */
function getCachedIconPath(instanceUrl) {
    ensureCacheDir();
    const filename = getSafeFilename(instanceUrl) + '.png';
    const path = GLib.build_filenamev([CACHE_DIR, filename]);
    const file = Gio.File.new_for_path(path);

    if (file.query_exists(null)) {
        return path;
    }
    return null;
}

/**
 * Downloads an icon from a URL and caches it
 * @param {string} instanceUrl - The instance URL (for cache naming)
 * @param {string} iconUrl - The URL of the icon to download
 * @returns {Promise<string|null>} Path to cached icon, or null on failure
 */
async function downloadAndCacheIcon(instanceUrl, iconUrl) {
    ensureCacheDir();

    // If iconUrl is relative, make it absolute
    let fullIconUrl = iconUrl;
    if (iconUrl && !iconUrl.match(/^https?:\/\//)) {
        const baseUrl = instanceUrl.replace(/^https?:\/\//, '');
        fullIconUrl = `https://${baseUrl}${iconUrl.startsWith('/') ? '' : '/'}${iconUrl}`;
    }

    const session = new Soup.Session({ timeout: TIMEOUT });
    const message = Soup.Message.new('GET', fullIconUrl);

    if (!message) {
        log(`OwncastLive: Invalid icon URL: ${fullIconUrl}`);
        return null;
    }

    try {
        const bytes = await session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null
        );

        if (message.status_code !== 200) {
            log(`OwncastLive: Failed to download icon: HTTP ${message.status_code}`);
            return null;
        }

        const filename = getSafeFilename(instanceUrl) + '.png';
        const path = GLib.build_filenamev([CACHE_DIR, filename]);
        const file = Gio.File.new_for_path(path);

        // Save the icon
        file.replace_contents(
            bytes.get_data(),
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null
        );

        return path;
    } catch (error) {
        log(`OwncastLive: Failed to download icon from ${fullIconUrl}: ${error.message}`);
        return null;
    }
}

/**
 * Gets an icon for an instance, downloading if necessary
 * @param {string} instanceUrl - The instance URL
 * @param {string} iconUrl - The URL of the icon
 * @returns {Promise<string|null>} Path to icon, or null on failure
 */
async function getIcon(instanceUrl, iconUrl) {
    // Check cache first
    const cached = getCachedIconPath(instanceUrl);
    if (cached) {
        return cached;
    }

    // Download if not cached
    if (iconUrl) {
        return await downloadAndCacheIcon(instanceUrl, iconUrl);
    }

    return null;
}

/**
 * Clears all cached icons
 */
function clearIconCache() {
    try {
        const dir = Gio.File.new_for_path(CACHE_DIR);
        if (dir.query_exists(null)) {
            const enumerator = dir.enumerate_children(
                'standard::name',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                const child = dir.get_child(info.get_name());
                child.delete(null);
            }
        }
    } catch (error) {
        log(`OwncastLive: Failed to clear icon cache: ${error.message}`);
    }
}

// Exports
var getCachedIconPath = getCachedIconPath;
var downloadAndCacheIcon = downloadAndCacheIcon;
var getIcon = getIcon;
var clearIconCache = clearIconCache;
