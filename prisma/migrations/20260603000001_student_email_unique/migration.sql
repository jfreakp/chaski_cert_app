-- First fix any duplicate placeholder emails from the previous migration
UPDATE "Student" SET "email" = 'sin-email-' || "id" || '@pendiente.com' WHERE "email" = 'sin-email@pendiente.com';

-- Add unique constraint
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");
