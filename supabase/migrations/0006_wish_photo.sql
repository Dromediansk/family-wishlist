-- Family Wish List — one optional photo per wish
--
-- Run this once in the Supabase SQL editor, after 0005_drop_claim_notices.sql.
-- It adds a nullable column and nothing else: every existing wish stays valid,
-- and a wish without a photo is the unchanged wish it was before.
--
-- The bytes do NOT live here. They live in the private `wish-photos` Storage
-- bucket, which has to exist before this column can be filled — created by hand
-- in the dashboard in production, and declared in supabase/config.toml locally.
-- docs/setup/database.md#the-wish-photos-bucket
--
-- The column holds the object key, `{wish id}/{random}.{ext}`. The wish-id
-- prefix is what lets a delete or a replace clean up by listing one prefix
-- rather than by keeping a second set of books, and the random file name is
-- what changes the photo's URL whenever the picture changes.
--
-- The CHECK guards the shape itself. Unlike the other wish fields there is no
-- Zod rule to mirror: the key is built by uploadWishPhoto (src/lib/photos.ts)
-- and never arrives from a form, so the constraint is what keeps a hand-written
-- SQL insert from putting something unservable here. docs/content/wishes.md

begin;

alter table wishes
  add column if not exists photo_path text
    check (
      photo_path is null
      or photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|jpeg|png)$'
    );

commit;
