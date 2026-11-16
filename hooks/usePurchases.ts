import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStorePrices, fetchPurchaseState, type StorePrices, type PurchaseState } from '@/lib/purchases';

export function useStorePrices() {
  return useQuery<StorePrices>({
    queryKey: ['storePrices'],
    queryFn: getStorePrices,
    staleTime: 15 * 60_000,
    retry: 1,
  });
}

export function usePurchaseState() {
  return useQuery<PurchaseState>({
    queryKey: ['purchaseState'],
    queryFn: fetchPurchaseState,
    staleTime: 30_000,
  });
}

export function useInvalidatePurchaseState() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['purchaseState'] });
}

export function priceLabel(prices: StorePrices | undefined, productId: string, listPrice: number): string {
  if (prices?.[productId]) return prices[productId];
  return `$${listPrice.toFixed(2)}`;
}
