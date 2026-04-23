// Strips the aps-environment iOS entitlement that expo-notifications adds
// by default. MaintBot only uses local notifications (scheduleNotificationAsync),
// never remote push. Without aps-environment we don't need a Push Notifications
// Key or the matching provisioning-profile capability identifier, which
// simplifies EAS builds that rely on App Store Connect API-key auth.

const { withEntitlementsPlist } = require('@expo/config-plugins');

module.exports = function withLocalOnlyNotifications(config) {
  return withEntitlementsPlist(config, (cfg) => {
    if (cfg.modResults && 'aps-environment' in cfg.modResults) {
      delete cfg.modResults['aps-environment'];
    }
    return cfg;
  });
};
