import { Level, PrismaClient } from '@prisma/client';

export const collegeOfHealthSciences: Record<
  string,
  {
    name: string;
    shortName: string;
    maxLevel: Level;
  }[]
> = {
  'Basic Medical Sciences': [
    {
      name: 'Anatomy and Cell Biology',
      shortName: 'ACB',
      maxLevel: Level.LVL_400,
    },
    { name: 'Chemical Pathology', shortName: 'CHP', maxLevel: Level.LVL_500 },
    {
      name: 'Haematology and Immunology',
      shortName: 'HAI',
      maxLevel: Level.LVL_500,
    },
    { name: 'Medical Biochemistry', shortName: 'MBC', maxLevel: Level.LVL_400 },
    {
      name: 'Medical Pharmacology and Therapeutics',
      shortName: 'MPT',
      maxLevel: Level.LVL_500,
    },
    {
      name: 'Department of Medical Rehabilitation',
      shortName: 'DMR',
      maxLevel: Level.LVL_600,
    },
    {
      name: 'Morbid Anatomy and Forensic Medicine',
      shortName: 'MAF',
      maxLevel: Level.LVL_500,
    },
    { name: 'Nursing Science', shortName: 'NRS', maxLevel: Level.LVL_500 },
    {
      name: 'Physiological Sciences',
      shortName: 'PHS',
      maxLevel: Level.LVL_400,
    },
  ],
  'Clinical Sciences': [
    {
      name: 'Anaethesia and Intensive Care',
      shortName: 'AIC',
      maxLevel: Level.LVL_600,
    },
    { name: 'Community Health', shortName: 'CMH', maxLevel: Level.LVL_600 },
    {
      name: 'Dermatology and Venereology',
      shortName: 'DRV',
      maxLevel: Level.LVL_600,
    },
    { name: 'Medicine', shortName: 'MED', maxLevel: Level.LVL_600 },
    { name: 'Mental Health', shortName: 'MNH', maxLevel: Level.LVL_600 },
    {
      name: 'Obstetrics, Gyanaecology and Perinatology',
      shortName: 'OBG',
      maxLevel: Level.LVL_600,
    },
    { name: 'Ophthalmology', shortName: 'OPH', maxLevel: Level.LVL_600 },
    {
      name: 'Orthopaedic Surgery and Traumatology',
      shortName: 'ORT',
      maxLevel: Level.LVL_600,
    },
    { name: 'Otorhinolaryngology', shortName: 'ENT', maxLevel: Level.LVL_600 },
    {
      name: 'Paediatrics and Child Health',
      shortName: 'PED',
      maxLevel: Level.LVL_600,
    },
    { name: 'Radiology', shortName: 'RAD', maxLevel: Level.LVL_600 },
    { name: 'Surgery', shortName: 'SUR', maxLevel: Level.LVL_600 },
  ],
  Dentistry: [
    { name: 'Child Dental Health', shortName: 'CDH', maxLevel: Level.LVL_600 },
    {
      name: 'Oral or Maxillofacial Surgery',
      shortName: 'OMS',
      maxLevel: Level.LVL_600,
    },
    {
      name: 'Oral Medicine and Oral Pathology',
      shortName: 'OMP',
      maxLevel: Level.LVL_600,
    },
    {
      name: 'Preventive and Community Dentistry',
      shortName: 'PCD',
      maxLevel: Level.LVL_600,
    },
    {
      name: 'Restorative Dentistry',
      shortName: 'RED',
      maxLevel: Level.LVL_600,
    },
  ],
};

export default async function seedFacultiesAndDepartments(
  prisma: PrismaClient,
) {
  console.log('\n=== Faculty & Department Seeding Started ===\n');

  await prisma.$transaction(async (tx) => {
    for (const [facultyName, departments] of Object.entries(
      collegeOfHealthSciences,
    )) {
      console.log(`Processing Faculty: ${facultyName}`);

      await tx.faculty.upsert({
        where: { name: facultyName },
        update: {},
        create: {
          name: facultyName,
          departments: {
            create: departments.map((dept) => ({
              name: dept.name,
              maxLevel: dept.maxLevel,
              shortName: dept.shortName,
            })),
          },
        },
      });

      console.log(
        `→ Upserted Faculty: ${facultyName} (${departments.length} departments)\n`,
      );
    }
  });

  console.log('=== Faculty & Department Seeding Completed ===\n');
}
