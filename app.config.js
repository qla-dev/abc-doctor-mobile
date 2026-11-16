const fs = require('fs');
const path = require('path');

const normalizeGoogleClientId = value => value?.trim().replace(/\/+$/, '') || '';

const readBackendEnv = () => {
  try {
    return Object.fromEntries(
      fs.readFileSync(path.join(__dirname, '..', 'backend', '.env'), 'utf8')
        .split(/\r?\n/)
        .filter(line => line && !line.trimStart().startsWith('#') && line.includes('='))
        .map(line => {
          const separator = line.indexOf('=');
          return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^["']|["']$/g, '')];
        }),
    );
  } catch {
    return {};
  }
};

module.exports = ({ config }) => {
  const backendEnv = readBackendEnv();
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
        androidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || backendEnv.REVENUECAT_GOOGLE_API_KEY || revenueCat.androidApiKey || '',
        iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY || backendEnv.REVENUECAT_APPLE_API_KEY || revenueCat.iosApiKey || '',
        entitlementIdentifier: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_IDENTIFIER || backendEnv.REVENUECAT_ENTITLEMENT_IDENTIFIER || revenueCat.entitlementIdentifier || 'ABC Doctor Pro',
      },
    },
  };
};
