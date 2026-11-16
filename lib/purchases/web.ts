import Constants from 'expo-constants';
import { apiRequest } from '@/lib/api';
import { OFFERINGS, type OfferingId } from './products';
import type { PurchaseState, StorePrices } from './revenueCat';
import { PurchaseCancelledError, PurchasesUnavailableError } from './revenueCat';

export { PurchaseCancelledError, PurchasesUnavailableError };
export type { PurchaseState, StorePrices };

const WEB_API_KEY = Constants.expoConfig?.extra?.revenueCat?.webBillingKey ?? '';
const APP_USER_ID_KEY = 'abc_rc_web_user_id';

function getOrCreateAppUserId(): string {
  try {
    let id = localStorage.getItem(APP_USER_ID_KEY);
    if (!id) {
      id = `abc-web-${crypto.randomUUID()}`;
      localStorage.setItem(APP_USER_ID_KEY, id);
    }
    return id;
  } catch {
    return `abc-web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

let purchasesInstance: any = null;

async function getPurchases() {
  if (purchasesInstance) return purchasesInstance;
  if (!WEB_API_KEY) throw new PurchasesUnavailableError('Web billing key not configured');
  const { Purchases } = await import('@revenuecat/purchases-js');
  const userId = getOrCreateAppUserId();
  purchasesInstance = Purchases.configure(WEB_API_KEY, userId);
  return purchasesInstance;
}

export function isAvailable(): boolean {
  return Boolean(WEB_API_KEY);
}

export async function storePrices(): Promise<StorePrices> {
  const purchases = await getPurchases();
  const offerings = await purchases.getOfferings();
  const prices: StorePrices = {};
  for (const key of Object.values(OFFERINGS)) {
    const offering = key === 'default' ? offerings.current : offerings.all[key];
    if (!offering) continue;
    for (const pkg of offering.availablePackages) {
      const product = pkg.rcBillingProduct;
      if (product?.currentPrice) {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: product.currentPrice.currency,
        }).format(product.currentPrice.amountMicros / 1_000_000);
        prices[product.identifier] = formatted;
      }
    }
  }
  return prices;
}

async function buy(offeringId: OfferingId, productId: string, email?: string): Promise<void> {
  const purchases = await getPurchases();
  const offerings = await purchases.getOfferings();
  const offering = offeringId === 'default' ? offerings.current : offerings.all[offeringId];
  if (!offering) throw new PurchasesUnavailableError(`Offering "${offeringId}" not found`);
  const pkg = offering.availablePackages.find((p: any) => p.rcBillingProduct?.identifier === productId);
  if (!pkg) throw new PurchasesUnavailableError(`Package for "${productId}" not found`);
  try {
    await purchases.purchase({ rcPackage: pkg, customerEmail: email });
  } catch (e: any) {
    if (e?.errorCode === 1) throw new PurchaseCancelledError();
    throw e;
  }
  await claim(email);
}

async function claim(email: string | undefined): Promise<PurchaseState> {
  if (!email) throw new PurchasesUnavailableError('Email is required for web purchases');
  const appUserId = getOrCreateAppUserId();
  return apiRequest<PurchaseState>('/web-purchases/claim', {
    method: 'POST',
    body: JSON.stringify({ app_user_id: appUserId, email }),
  });
}

export async function buyMessages(productId: string, email?: string) { return buy(OFFERINGS.messages, productId, email); }
export async function buyVoice(productId: string, email?: string) { return buy(OFFERINGS.voice, productId, email); }
export async function buySubscription(productId: string, email?: string) { return buy(OFFERINGS.default, productId, email); }

export async function fetchPurchaseState(): Promise<PurchaseState> {
  return apiRequest<PurchaseState>('/purchases');
}
