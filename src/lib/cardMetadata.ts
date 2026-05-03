import { getPhotocardCategory, Photocard } from '../types';

type CardMetadataRecord = Photocard & Record<string, unknown>;

function firstStringValue(card: CardMetadataRecord, keys: string[]) {
  for (const key of keys) {
    const value = card[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function getPhotocardDisplayMetadata(photocard: Photocard) {
  const card = photocard as CardMetadataRecord;
  const category = getPhotocardCategory(photocard);
  const albumLabel = firstStringValue(card, ['album', 'albumName', 'album_name']);
  const sourceLabel = firstStringValue(card, ['source', 'sourceName', 'source_name', 'shop', 'store', 'event', 'benefit', 'pob']);
  const primaryDetail = category === 'Album' ? albumLabel : sourceLabel;

  return {
    category,
    albumLabel,
    sourceLabel,
    primaryDetail,
    eraLabel: photocard.era?.trim() || undefined,
    versionLabel: photocard.version?.trim() || undefined,
    cardNameLabel: photocard.cardName?.trim() || undefined,
  };
}
