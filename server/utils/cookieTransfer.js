/**
 * Cookie Transfer Utility
 * Helps transfer cookies from your regular browser to the automated browser
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Save cookies to the browser profile
 * @param {Array} cookies - Array of cookie objects from your browser
 * @param {string} profilePath - Path to the browser profile directory
 */
async function saveCookiesToProfile(cookies, profilePath) {
  try {
    const cookiesPath = path.join(profilePath, 'cookies.json');
    await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
    console.log('✅ Cookies saved to:', cookiesPath);
    return true;
  } catch (error) {
    console.error('❌ Error saving cookies:', error);
    return false;
  }
}

/**
 * Load cookies from the browser profile
 * @param {string} profilePath - Path to the browser profile directory
 */
async function loadCookiesFromProfile(profilePath) {
  try {
    const cookiesPath = path.join(profilePath, 'cookies.json');
    const cookiesJson = await fs.readFile(cookiesPath, 'utf-8');
    const cookies = JSON.parse(cookiesJson);
    console.log('✅ Loaded', cookies.length, 'cookies from profile');
    return cookies;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️ No saved cookies found');
      return [];
    }
    console.error('❌ Error loading cookies:', error);
    return [];
  }
}

module.exports = {
  saveCookiesToProfile,
  loadCookiesFromProfile
};
