CREATE TYPE "GameDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

ALTER TABLE "games"
ADD COLUMN "occasion" VARCHAR(200),
ADD COLUMN "difficulty" "GameDifficulty",
ADD COLUMN "gameplay" VARCHAR(2000),
ADD COLUMN "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
