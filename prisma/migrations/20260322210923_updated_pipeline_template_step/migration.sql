/*
  Warnings:

  - The `part` column on the `pipeline_template_steps` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "pipeline_template_steps" DROP COLUMN "part",
ADD COLUMN     "part" "Level";
