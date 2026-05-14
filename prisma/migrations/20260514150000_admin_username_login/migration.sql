-- Add username as nullable first so existing administrators can be backfilled safely.
ALTER TABLE "AdminUser" ADD COLUMN "username" TEXT;

-- Email is no longer required. The existing unique index allows multiple NULL values in PostgreSQL.
ALTER TABLE "AdminUser" ALTER COLUMN "email" DROP NOT NULL;

-- Backfill username from name, then email local-part, then admin.
-- Values are normalized to a conservative username charset and made unique with numeric suffixes.
DO $$
DECLARE
  admin_record RECORD;
  base_username TEXT;
  candidate_username TEXT;
  suffix INTEGER;
BEGIN
  FOR admin_record IN
    SELECT "id", "name", "email"
    FROM "AdminUser"
    ORDER BY "createdAt", "id"
  LOOP
    base_username := NULLIF(BTRIM(admin_record."name"), '');

    IF base_username IS NULL AND admin_record."email" IS NOT NULL THEN
      base_username := NULLIF(SPLIT_PART(admin_record."email", '@', 1), '');
    END IF;

    IF base_username IS NULL THEN
      base_username := 'admin';
    END IF;

    base_username := REGEXP_REPLACE(base_username, '[^A-Za-z0-9._-]+', '-', 'g');
    base_username := BTRIM(base_username, '.-_');

    IF base_username = '' THEN
      base_username := 'admin';
    END IF;

    candidate_username := LEFT(base_username, 32);
    suffix := 2;

    WHILE EXISTS (
      SELECT 1
      FROM "AdminUser"
      WHERE LOWER("username") = LOWER(candidate_username)
    ) LOOP
      candidate_username := LEFT(base_username, GREATEST(1, 32 - LENGTH('-' || suffix::TEXT))) || '-' || suffix::TEXT;
      suffix := suffix + 1;
    END LOOP;

    UPDATE "AdminUser"
    SET "username" = candidate_username
    WHERE "id" = admin_record."id";
  END LOOP;
END $$;

ALTER TABLE "AdminUser" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
