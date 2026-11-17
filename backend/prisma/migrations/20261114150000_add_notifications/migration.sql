CREATE TYPE "NotificationType" AS ENUM (
    'LOAN_BORROWED',
    'LOAN_OVERDUE_REMINDER'
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_loan_id_type_key"
ON "notifications"("loan_id", "type");

CREATE INDEX "notifications_user_id_created_at_idx"
ON "notifications"("user_id", "created_at");

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_loan_id_fkey"
FOREIGN KEY ("loan_id") REFERENCES "loans"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
