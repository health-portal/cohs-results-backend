export const GET_STUDENTS_EXAMPLE = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    matricNumber: 'NSC/2022/001',
    firstName: 'Moyin',
    lastName: 'Olugbenga',
    otherName: 'Ola',
    level: 'LVL_300',
    gender: 'FEMALE',
    admissionYear: '2022/2023',
    degree: 'Bsc. Nursing Science',
    status: 'ACTIVE',
    email: 'moyin@example.com',
    department: 'Nursing Science',
  },
];

export const GET_STUDENT_SESSIONS_EXAMPLE = [
  {
    sessionId: '27d37006-fc98-43e4-a8ac-7c72f0a7f23f',
    academicYear: '2025/2026',
    semesters: [
      {
        semester: 'HARMATTAN',
        enrollments: [
          {
            course: {
              code: 'EMN303',
              title: 'Emergency Nursing',
              units: 2,
              semester: 'HARMATTAN',
            },
            results: [
              {
                id: '4a685138-831f-4aa0-ad2a-bee311735483',
                createdAt: '2026-04-25T14:36:41.137Z',
                updatedAt: '2026-05-01T08:59:10.666Z',
                scores: { examination: '60', continuousAssessment: '24' },
                evaluations: { CA: 24, EXAM: 60, Grade: 'A', Total: 84 },
                type: 'INITIAL',
                enrollmentId: '0bdca655-32d8-4de4-a698-b72dad399990',
              },
            ],
          },
        ],
      },
    ],
  },
];