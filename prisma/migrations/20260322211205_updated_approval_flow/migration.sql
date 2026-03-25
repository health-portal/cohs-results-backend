/*
  Warnings:

  - Added the required column `level` to the `approval_flows` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "approval_flows" ADD COLUMN     "level" "Level" NOT NULL;
