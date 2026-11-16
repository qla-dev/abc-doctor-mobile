import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesOfferings } from 'react-native-purchases';
import Constants from 'expo-constants';
import { apiRequest } from '@/lib/api';
import { OFFERINGS, ENTITLEMENT, type OfferingId } from './products';

const rc = Constants.expoConfig?.extra?.revenueCat ?? {};

export class PurchaseCancelledError extends Error {
  constructor() { super('Purchase cancelled'); this.name = 'PurchaseCancelledError'; }
}

export class PurchasesUnavailableError extends Error {
  constructor(reason?: string) { super(reason ?? 'Purchases unavailable'); this.name = 'PurchasesUnavailableError'; }
}

let configured = false;

export function isAvailable(): boolean {
  return Platform.OS !== 'web' && Boolean(Platform.OS === 'ios' ? rc.iosApiKey : rc.androidApiKey);
}

export function configure() {
  if (configured || !isAvailable()) return;
  const apiKey = Platform.OS === 'ios' ? rc.iosApiKey : rc.androidApiKey;
  if (!apiKey) return;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  configured = true;
}

export async function identify(userId: number) {
  if (!configured) return;
  await Purchases.logIn(`abc-doctor-user-${userId}`);
}

export async function logout() {
  if (!configured) return;
  try { await Purchases.logOut(); } catch {}
}

export type StorePrices = Record<string, string>;

export async function storePrices(): Promise<StorePrices> {
  if (!configured) return {};
  const offerings = await Purchases.getOfferings();
  const prices: StorePrices = {};
  for (const key of Object.values(OFFERINGS)) {
    const offering = key === 'default' ? offerings.current : offerings.all[key];
    if (!offering) continue;
    for (const pkg of offering.availablePackages) {
      prices[pkg.product.identifier] = pkg.product.priceString;
    }
  }
  return prices;
}

function findPackage(offerings: PurchasesOfferings, offeringId: OfferingId, productId: string) {
  const offering = offeringId === 'default' ? offerings.current : offerings.all[offeringId];
  if (!offering) throw new PurchasesUnavailableError(`Offering "${offeringId}" not found`);
  const pkg = offering.availablePackages.find(p => p.product.identifier === productId);
  if (!pkg) throw new PurchasesUnavailableError(`Package for "${productId}" not found`);
  return pkg;
}

async function buy(offeringId: OfferingId, productId: string): Promise<void> {
  if (!configured) throw new PurchasesUnavailableError();
  const offerings = await Purchases.getOfferings();
  const pkg = findPackage(offerings, offeringId, productId);
  try {
    await Purchases.purchasePackage(pkg);
  } catch (e: any) {
    if (e.userCancelled) throw new PurchaseCancelledError();
    throw e;
  }
  await grant(productId);
}

async function grant(productId: string): Promise<PurchaseState> {
  const info = await Purchases.getCustomerInfo();
  return apiRequest<PurchaseState>('/purchases', {
    method: 'POST',
    body: JSON.stringify({
      product_id: productId,
      rc_app_user_id: info.originalAppUserId,
      store: Platform.OS === 'ios' ? 'app_store' : 'play_store',
    }),
  });
}

export async function buyMessages(productId: string) {
  return buy(OFFERINGS.messages, productId);
}

export async function buyVoice(productId: string) {
  return buy(OFFERINGS.voice, productId);
}

export async function buySubscription(productId: string) {
  return buy(OFFERINGS.default, productId);
}

export async function restorePurchases() {
  if (!configured) return;
  const info = await Purchases.restorePurchases();
  const entitlement = info.entitlements.active[ENTITLEMENT];
  if (entitlement?.isActive) {
    const appUserId = info.originalAppUserId;
    for (const [productId] of Object.entries(info.nonSubscriptionTransactions ?? {})) {
      await apiRequest('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          rc_app_user_id: appUserId,
          store: Platform.OS === 'ios' ? 'app_store' : 'play_store',
        }),
      });
    }
  }
}

export type PurchaseState = {
  messages: number;
  voice_minutes: number;
  subscription_tier: 'basic' | 'pro' | null;
  subscription_expires_at: string | null;
};

export async function fetchPurchaseState(): Promise<PurchaseState> {
  return apiRequest<PurchaseState>('/purchases');
}
