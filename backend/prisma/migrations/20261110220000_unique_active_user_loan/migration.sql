-- The current business limit is one ACTIVE loan per user. Returned loans remain in history.
CREATE UNIQUE INDEX "loans_one_active_per_user"
ON "loans" ("user_id") WHERE "status" = 'ACTIVE';
