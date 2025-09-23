const { withAndroidManifest } = require('@expo/config-plugins');

const withNetworkSecurityConfig = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;

    // Find the application tag
    const application = androidManifest.manifest.application[0];

    // Add network security config
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    application.$['android:usesCleartextTraffic'] = 'true';

    return config;
  });
};

module.exports = withNetworkSecurityConfig;