import { LecturerRole, PrismaClient } from '@prisma/client';
import { collegeOfHealthSciences } from './faculties-and-depts.seeder';

export default async function seedLecturerDesignations(prisma: PrismaClient) {
  console.log('\n=== Lecturer Designations Seeding Started ===\n');

  const designations: { role: LecturerRole; entity: string }[] = [
    {
      role: LecturerRole.PROVOST,
      entity: `College of Health Sciences`,
    },
  ];
  console.log('→ Added Provost Designation');

  const deanOfFacultyDesignations = Object.keys(collegeOfHealthSciences).map(
    (faculty) => ({
      role: LecturerRole.DEAN,
      entity: faculty,
    }),
  );
  designations.push(...deanOfFacultyDesignations);
  console.log(`→ Added ${deanOfFacultyDesignations.length} Dean Designations`);

  const departments = Object.values(collegeOfHealthSciences).flatMap(
    (faculty) => faculty,
  );
  const hodDesignations = departments.map((dept) => ({
    role: LecturerRole.HOD,
    entity: dept.name,
  }));
  designations.push(...hodDesignations);
  console.log(`→ Added ${hodDesignations.length} HOD Designations`);

  let partAdviserCount = 0;
  for (const dept of departments) {
    const maxLevel = parseInt(dept.maxLevel.split('LVL_')[1], 10);
    for (let level = 100; level <= maxLevel; level += 100) {
      designations.push({
        role: LecturerRole.PART_ADVISER,
        entity: `${dept.name} LVL_${level}`,
      });
      partAdviserCount++;
    }
  }
  console.log(`→ Added ${partAdviserCount} Part Adviser Designations`);

  await prisma.lecturerDesignation.createMany({
    data: designations,
    skipDuplicates: true,
  });

  console.log(
    `\nTotal Lecturer Designations Added: ${designations.length}\n=== Lecturer Designations Seeding Completed ===\n`,
  );
}
