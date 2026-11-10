-- Prisma schema cannot express partial unique indexes. Preserve this index in migrations.
CREATE UNIQUE INDEX "loans_one_active_per_copy"
ON "loans" ("game_copy_id") WHERE "status" = 'ACTIVE';
