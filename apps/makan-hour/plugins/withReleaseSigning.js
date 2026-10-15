// Adds a release signing config to the generated android/app/build.gradle.
// Values come from env vars (CI) or ~/.gradle/gradle.properties, never from the repo:
//   MAKAN_UPLOAD_STORE_FILE, MAKAN_UPLOAD_STORE_PASSWORD, MAKAN_UPLOAD_KEY_ALIAS, MAKAN_UPLOAD_KEY_PASSWORD
// If they are missing, release builds fall back to the debug key (useful for local smoke tests only).
const { withAppBuildGradle } = require('expo/config-plugins');

const BLOCK = `
        release {
            def p = { String k -> System.getenv(k) ?: (project.findProperty(k) ?: null) }
            if (p('MAKAN_UPLOAD_STORE_FILE')) {
                storeFile file(p('MAKAN_UPLOAD_STORE_FILE'))
                storePassword p('MAKAN_UPLOAD_STORE_PASSWORD')
                keyAlias p('MAKAN_UPLOAD_KEY_ALIAS')
                keyPassword p('MAKAN_UPLOAD_KEY_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, cfg => {
    let g = cfg.modResults.contents;
    if (!g.includes('MAKAN_UPLOAD_STORE_FILE')) {
      g = g.replace(/signingConfigs\s*\{/, m => `${m}${BLOCK}`);
      // release buildType: use release signing when configured, else debug
      g = g.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
        `$1signingConfig(((System.getenv('MAKAN_UPLOAD_STORE_FILE') ?: project.findProperty('MAKAN_UPLOAD_STORE_FILE')) != null) ? signingConfigs.release : signingConfigs.debug)`);
    }
    cfg.modResults.contents = g;
    return cfg;
  });
};
