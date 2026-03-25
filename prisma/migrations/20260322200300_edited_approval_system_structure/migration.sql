/*
  Warnings:

  - You are about to drop the column `departmentId` on the `pipeline_template_activations` table. All the data in the column will be lost.
  - You are about to drop the column `scopeType` on the `pipeline_template_activations` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `scopeType` on the `pipeline_templates` table. All the data in the column will be lost.
  - Made the column `facultyId` on table `pipeline_template_activations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `facultyId` on table `pipeline_templates` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "pipeline_template_activations" DROP CONSTRAINT "pipeline_template_activations_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "pipeline_template_activations" DROP CONSTRAINT "pipeline_template_activations_facultyId_fkey";

-- DropForeignKey
ALTER TABLE "pipeline_templates" DROP CONSTRAINT "pipeline_templates_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "pipeline_templates" DROP CONSTRAINT "pipeline_templates_facultyId_fkey";

-- AlterTable
ALTER TABLE "pipeline_template_activations" DROP COLUMN "departmentId",
DROP COLUMN "scopeType",
ALTER COLUMN "facultyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "pipeline_templates" DROP COLUMN "departmentId",
DROP COLUMN "scopeType",
ALTER COLUMN "facultyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "pipeline_templates" ADD CONSTRAINT "pipeline_templates_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_template_activations" ADD CONSTRAINT "pipeline_template_activations_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
