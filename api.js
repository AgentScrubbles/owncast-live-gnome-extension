const {Soup, GLib} = imports.gi;

const TIMEOUT = 10; // 10 seconds

/**
 * Normalizes an instance URL by adding https:// if needed and removing trailing slashes
 * @param {string} instanceUrl - The instance URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeInstanceUrl(instanceUrl) {
    let url = instanceUrl.trim();

    // Add https:// if no protocol specified
    if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url;
    }

    // Remove trailing slashes
    url = url.replace(/\/+$/, '');

    return url;
}

/**
 * Makes an HTTP GET request to an Owncast API endpoint
 * @param {string} url - The full URL to fetch
 * @returns {Promise<Object>} Promise that resolves to parsed JSON response
 */
async function fetchJson(url) {
    const session = new Soup.Session({ timeout: TIMEOUT });
    const message = Soup.Message.new('GET', url);

    if (!message) {
        throw new Error(`Invalid URL: ${url}`);
    }

    try {
        const bytes = await session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null
        );

        if (message.status_code !== 200) {
            throw new Error(`HTTP ${message.status_code}: ${message.reason_phrase}`);
        }

        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(bytes.get_data());
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
}

/**
 * Gets the current status of an Owncast instance
 * @param {string} instanceUrl - The base URL of the Owncast instance
 * @returns {Promise<Object>} Promise that resolves to status data
 */
async function getStatus(instanceUrl) {
    const url = normalizeInstanceUrl(instanceUrl);
    const endpoint = `${url}/api/status`;

    try {
        const data = await fetchJson(endpoint);
        return {
            instance: instanceUrl,
            online: data.online || false,
            viewerCount: data.viewerCount || 0,
            streamTitle: data.streamTitle || '',
            serverTime: data.serverTime || '',
            lastConnectTime: data.lastConnectTime || null,
            sessionMaxViewerCount: data.sessionMaxViewerCount || 0,
            overallMaxViewerCount: data.overallMaxViewerCount || 0,
            versionNumber: data.versionNumber || ''
        };
    } catch (error) {
        // Return offline status if we can't reach the instance
        return {
            instance: instanceUrl,
            online: false,
            viewerCount: 0,
            streamTitle: '',
            error: error.message
        };
    }
}

/**
 * Gets the configuration of an Owncast instance (name, logo, etc.)
 * @param {string} instanceUrl - The base URL of the Owncast instance
 * @returns {Promise<Object>} Promise that resolves to config data
 */
async function getConfig(instanceUrl) {
    const url = normalizeInstanceUrl(instanceUrl);
    const endpoint = `${url}/api/config`;

    try {
        const data = await fetchJson(endpoint);
        return {
            instance: instanceUrl,
            name: data.name || instanceUrl,
            summary: data.summary || '',
            logo: data.logo || '',
            tags: data.tags || [],
            socialHandles: data.socialHandles || [],
            nsfw: data.nsfw || false,
            federation: data.federation?.enabled || false
        };
    } catch (error) {
        // Return minimal config if we can't reach the instance
        return {
            instance: instanceUrl,
            name: instanceUrl,
            summary: '',
            logo: '',
            tags: [],
            error: error.message
        };
    }
}

/**
 * Fetches both status and config for an instance in parallel
 * @param {string} instanceUrl - The base URL of the Owncast instance
 * @returns {Promise<Object>} Promise that resolves to combined data
 */
async function getInstanceData(instanceUrl) {
    try {
        const [status, config] = await Promise.all([
            getStatus(instanceUrl),
            getConfig(instanceUrl)
        ]);

        return {
            instance: instanceUrl,
            ...status,
            name: config.name,
            logo: config.logo,
            tags: config.tags,
            summary: config.summary
        };
    } catch (error) {
        return {
            instance: instanceUrl,
            online: false,
            viewerCount: 0,
            streamTitle: '',
            name: instanceUrl,
            logo: '',
            error: error.message
        };
    }
}

// Exports
var normalizeInstanceUrl = normalizeInstanceUrl;
var getStatus = getStatus;
var getConfig = getConfig;
var getInstanceData = getInstanceData;
