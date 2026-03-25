/*
  Warnings:

  - You are about to drop the column `courseRequestVersion` on the `approval_flows` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[courseSessionId,takingDepartmentId,level]` on the table `approval_flows` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "approval_flows_courseSessionId_takingDepartmentId_courseReq_key";

-- AlterTable
ALTER TABLE "approval_flows" DROP COLUMN "courseRequestVersion";

-- CreateIndex
CREATE UNIQUE INDEX "approval_flows_courseSessionId_takingDepartmentId_level_key" ON "approval_flows"("courseSessionId", "takingDepartmentId", "level");
