const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">Xcience.in</domain>
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </domain-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </base-config>
</network-security-config>
`;

const withNetworkSecurityConfig = (config) => {
  // 1. Create the XML file in res/xml/
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );
      const xmlPath = path.join(xmlDir, 'network_security_config.xml');

      await fs.promises.mkdir(xmlDir, { recursive: true });
      await fs.promises.writeFile(xmlPath, NETWORK_SECURITY_CONFIG);

      return config;
    },
  ]);

  // 2. Add the reference to AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    application.$['android:usesCleartextTraffic'] = 'true';
    return config;
  });

  return config;
};

module.exports = withNetworkSecurityConfig;