import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', quiet: true });
config({ quiet: true });

const BUCKET = 'photocard-images';
const APPLY = process.argv.includes('--apply');
const PAGE_SIZE = 1000;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parsePublicStoragePath(imageUrl) {
  if (!imageUrl || imageUrl.startsWith('data:')) return null;

  try {
    const url = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const objectPath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    const ownerFolder = objectPath.split('/')[0] || '';
    if (!ownerFolder || !objectPath.includes('/')) return null;
    return { objectPath, ownerFolder };
  } catch {
    return null;
  }
}

function getExtension(pathname, contentType) {
  const existing = pathname.split('/').pop()?.split('.').pop()?.toLowerCase() || '';
  if (/^[a-z0-9]{2,5}$/.test(existing)) return existing === 'jpeg' ? 'jpg' : existing;

  const normalized = contentType.split(';')[0]?.trim().toLowerCase();
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/gif') return 'gif';
  return 'jpg';
}

async function listAffectedRows() {
  const affected = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('photocards')
      .select('id,user_id,image_url')
      .not('image_url', 'is', null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const rows = data ?? [];
    rows.forEach((row) => {
      const parsed = parsePublicStoragePath(row.image_url);
      if (parsed && parsed.ownerFolder !== row.user_id) {
        affected.push({ ...row, ...parsed });
      }
    });

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return affected;
}

async function copyImage(row) {
  const response = await fetch(row.image_url);
  if (!response.ok) throw new Error(`fetch failed with ${response.status}`);

  const blob = await response.blob();
  const contentType = response.headers.get('content-type') || blob.type || 'image/jpeg';
  const extension = getExtension(row.objectPath, contentType);
  const targetPath = `${row.user_id}/backfill/${Date.now()}-${row.id}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(targetPath, blob, {
    contentType,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(targetPath);
  const { error: updateError } = await supabase
    .from('photocards')
    .update({ image_url: data.publicUrl })
    .eq('id', row.id)
    .eq('user_id', row.user_id);
  if (updateError) throw updateError;

  return data.publicUrl;
}

const affected = await listAffectedRows();
console.log(JSON.stringify({
  mode: APPLY ? 'apply' : 'dry-run',
  affectedRows: affected.length,
  rows: affected.map(({ id, user_id, ownerFolder, objectPath }) => ({ id, user_id, ownerFolder, objectPath })),
}, null, 2));

if (!APPLY) {
  console.log('Dry run only. Re-run with --apply to copy images and update image_url.');
  process.exit(0);
}

let copied = 0;
for (const row of affected) {
  try {
    await copyImage(row);
    copied += 1;
  } catch (error) {
    console.error(`Failed to backfill ${row.id}:`, error);
  }
}

console.log(JSON.stringify({ copied, failed: affected.length - copied }, null, 2));
