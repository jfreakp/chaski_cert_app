-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_certificateTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_institutionId_fkey";

-- DropIndex
DROP INDEX "Certificate_eventId_studentId_key";

-- AlterTable
ALTER TABLE "Certificate" DROP COLUMN "eventId",
ADD COLUMN     "processId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Event";

-- CreateTable
CREATE TABLE "CertificateProcess" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "institutionId" TEXT NOT NULL,
    "certificateTypeId" TEXT NOT NULL,

    CONSTRAINT "CertificateProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessParticipant" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "ProcessParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessParticipant_processId_studentId_key" ON "ProcessParticipant"("processId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_processId_studentId_key" ON "Certificate"("processId", "studentId");

-- AddForeignKey
ALTER TABLE "CertificateProcess" ADD CONSTRAINT "CertificateProcess_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateProcess" ADD CONSTRAINT "CertificateProcess_certificateTypeId_fkey" FOREIGN KEY ("certificateTypeId") REFERENCES "CertificateType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessParticipant" ADD CONSTRAINT "ProcessParticipant_processId_fkey" FOREIGN KEY ("processId") REFERENCES "CertificateProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessParticipant" ADD CONSTRAINT "ProcessParticipant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_processId_fkey" FOREIGN KEY ("processId") REFERENCES "CertificateProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
