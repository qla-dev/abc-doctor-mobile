const normalizeGoogleClientId = value => value?.trim().replace(/\/+$/, '') || '';

module.exports = ({ config }) => {
  const googleAuth = config.extra?.googleAuth || {};
  const webClientId = normalizeGoogleClientId(googleAuth.webClientId);
  const iosClientId = normalizeGoogleClientId(googleAuth.iosClientId);
  const androidClientId = normalizeGoogleClientId(googleAuth.androidClientId);

  const reversedGoogleClientId = iosClientId
    ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
    : null;
  const reversedAndroidGoogleClientId = androidClientId
    ? `com.googleusercontent.apps.${androidClientId.replace('.apps.googleusercontent.com', '')}`
    : null;

  const schemes = Array.isArray(config.scheme) ? config.scheme : [config.scheme];

  const revenueCat = config.extra?.revenueCat || {};

  return {
    ...config,
    scheme: [
      ...new Set(
        [...schemes.filter(Boolean), reversedGoogleClientId, reversedAndroidGoogleClientId].filter(Boolean),
      ),
    ],
    extra: {
      ...config.extra,
      googleAuth: { webClientId, iosClientId, androidClientId },
      revenueCat: {
        ...revenueCat,
        androidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || revenueCat.androidApiKey || '',
        iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY || revenueCat.iosApiKey || '',
        webBillingKey: process.env.EXPO_PUBLIC_REVENUECAT_WEB_BILLING_KEY || revenueCat.webBillingKey || '',
        entitlementIdentifier: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_IDENTIFIER || revenueCat.entitlementIdentifier || 'ABC Doctor Pro',
      },
    },
  };
};
