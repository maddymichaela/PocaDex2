import { supabase } from './supabase';
import { Photocard } from '../types';

// ── Row ↔ Photocard mappers ────────────────────────────────────────────────

function rowToPhotocard(row: Record<string, unknown>): Photocard {
  return {
    id: row.id as string,
    group: (row.group_name as string) ?? undefined,
    member: row.member as string,
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

function photocardToRow(pc: Omit<Photocard, 'id' | 'createdAt'>, userId: string) {
  return {
    user_id: userId,
    group_name: pc.group ?? null,
    member: pc.member,
    album: pc.album,
    era: pc.era ?? null,
    year: pc.year,
    card_name: pc.cardName,
    version: pc.version,
    status: pc.status,
    condition: pc.condition ?? null,
    is_duplicate: pc.isDuplicate ?? false,
    notes: pc.notes ?? null,
    image_url: pc.imageUrl ?? null,
  };
}

// ── Image upload ───────────────────────────────────────────────────────────

export async function uploadPhotocardImage(userId: string, dataUrl: string): Promise<string> {
  const [header, base64] = dataUrl.split(',');
  const mime = header.split(':')[1].split(';')[0];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const ext = mime.split('/')[1] || 'jpg';
  const filename = `${userId}/${Date.now()}.${ext}`;

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

export async function insertPhotocard(userId: string, pc: Photocard): Promise<Photocard> {
  let imageUrl = pc.imageUrl;
  if (imageUrl?.startsWith('data:')) {
    imageUrl = await uploadPhotocardImage(userId, imageUrl);
  }
  const { data, error } = await supabase
    .from('photocards')
    .insert(photocardToRow({ ...pc, imageUrl }, userId))
    .select()
    .single();
  if (error) throw error;
  return rowToPhotocard(data);
}

export async function updatePhotocard(userId: string, pc: Photocard): Promise<Photocard> {
  let imageUrl = pc.imageUrl;
  if (imageUrl?.startsWith('data:')) {
    imageUrl = await uploadPhotocardImage(userId, imageUrl);
  }
  const { data, error } = await supabase
    .from('photocards')
    .update(photocardToRow({ ...pc, imageUrl }, userId))
    .eq('id', pc.id)
    .eq('user_id', userId)
    .select()
    .single();
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
  const dbUpdates: Record<string, unknown> = {};
  if (updates.group !== undefined) dbUpdates.group_name = updates.group;
  if (updates.member !== undefined) dbUpdates.member = updates.member;
  if (updates.album !== undefined) dbUpdates.album = updates.album;
  if (updates.era !== undefined) dbUpdates.era = updates.era;
  if (updates.year !== undefined) dbUpdates.year = updates.year;
  if (updates.cardName !== undefined) dbUpdates.card_name = updates.cardName;
  if (updates.version !== undefined) dbUpdates.version = updates.version;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.condition !== undefined) dbUpdates.condition = updates.condition;
  if (updates.isDuplicate !== undefined) dbUpdates.is_duplicate = updates.isDuplicate;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  const { error } = await supabase
    .from('photocards')
    .update(dbUpdates)
    .in('id', ids)
    .eq('user_id', userId);
  if (error) throw error;
}
