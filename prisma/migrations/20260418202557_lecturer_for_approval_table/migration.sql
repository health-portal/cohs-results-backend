/*
  Warnings:

  - You are about to drop the column `fileId` on the `result_uploads` table. All the data in the column will be lost.
  - Added the required column `lecturerId` to the `approval_flows` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `result_uploads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filename` to the `result_uploads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimetype` to the `result_uploads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `result_uploads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `result_uploads` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "result_uploads" DROP CONSTRAINT "result_uploads_fileId_fkey";

-- DropIndex
DROP INDEX "result_uploads_fileId_key";

ALTER TABLE "approval_flows" ADD COLUMN "lecturerId" TEXT;

UPDATE "approval_flows" SET "lecturerId" = '856765fe-6748-4f10-864e-d91c73064fda' WHERE "lecturerId" IS NULL;

ALTER TABLE "approval_flows" ALTER COLUMN "lecturerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "result_uploads" DROP COLUMN "fileId",
ADD COLUMN     "category" "FileCategory" NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "filename" TEXT NOT NULL,
ADD COLUMN     "isProcessed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "mimetype" TEXT NOT NULL,
ADD COLUMN     "publicId" TEXT NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "lecturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
