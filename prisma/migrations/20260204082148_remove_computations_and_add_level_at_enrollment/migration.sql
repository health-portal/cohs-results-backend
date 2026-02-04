/*
  Warnings:

  - You are about to drop the `grading_computations` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `levelAtEnrollment` to the `enrollments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "grading_computations" DROP CONSTRAINT "grading_computations_gradingSystemId_fkey";

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "levelAtEnrollment" "Level" NOT NULL;

-- DropTable
DROP TABLE "grading_computations";
