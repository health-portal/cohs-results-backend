/*
  Warnings:

  - A unique constraint covering the columns `[entity,role,lecturerId]` on the table `lecturer_designations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "lecturer_designations_entity_role_lecturerId_part_key";

-- CreateIndex
CREATE UNIQUE INDEX "lecturer_designations_entity_role_lecturerId_key" ON "lecturer_designations"("entity", "role", "lecturerId");
