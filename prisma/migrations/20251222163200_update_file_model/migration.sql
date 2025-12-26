/*
  Warnings:

  - Added the required column `mimetype` to the `files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "files" ADD COLUMN     "description" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "mimetype" TEXT NOT NULL;
