export const ENTITLEMENT = 'ABC Doctor Pro' as const;

export const OFFERINGS = {
  default: 'default',
  messages: 'tokens',
  voice: 'voice',
} as const;

export type OfferingId = (typeof OFFERINGS)[keyof typeof OFFERINGS];

export type MessageProduct = {
  productId: string;
  packageId: string;
  messages: number;
  listPrice: number;
};

export type VoiceProduct = {
  productId: string;
  packageId: string;
  minutes: number;
  listPrice: number;
};

export type SubscriptionProduct = {
  productId: string;
  packageId: string;
  tier: 'basic' | 'pro';
  period: 'monthly' | 'annual';
  messages: number;
  minutes: number;
  listPrice: number;
};

export const MESSAGE_PRODUCTS: readonly MessageProduct[] = [
  { productId: 'abc.qla.dev.messages100', packageId: 'messages100', messages: 100, listPrice: 2.99 },
  { productId: 'abc.qla.dev.messages200', packageId: 'messages200', messages: 200, listPrice: 4.99 },
] as const;

export const VOICE_PRODUCTS: readonly VoiceProduct[] = [
  { productId: 'abc.qla.dev.voice30', packageId: 'voice30', minutes: 30, listPrice: 5.99 },
  { productId: 'abc.qla.dev.voice60', packageId: 'voice60', minutes: 60, listPrice: 11.99 },
  { productId: 'abc.qla.dev.voice180', packageId: 'voice180', minutes: 180, listPrice: 29.99 },
] as const;

export const SUBSCRIPTION_PRODUCTS: readonly SubscriptionProduct[] = [
  { productId: 'abc.qla.dev.basic.monthly', packageId: 'basic_monthly', tier: 'basic', period: 'monthly', messages: 300, minutes: 30, listPrice: 9.99 },
  { productId: 'abc.qla.dev.basic.annual', packageId: 'basic_annual', tier: 'basic', period: 'annual', messages: 300, minutes: 30, listPrice: 79.99 },
  { productId: 'abc.qla.dev.pro.monthly', packageId: 'pro_monthly', tier: 'pro', period: 'monthly', messages: 800, minutes: 60, listPrice: 19.99 },
  { productId: 'abc.qla.dev.pro.annual', packageId: 'pro_annual', tier: 'pro', period: 'annual', messages: 800, minutes: 60, listPrice: 169.99 },
] as const;

export const ALL_PRODUCTS = [
  ...MESSAGE_PRODUCTS,
  ...VOICE_PRODUCTS,
  ...SUBSCRIPTION_PRODUCTS,
] as const;

export function findProduct(productId: string) {
  return ALL_PRODUCTS.find(p => p.productId === productId) ?? null;
}

export function tierFromProductId(productId: string): 'basic' | 'pro' | null {
  const sub = SUBSCRIPTION_PRODUCTS.find(p => p.productId === productId);
  return sub?.tier ?? null;
}
