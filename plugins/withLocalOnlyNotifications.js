// Strips every trace of the iOS Push Notifications capability so builds
// succeed even when the provisioning profile doesn't include it.
//
// MaintBot only uses local notifications (scheduleNotificationAsync in
// src/utils/notifications.ts) — never remote push. expo-notifications
// adds aps-environment by default; EAS's API-key auth can't sync the
// matching capability identifier on the provisioning profile, which
// causes Xcode to reject the build with:
//   "Provisioning profile doesn't include the aps-environment entitlement"
//
// This plugin deletes the capability at both levels:
//   1) entitlements.plist  — removes the aps-environment key
//   2) Xcode project pbxproj — removes com.apple.Push from every target's
//      SystemCapabilities dictionary

const { withEntitlementsPlist, withXcodeProject } = require('@expo/config-plugins');

function stripApsEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    if (cfg.modResults && 'aps-environment' in cfg.modResults) {
      delete cfg.modResults['aps-environment'];
    }
    return cfg;
  });
}

function stripPushSystemCapability(config) {
  return withXcodeProject(config, (cfg) => {
    try {
      const project = cfg.modResults;
      const projectSection = project.pbxProjectSection();
      for (const key of Object.keys(projectSection)) {
        if (key.endsWith('_comment')) continue;
        const proj = projectSection[key];
        const targetAttrs = proj && proj.attributes && proj.attributes.TargetAttributes;
        if (!targetAttrs) continue;
        for (const targetUuid of Object.keys(targetAttrs)) {
          const target = targetAttrs[targetUuid];
          if (target && target.SystemCapabilities) {
            delete target.SystemCapabilities['com.apple.Push'];
          }
        }
      }
    } catch {
      // Defensive: if the pbxproj shape changes in future expo versions,
      // fail silently — entitlements removal alone may be enough.
    }
    return cfg;
  });
}

module.exports = function withLocalOnlyNotifications(config) {
  config = stripApsEntitlement(config);
  config = stripPushSystemCapability(config);
  return config;
};
