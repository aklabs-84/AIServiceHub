import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Purchase, PurchaseRow, PurchaseStatus, ProductType,
  Subscription, SubscriptionRow,
} from '@/types/database';

function mapPurchaseFromDB(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    userId: row.user_id,
    productType: row.product_type,
    productId: row.product_id,
    amount: row.amount,
    orderId: row.order_id,
    paymentKey: row.payment_key,
    status: row.status,
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    createdAt: new Date(row.created_at),
  };
}

function mapSubscriptionFromDB(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    amount: row.amount,
    startedAt: new Date(row.started_at),
    expiresAt: new Date(row.expires_at),
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    createdAt: new Date(row.created_at),
  };
}

// 구매 이력 pending 레코드 생성 (결제 시작 시)
async function createPending(
  client: SupabaseClient,
  params: {
    userId: string;
    productType: ProductType;
    productId: string | null;
    amount: number;
    orderId: string;
  }
): Promise<Purchase> {
  const { data, error } = await client
    .from('purchases')
    .insert({
      user_id: params.userId,
      product_type: params.productType,
      product_id: params.productId,
      amount: params.amount,
      order_id: params.orderId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return mapPurchaseFromDB(data as PurchaseRow);
}

// 결제 완료 처리 (Toss 확인 후)
async function confirmPayment(
  client: SupabaseClient,
  orderId: string,
  paymentKey: string
): Promise<Purchase> {
  const { data, error } = await client
    .from('purchases')
    .update({
      payment_key: paymentKey,
      status: 'paid' as PurchaseStatus,
      paid_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) throw error;
  return mapPurchaseFromDB(data as PurchaseRow);
}

// 구매 여부 확인 (단일 상품)
async function hasPurchased(
  client: SupabaseClient,
  userId: string,
  productType: ProductType,
  productId: string
): Promise<boolean> {
  const { data } = await client
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('product_type', productType)
    .eq('product_id', productId)
    .eq('status', 'paid')
    .maybeSingle();

  return !!data;
}

// 구독 중인지 확인
async function isSubscribed(
  client: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await client
    .from('subscriptions')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!data) return false;
  return new Date(data.expires_at) > new Date();
}

// 구매 or 구독으로 접근 가능한지 통합 확인
async function canAccess(
  client: SupabaseClient,
  userId: string,
  productType: ProductType,
  productId: string
): Promise<boolean> {
  const [purchased, subscribed] = await Promise.all([
    hasPurchased(client, userId, productType, productId),
    isSubscribed(client, userId),
  ]);
  return purchased || subscribed;
}

// 내 구매 목록 (취소/환불 포함)
async function getMyPurchases(
  client: SupabaseClient,
  userId: string
): Promise<Purchase[]> {
  const { data, error } = await client
    .from('purchases')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['paid', 'cancelled', 'refunded'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as PurchaseRow[]).map(mapPurchaseFromDB);
}

// 내 구독 정보
async function getMySubscription(
  client: SupabaseClient,
  userId: string
): Promise<Subscription | null> {
  const { data } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return data ? mapSubscriptionFromDB(data as SubscriptionRow) : null;
}

// 구독 생성
async function createSubscription(
  client: SupabaseClient,
  params: {
    userId: string;
    plan: 'monthly' | 'yearly';
    orderId: string;
    amount: number;
  }
): Promise<Subscription> {
  const expiresAt = new Date();
  if (params.plan === 'monthly') {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  const { data, error } = await client
    .from('subscriptions')
    .upsert({
      user_id: params.userId,
      plan: params.plan,
      order_id: params.orderId,
      amount: params.amount,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return mapSubscriptionFromDB(data as SubscriptionRow);
}

export const purchases = {
  createPending,
  confirmPayment,
  hasPurchased,
  isSubscribed,
  canAccess,
  getMyPurchases,
  getMySubscription,
  createSubscription,
};
