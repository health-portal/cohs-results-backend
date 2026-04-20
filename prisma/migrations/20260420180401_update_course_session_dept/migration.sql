/*
  Warnings:

  - You are about to drop the column `isPublished` on the `course_session_department_levels` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DeptResultStatus" AS ENUM ('REJECTED', 'APPROVED', 'PUBLISHED', 'IN_PROGRESS', 'NOT_UPLOADED');

-- AlterTable
ALTER TABLE "course_session_department_levels" DROP COLUMN "isPublished",
ADD COLUMN     "resultStatus" "DeptResultStatus" NOT NULL DEFAULT 'NOT_UPLOADED';
