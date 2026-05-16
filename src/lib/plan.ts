import { Photocard, Profile } from '../types';

export type SubscriptionTier = 'free' | 'pro';

export interface PlanRules {
  tier: SubscriptionTier;
  isFree: boolean;
  isPro: boolean;
  cardLimit: number | null;
  binderLimit: number | null;
  canUseImport: boolean;
  canUseBulkEdit: boolean;
  canUseMultipleBinders: boolean;
  canAddMoreCards: (currentCardCount: number) => boolean;
  remainingCards: (currentCardCount: number) => number | null;
  shouldShowUpgradePrompt: (currentCardCount: number) => boolean;
}

const FREE_CARD_LIMIT = 200;
const FREE_BINDER_LIMIT = 1;
const UPGRADE_PROMPT_CARD_THRESHOLD = 180;

export const PLAN_FEATURES = {
  free: {
    cardLimit: FREE_CARD_LIMIT,
    binderLimit: FREE_BINDER_LIMIT,
    importFromGrid: false,
    bulkEdit: false,
    multipleBinders: false,
  },
  pro: {
    cardLimit: null,
    binderLimit: null,
    importFromGrid: true,
    bulkEdit: true,
    multipleBinders: true,
  },
} as const;

export const TRACKED_COLLECTION_STATUSES = ['owned', 'on_the_way'] as const satisfies Photocard['status'][];

export function isTrackedCollectionCard(card: Pick<Photocard, 'status'>) {
  return TRACKED_COLLECTION_STATUSES.includes(card.status as typeof TRACKED_COLLECTION_STATUSES[number]);
}

export function countTrackedCollectionCards(cards: Pick<Photocard, 'status'>[]) {
  return cards.filter(isTrackedCollectionCard).length;
}

export function normalizeSubscriptionTier(tier: unknown): SubscriptionTier {
  return tier === 'pro' ? 'pro' : 'free';
}

export function getPlanRules(profile?: Pick<Profile, 'subscription_tier'> | null): PlanRules {
  const tier = normalizeSubscriptionTier(profile?.subscription_tier);
  const config = PLAN_FEATURES[tier];
  const isPro = tier === 'pro';

  return {
    tier,
    isFree: !isPro,
    isPro,
    cardLimit: config.cardLimit,
    binderLimit: config.binderLimit,
    canUseImport: config.importFromGrid,
    canUseBulkEdit: config.bulkEdit,
    canUseMultipleBinders: config.multipleBinders,
    canAddMoreCards: (currentCardCount: number) => (
      config.cardLimit === null || currentCardCount < config.cardLimit
    ),
    remainingCards: (currentCardCount: number) => (
      config.cardLimit === null ? null : Math.max(0, config.cardLimit - currentCardCount)
    ),
    shouldShowUpgradePrompt: (currentCardCount: number) => (
      config.cardLimit !== null && currentCardCount >= UPGRADE_PROMPT_CARD_THRESHOLD
    ),
  };
}
