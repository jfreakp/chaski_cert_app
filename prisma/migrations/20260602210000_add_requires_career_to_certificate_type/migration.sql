-- AlterTable
ALTER TABLE "CertificateType" ADD COLUMN "requiresCareer" BOOLEAN NOT NULL DEFAULT false;

-- Set requiresCareer = true for Título de Grado
UPDATE "CertificateType" SET "requiresCareer" = true WHERE name = 'Título de Grado';
