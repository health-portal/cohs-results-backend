/*
  Warnings:

  - You are about to drop the column `content` on the `files` table. All the data in the column will be lost.
  - You are about to drop the column `isCompressed` on the `files` table. All the data in the column will be lost.
  - Added the required column `buffer` to the `files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "files" DROP COLUMN "content",
DROP COLUMN "isCompressed",
ADD COLUMN     "buffer" BYTEA NOT NULL,
ADD COLUMN     "isProcessed" BOOLEAN NOT NULL DEFAULT false;
