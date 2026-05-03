import { getPhotocardCategory, getPhotocardMembers, getPhotocardTemplateId, Photocard, PhotocardCategory } from '../types';

export function isProfileOwner(currentUserId?: string | null, profileUserId?: string | null) {
  return Boolean(currentUserId && profileUserId && currentUserId === profileUserId);
}

export function isPhotocardOwner(currentUserId?: string | null, photocard?: Pick<Photocard, 'ownerUserId'> | null) {
  return Boolean(currentUserId && photocard?.ownerUserId && currentUserId === photocard.ownerUserId);
}

export function getPhotocardMatchId(photocard: Photocard) {
  return getPhotocardTemplateId(photocard);
}

export function hasMatchingPhotocard(photocards: Photocard[], target: Photocard) {
  const targetMatchId = getPhotocardMatchId(target);
  return photocards.some((card) => getPhotocardMatchId(card) === targetMatchId);
}

function logCloneMetadata(label: string, value: unknown) {
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    console.debug(`[PocaDex clone metadata] ${label}`, value);
  }
}

function hasMeaningfulValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function getTemplateMetadata(sourceCard: Photocard & Record<string, unknown>) {
  const templateId = typeof sourceCard.cardTemplateId === 'string' ? sourceCard.cardTemplateId : '';
  const parts = templateId.split('|');
  if (parts.length < 9) return {};

  const category = hasMeaningfulValue(parts[2]) ? getPhotocardCategory({ category: parts[2] as PhotocardCategory }) : undefined;
  const source = hasMeaningfulValue(parts[4]) ? parts[4] : undefined;
  return { category, source };
}

function resolveCloneCategory(sourceCard: Photocard & Record<string, unknown>): PhotocardCategory {
  const templateMetadata = getTemplateMetadata(sourceCard);
  if (templateMetadata.category && templateMetadata.category !== 'Album') return templateMetadata.category;
  if (hasMeaningfulValue(sourceCard.category)) return getPhotocardCategory(sourceCard);
  if (resolveCloneSource(sourceCard)) return 'Other';
  return 'Album';
}

function resolveCloneSource(sourceCard: Photocard & Record<string, unknown>) {
  const source = sourceCard.source ?? sourceCard.shop ?? sourceCard.store ?? sourceCard.event ?? sourceCard.pob ?? sourceCard.benefit;
  if (hasMeaningfulValue(source)) return String(source);

  const templateMetadata = getTemplateMetadata(sourceCard);
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
