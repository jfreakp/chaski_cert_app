-- AlterTable
ALTER TABLE "CertificateProcess" ADD COLUMN     "pdfWidth" DOUBLE PRECISION,
ADD COLUMN     "pdfHeight" DOUBLE PRECISION,
ADD COLUMN     "nameFontSize" DOUBLE PRECISION,
ADD COLUMN     "nameFontFamily" TEXT,
ADD COLUMN     "nameColor" TEXT;
