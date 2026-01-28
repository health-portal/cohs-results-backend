/*
  Warnings:

  - A unique constraint covering the columns `[entity,role,lecturerId]` on the table `lecturer_designations` will be added. If there are existing duplicate values, this will fail.
  - Made the column `lecturerId` on table `lecturer_designations` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `gender` to the `lecturers` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `lecturers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "lecturer_designations" DROP CONSTRAINT "lecturer_designations_lecturerId_fkey";

-- DropIndex
DROP INDEX "lecturer_designations_entity_role_key";

-- AlterTable
ALTER TABLE "lecturer_designations" ALTER COLUMN "lecturerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "lecturers" ADD COLUMN     "gender" "Gender" NOT NULL,
ALTER COLUMN "title" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "lecturer_designations_entity_role_lecturerId_key" ON "lecturer_designations"("entity", "role", "lecturerId");

-- AddForeignKey
ALTER TABLE "lecturer_designations" ADD CONSTRAINT "lecturer_designations_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "lecturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
