/*
  Warnings:

  - Made the column `description` on table `grading_computations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `description` on table `grading_fields` required. This step will fail if there are existing NULL values in that column.
  - Made the column `description` on table `grading_ranges` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "grading_computations" ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "grading_fields" ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "grading_ranges" ALTER COLUMN "description" SET NOT NULL;
