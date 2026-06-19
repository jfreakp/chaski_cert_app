-- AlterTable
ALTER TABLE "CertificateProcess" ADD COLUMN     "nameX" DOUBLE PRECISION,
ADD COLUMN     "nameY" DOUBLE PRECISION,
ADD COLUMN     "templateKey" TEXT;

-- CreateTable
CREATE TABLE "AccountRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRequest_pkey" PRIMARY KEY ("id")
);
