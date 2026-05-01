import { supabase } from './supabase';
import { getPhotocardMembers, getPhotocardTemplateId, normalizePhotocardForSave, normalizePhotocardUpdates, Photocard } from '../types';

// ── Row ↔ Photocard mappers ────────────────────────────────────────────────

export function rowToPhotocard(row: Record<string, unknown>): Photocard {
  const id = row.id as string;
  const ownerUserId = (row.user_id as string) ?? undefined;
  return {
    id,
    cardTemplateId: (row.card_template_id as string) || undefined,
    ownerUserId,
    group: (row.group_name as string) ?? undefined,
    members: getPhotocardMembers({ members: row.members as string[] | undefined, member: row.member as string | undefined }),
    category: (row.category as Photocard['category']) ?? 'Album',
    source: (row.source as string) ?? undefined,
    album: row.album as string,
    era: (row.era as string) ?? undefined,
    year: row.year as number,
    cardName: row.card_name as string,
    version: row.version as string,
    status: row.status as Photocard['status'],
    condition: (row.condition as Photocard['condition']) ?? undefined,
    isDuplicate: (row.is_duplicate as boolean) ?? false,
    notes: (row.notes as string) ?? undefined,
    imageUrl: (row.image_url as string) ?? undefined,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

function photocardToRow(pc: Photocard, userId: string) {
  const normalized = normalizePhotocardForSave(pc);
  return {
    user_id: userId,
    card_template_id: getPhotocardTemplateId(normalized),
    group_name: normalized.group ?? null,
    members: normalized.members,
    category: normalized.category ?? 'Album',
    source: normalized.source ?? null,
    album: normalized.album,
    era: normalized.era ?? null,
    year: normalized.year,
    card_name: normalized.cardName,
    version: normalized.version,
    status: normalized.status,
    condition: normalized.condition ?? null,
    is_duplicate: normalized.isDuplicate ?? false,
    notes: normalized.notes ?? null,
    image_url: normalized.imageUrl ?? null,
  };
}

function withoutNewSchemaColumns(row: Record<string, unknown>) {
  const { category: _category, source: _source, members: _members, card_template_id: _cardTemplateId, ...legacyRow } = row;
  return {
    ...legacyRow,
    member: Array.isArray(row.members) ? row.members.join(', ') : '',
  };
}

function isMissingNewSchemaColumnError(error: unknown) {
  if (!error || typeof error !== 'object' || !('message' in error)) return false;
  const message = String((error as { message: unknown }).message);
  return (
    message.includes("Could not find the 'category' column") ||
    message.includes("Could not find the 'source' column") ||
    message.includes("Could not find the 'members' column") ||
    message.includes("Could not find the 'card_template_id' column") ||
    message.includes('column "card_template_id"') ||
    message.includes('.card_template_id') ||
    message.includes('null value in column "member"')
  );
}

// ── Image upload ───────────────────────────────────────────────────────────

export async function uploadPhotocardImage(userId: string, dataUrl: string): Promise<string> {
  const [header, base64] = dataUrl.split(',');
  const mime = header.split(':')[1]?.split(';')[0] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const ext = mime.split('/')[1] || 'jpg';
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from('photocard-images').upload(filename, blob, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('photocard-images').getPublicUrl(filename);
  return data.publicUrl;
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function fetchPhotocards(userId: string): Promise<Photocard[]> {
  const { data, error } = await supabase
    .from('photocards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToPhotocard);
}

export async function findPhotocardByTemplateId(userId: string, templateId: string): Promise<Photocard | null> {
  if (!templateId) return null;

  const { data, error } = await supabase
    .from('photocards')
    .select('*')
    .eq('user_id', userId)
    .eq('card_template_id', templateId)
    .limit(1)
    .maybeSingle();

  if (error && isMissingNewSchemaColumnError(error)) {
    const cards = await fetchPhotocards(userId);
    return cards.find((card) => getPhotocardTemplateId(card) === templateId) ?? null;
  }
  if (error) throw error;
  if (data) return rowToPhotocard(data);

  const cards = await fetchPhotocards(userId);
  return cards.find((card) => getPhotocardTemplateId(card) === templateId) ?? null;
}

export async function insertPhotocard(userId: string, pc: Photocard): Promise<Photocard> {
  const normalized = normalizePhotocardForSave(pc);
  const templateId = getPhotocardTemplateId(normalized);
  const existing = await findPhotocardByTemplateId(userId, templateId);
  if (existing) return existing;

  let imageUrl = normalized.imageUrl;
  if (imageUrl?.startsWith('data:')) {
    try {
      imageUrl = await uploadPhotocardImage(userId, imageUrl);
    } catch (err) {
      console.error('Failed to upload photocard image; saving inline image instead:', err);
    }
  }
  const row = photocardToRow({ ...normalized, cardTemplateId: templateId, imageUrl }, userId);
  const { data, error } = await supabase
    .from('photocards')
    .insert(row)
    .select()
    .single();
  if (error && isMissingNewSchemaColumnError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('photocards')
      .insert(withoutNewSchemaColumns(row))
      .select()
      .single();
    if (legacyError) throw legacyError;
    return rowToPhotocard(legacyData);
  }
  if (error) throw error;
  return rowToPhotocard(data);
}

export async function updatePhotocard(userId: string, pc: Photocard): Promise<Photocard> {
  let imageUrl = pc.imageUrl;
  if (imageUrl?.startsWith('data:')) {
    try {
      imageUrl = await uploadPhotocardImage(userId, imageUrl);
    } catch (err) {
      console.error('Failed to upload photocard image; saving inline image instead:', err);
    }
  }
  const row = photocardToRow({ ...pc, imageUrl }, userId);
  const { data, error } = await supabase
    .from('photocards')
    .update(row)
    .eq('id', pc.id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error && isMissingNewSchemaColumnError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('photocards')
      .update(withoutNewSchemaColumns(row))
      .eq('id', pc.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (legacyError) throw legacyError;
    return rowToPhotocard(legacyData);
  }
  if (error) throw error;
  return rowToPhotocard(data);
}

export async function deletePhotocard(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('photocards')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function bulkUpdatePhotocards(
  userId: string,
  ids: string[],
  updates: Partial<Photocard>,
): Promise<void> {
  const normalizedUpdates = normalizePhotocardUpdates(updates);
  const dbUpdates: Record<string, unknown> = {};
  if (normalizedUpdates.cardTemplateId !== undefined) dbUpdates.card_template_id = normalizedUpdates.cardTemplateId;
  if (normalizedUpdates.group !== undefined) dbUpdates.group_name = normalizedUpdates.group;
  if (normalizedUpdates.members !== undefined) dbUpdates.members = normalizedUpdates.members;
  if (normalizedUpdates.category !== undefined) dbUpdates.category = normalizedUpdates.category;
  if ('source' in normalizedUpdates) dbUpdates.source = normalizedUpdates.source ?? null;
  if (normalizedUpdates.album !== undefined) dbUpdates.album = normalizedUpdates.album;
  if (normalizedUpdates.era !== undefined) dbUpdates.era = normalizedUpdates.era;
  if (normalizedUpdates.year !== undefined) dbUpdates.year = normalizedUpdates.year;
  if (normalizedUpdates.cardName !== undefined) dbUpdates.card_name = normalizedUpdates.cardName;
  if (normalizedUpdates.version !== undefined) dbUpdates.version = normalizedUpdates.version;
  if (normalizedUpdates.status !== undefined) dbUpdates.status = normalizedUpdates.status;
  if (normalizedUpdates.condition !== undefined) dbUpdates.condition = normalizedUpdates.condition;
  if (normalizedUpdates.isDuplicate !== undefined) dbUpdates.is_duplicate = normalizedUpdates.isDuplicate;
  if (normalizedUpdates.notes !== undefined) dbUpdates.notes = normalizedUpdates.notes;

  const { error } = await supabase
    .from('photocards')
    .update(dbUpdates)
    .in('id', ids)
    .eq('user_id', userId);
  if (error && isMissingNewSchemaColumnError(error)) {
    const { error: legacyError } = await supabase
      .from('photocards')
      .update(withoutNewSchemaColumns(dbUpdates))
      .in('id', ids)
      .eq('user_id', userId);
    if (legacyError) throw legacyError;
    return;
  }
  if (error) throw error;
}
