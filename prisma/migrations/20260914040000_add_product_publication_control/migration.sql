ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Product"
SET "published" = true
WHERE "published" = false;

CREATE INDEX IF NOT EXISTS "Product_published_idx"
ON "Product"("published");
