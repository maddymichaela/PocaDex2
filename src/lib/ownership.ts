import { getPhotocardBaseIdentity, getPhotocardCategory, getPhotocardMembers, getPhotocardTemplateId, getPhotocardTemplateMetadata, Photocard, PhotocardCategory } from '../types';

export type CollectionMatchType = 'owner' | 'exact' | 'base' | 'none';

export function isProfileOwner(currentUserId?: string | null, profileUserId?: string | null) {
  return Boolean(currentUserId && profileUserId && currentUserId === profileUserId);
}

export function isPhotocardOwner(
  currentUserId?: string | null,
  photocard?: (Pick<Photocard, 'ownerUserId'> & { user_id?: unknown; userId?: unknown }) | null,
) {
  const ownerUserId = photocard?.ownerUserId ?? photocard?.user_id ?? photocard?.userId;
  return Boolean(currentUserId && ownerUserId && currentUserId === ownerUserId);
}

export function getPhotocardMatchId(photocard: Photocard) {
  return getPhotocardTemplateId(photocard);
}

export function hasMatchingPhotocard(photocards: Photocard[], target: Photocard) {
  return getCollectionMatchState(target, photocards).alreadyInCollection;
}

export function getCollectionMatchState(
  publicCard: Photocard,
  currentUserCards: Photocard[],
  currentUserId?: string | null,
) {
  const ownerMatch = isPhotocardOwner(currentUserId, publicCard);
  const exactMatchId = getPhotocardMatchId(publicCard);
  const baseMatchId = getPhotocardBaseIdentity(publicCard);
  const exactMatch = currentUserCards.find((card) => getPhotocardMatchId(card) === exactMatchId);
  const baseMatch = exactMatch ? undefined : currentUserCards.find((card) => getPhotocardBaseIdentity(card) === baseMatchId);
  const matchedOwnedCard = exactMatch ?? baseMatch ?? (ownerMatch ? publicCard : undefined);
  const matchType: CollectionMatchType = ownerMatch ? 'owner' : exactMatch ? 'exact' : baseMatch ? 'base' : 'none';
  const alreadyInCollection = matchType !== 'none';

  return {
    isOwner: ownerMatch,
    exactMatch,
    baseMatch,
    alreadyInCollection,
    inCollection: alreadyInCollection,
    actionLabel: alreadyInCollection ? 'In Collection' : 'Add to My Collection',
    canAdd: Boolean(currentUserId && !alreadyInCollection),
    requiresAuth: !currentUserId,
    matchedOwnedCard,
    matchType,
  };
}

function logCloneMetadata(label: string, value: unknown) {
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    console.debug(`[PocaDex clone metadata] ${label}`, value);
  }
}

function hasMeaningfulValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function resolveCloneCategory(sourceCard: Photocard & Record<string, unknown>): PhotocardCategory {
  const templateMetadata = getPhotocardTemplateMetadata(sourceCard.cardTemplateId);
  const source = resolveCloneSource(sourceCard);
  if (templateMetadata.category && templateMetadata.category !== 'Album') return templateMetadata.category;
  const explicitCategory = hasMeaningfulValue(sourceCard.category) ? getPhotocardCategory(sourceCard) : undefined;
  if (explicitCategory && explicitCategory !== 'Album') return explicitCategory;
  if (source) return 'Other';
  return explicitCategory ?? 'Album';
}

function resolveCloneSource(sourceCard: Photocard & Record<string, unknown>) {
  const source = sourceCard.source ?? sourceCard.shop ?? sourceCard.store ?? sourceCard.event ?? sourceCard.pob ?? sourceCard.benefit;
  if (hasMeaningfulValue(source)) return String(source);

  const templateMetadata = getPhotocardTemplateMetadata(sourceCard.cardTemplateId);
  return templateMetadata.source;
}

export function createPhotocardDraftFromPublicCard(sourceCard: Photocard, currentUserId?: string | null): Photocard {
  const now = Date.now();
  const {
    id: _id,
    ownerUserId: _ownerUserId,
    user_id: _userId,
    binder_id: _binderId,
    binderId: _binderIdCamel,
    createdAt: _createdAt,
    created_at: _createdAtSnake,
    updated_at: _updatedAtSnake,
    updatedAt: _updatedAt,
    status: _status,
    condition: _condition,
    isDuplicate: _isDuplicate,
    notes: _notes,
    ...descriptiveFields
  } = sourceCard as Photocard & Record<string, unknown>;
  logCloneMetadata('original card before clone', sourceCard);

  const sourceCardWithExtras = sourceCard as Photocard & Record<string, unknown>;
  const category = resolveCloneCategory(sourceCardWithExtras);
  const source = category === 'Album' ? undefined : resolveCloneSource(sourceCardWithExtras);

  const prefill = {
    ...descriptiveFields,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${now}-${Math.random().toString(36).slice(2)}`,
    cardTemplateId: getPhotocardMatchId(sourceCard),
    ownerUserId: currentUserId ?? undefined,
    group: sourceCard.group,
    members: getPhotocardMembers(sourceCard),
    category,
    source,
    album: sourceCard.album,
    era: sourceCard.era,
    year: sourceCard.year,
    cardName: sourceCard.cardName,
    version: sourceCard.version,
    status: 'owned' as const,
    condition: 'mint' as const,
    isDuplicate: false,
    notes: '',
    imageUrl: sourceCard.imageUrl,
    createdAt: now,
  };
  logCloneMetadata('prefill payload', prefill);
  return prefill;
}
