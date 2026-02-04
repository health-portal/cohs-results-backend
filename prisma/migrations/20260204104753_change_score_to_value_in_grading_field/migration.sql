/*
  Warnings:

  - You are about to drop the column `maxScore` on the `grading_fields` table. All the data in the column will be lost.
  - Added the required column `maxValue` to the `grading_fields` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "grading_fields" DROP COLUMN "maxScore",
ADD COLUMN     "maxValue" DOUBLE PRECISION NOT NULL;
