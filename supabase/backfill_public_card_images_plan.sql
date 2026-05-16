-- PocaDex public-card image independence backfill plan.
--
-- This file is intentionally a plan/read-only audit helper, not a migration.
-- Do not run destructive storage cleanup until cross-user image URLs are copied
-- into each saved card owner's own photocard-images/{user_id}/ folder.

-- 1) Count saved card rows whose image_url points at another user's folder.
with image_cards as (
  select
    id,
    user_id,
    image_url,
    substring(image_url from '/photocard-images/([^/]+)/') as storage_owner_folder
  from public.photocards
  where image_url is not null
)
select
  count(*) as image_cards,
  count(*) filter (
    where storage_owner_folder is not null
      and storage_owner_folder <> user_id::text
  ) as cards_pointing_to_other_user_folder,
  count(distinct user_id) filter (
    where storage_owner_folder is not null
      and storage_owner_folder <> user_id::text
  ) as affected_saved_card_owners,
  count(distinct storage_owner_folder) filter (
    where storage_owner_folder is not null
      and storage_owner_folder <> user_id::text
  ) as referenced_source_folders
from image_cards;

-- 2) Review affected rows before any backfill job.
with image_cards as (
  select
    id,
    user_id,
    status,
    image_url,
    substring(image_url from '/photocard-images/([^/]+)/') as storage_owner_folder
  from public.photocards
  where image_url is not null
)
select id, user_id, status, storage_owner_folder, image_url
from image_cards
where storage_owner_folder is not null
  and storage_owner_folder <> user_id::text
order by user_id, storage_owner_folder, id;

-- 3) Safe backfill approach for a future script:
--    - For each affected row, download image_url.
--    - Upload the bytes to photocard-images/{user_id}/{row_id-or-template-id}.{ext}.
--    - Update only that row's image_url to the new public URL.
--    - Verify no remaining cross-user folder references.
--    - Only then allow account-deletion storage cleanup of deleted users' folders.
