import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import Constants from 'expo-constants';

const rc = Constants.expoConfig?.extra?.revenueCat ?? {};

export function hasRevenueCatConfig(): boolean {
  const key = Platform.OS === 'ios' ? rc.iosApiKey : rc.androidApiKey;
  return Boolean(key);
}

export function configureRevenueCat() {
  const apiKey = Platform.OS === 'ios' ? rc.iosApiKey : rc.androidApiKey;
  if (!apiKey) return;

  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  Purchases.configure({ apiKey });
}

export async function identifyRevenueCatUser(userId: number) {
  try {
    await Purchases.logIn(`abc-doctor-user-${userId}`);
  } catch {}
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function hasProEntitlement(info: CustomerInfo | null): boolean {
  if (!info) return false;
  const id = rc.entitlementIdentifier || 'ABC Doctor Pro';
  return info.entitlements.active[id]?.isActive === true;
}

export async function getSubscriptionPackages(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;
    if (!offering) return [];
    return offering.availablePackages;
  } catch {
    return [];
  }
}

export async function getTokenPackages(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    const offeringId = rc.offeringIdentifier || 'tokens';
    const offering = offerings.all[offeringId];
    if (!offering) return [];
    return offering.availablePackages;
  } catch {
    return [];
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e: any) {
    if (e.userCancelled) return null;
    throw e;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

export function addCustomerInfoUpdateListener(listener: (info: CustomerInfo) => void) {
  return Purchases.addCustomerInfoUpdateListener(listener);
}
