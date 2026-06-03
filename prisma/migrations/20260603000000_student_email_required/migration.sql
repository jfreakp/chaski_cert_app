-- Asignar placeholder a estudiantes sin email antes de aplicar NOT NULL
UPDATE "Student" SET "email" = 'sin-email@pendiente.com' WHERE "email" IS NULL;

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "email" SET NOT NULL;
