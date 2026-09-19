const APP_GROUP = 'group.abc.qla.dev';

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'ABCDoctorWidget',
  bundleIdentifier: 'abc.qla.dev.widget',
  // The widget reads the due-card count the app writes into the shared container; without the
  // group entitlement on both sides the extension can see nothing the app stores.
  entitlements: {
    'com.apple.security.application-groups': [APP_GROUP],
  },
});
