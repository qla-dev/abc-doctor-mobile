import { Platform } from 'react-native';

export type { StorePrices, PurchaseState } from './revenueCat';
export { PurchaseCancelledError, PurchasesUnavailableError } from './revenueCat';
export { ENTITLEMENT, OFFERINGS, MESSAGE_PRODUCTS, VOICE_PRODUCTS, SUBSCRIPTION_PRODUCTS, ALL_PRODUCTS, findProduct, tierFromProductId } from './products';
export type { MessageProduct, VoiceProduct, SubscriptionProduct, OfferingId } from './products';

const isWeb = Platform.OS === 'web';

function native() {
  return require('./revenueCat') as typeof import('./revenueCat');
}

function web() {
  return require('./web') as typeof import('./web');
}

export function purchasesAvailable(): boolean {
  return isWeb ? web().isAvailable() : native().isAvailable();
}

export function configurePurchases() {
  if (!isWeb) native().configure();
}

export async function identifyUser(userId: number) {
  if (!isWeb) await native().identify(userId);
}

export async function getStorePrices() {
  return isWeb ? web().storePrices() : native().storePrices();
}

export async function buyMessages(productId: string, email?: string) {
  return isWeb ? web().buyMessages(productId, email) : native().buyMessages(productId);
}

export async function buyVoice(productId: string, email?: string) {
  return isWeb ? web().buyVoice(productId, email) : native().buyVoice(productId);
}

export async function buySubscription(productId: string, email?: string) {
  return isWeb ? web().buySubscription(productId, email) : native().buySubscription(productId);
}

export async function fetchPurchaseState() {
  return isWeb ? web().fetchPurchaseState() : native().fetchPurchaseState();
}

export async function restorePurchases() {
  if (!isWeb) await native().restorePurchases();
}
