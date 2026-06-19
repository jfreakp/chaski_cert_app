-- AlterTable
ALTER TABLE "CertificateProcess" ADD COLUMN     "careerId" TEXT;

-- AddForeignKey
ALTER TABLE "CertificateProcess" ADD CONSTRAINT "CertificateProcess_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "Career"("id") ON DELETE SET NULL ON UPDATE CASCADE;
