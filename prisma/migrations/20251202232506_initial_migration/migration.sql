-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'LECTURER', 'STUDENT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'WITHDRAWN', 'GRADUATED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('HARMATTAN', 'RAIN', 'ACADEMIC_YEAR');

-- CreateEnum
CREATE TYPE "LecturerRole" AS ENUM ('PROVOST', 'DEAN', 'HOD', 'PART_ADVISER');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('RESULTS', 'LECTURERS', 'COURSES', 'STUDENTS', 'REGISTRATIONS');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PASSED', 'FAILED', 'ENROLLED', 'ABSENT');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('LVL_100', 'LVL_200', 'LVL_300', 'LVL_400', 'LVL_500', 'LVL_600', 'LVL_700');

-- CreateEnum
CREATE TYPE "ResultType" AS ENUM ('INITIAL', 'RESIT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "UserRole" NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecturers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "otherName" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "qualification" TEXT,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "lecturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecturer_designations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entity" TEXT NOT NULL,
    "role" "LecturerRole" NOT NULL,
    "lecturerId" TEXT,

    CONSTRAINT "lecturer_designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "matricNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "otherName" TEXT,
    "admissionYear" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "gender" "Gender" NOT NULL,
    "degree" TEXT NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculties" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,

    CONSTRAINT "faculties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "maxLevel" "Level" NOT NULL,
    "facultyId" TEXT NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "academicYear" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "semester" "Semester" NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_sessions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "courseId" TEXT NOT NULL,
    "gradingSystemId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "course_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_systems" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "threshold" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "grading_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_fields" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "variable" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "gradingSystemId" TEXT NOT NULL,

    CONSTRAINT "grading_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_computations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "variable" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "gradingSystemId" TEXT NOT NULL,

    CONSTRAINT "grading_computations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_ranges" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "gradingSystemId" TEXT NOT NULL,

    CONSTRAINT "grading_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_lecturers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isCoordinator" BOOLEAN NOT NULL DEFAULT false,
    "courseSessionId" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,

    CONSTRAINT "course_lecturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_session_department_levels" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "level" "Level" NOT NULL,
    "departmentId" TEXT NOT NULL,
    "courseSessionId" TEXT NOT NULL,

    CONSTRAINT "course_session_department_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "studentId" TEXT NOT NULL,
    "courseSessionId" TEXT NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scores" JSONB NOT NULL,
    "type" "ResultType" NOT NULL,
    "enrollmentId" TEXT NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "filename" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "isCompressed" BOOLEAN NOT NULL DEFAULT false,
    "category" "FileCategory" NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorInfo" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "admins_userId_key" ON "admins"("userId");

-- CreateIndex
CREATE INDEX "admins_name_idx" ON "admins"("name");

-- CreateIndex
CREATE INDEX "admins_deletedAt_idx" ON "admins"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lecturers_phone_key" ON "lecturers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "lecturers_userId_key" ON "lecturers"("userId");

-- CreateIndex
CREATE INDEX "lecturers_departmentId_idx" ON "lecturers"("departmentId");

-- CreateIndex
CREATE INDEX "lecturers_lastName_idx" ON "lecturers"("lastName");

-- CreateIndex
CREATE INDEX "lecturers_deletedAt_idx" ON "lecturers"("deletedAt");

-- CreateIndex
CREATE INDEX "lecturer_designations_role_idx" ON "lecturer_designations"("role");

-- CreateIndex
CREATE INDEX "lecturer_designations_lecturerId_idx" ON "lecturer_designations"("lecturerId");

-- CreateIndex
CREATE UNIQUE INDEX "lecturer_designations_entity_role_key" ON "lecturer_designations"("entity", "role");

-- CreateIndex
CREATE UNIQUE INDEX "students_matricNumber_key" ON "students"("matricNumber");

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_key" ON "students"("userId");

-- CreateIndex
CREATE INDEX "students_departmentId_idx" ON "students"("departmentId");

-- CreateIndex
CREATE INDEX "students_level_idx" ON "students"("level");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- CreateIndex
CREATE INDEX "students_matricNumber_idx" ON "students"("matricNumber");

-- CreateIndex
CREATE INDEX "students_deletedAt_idx" ON "students"("deletedAt");

-- CreateIndex
CREATE INDEX "students_departmentId_level_idx" ON "students"("departmentId", "level");

-- CreateIndex
CREATE INDEX "students_departmentId_status_idx" ON "students"("departmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "faculties_name_key" ON "faculties"("name");

-- CreateIndex
CREATE INDEX "faculties_deletedAt_idx" ON "faculties"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_shortName_key" ON "departments"("shortName");

-- CreateIndex
CREATE INDEX "departments_facultyId_idx" ON "departments"("facultyId");

-- CreateIndex
CREATE INDEX "departments_deletedAt_idx" ON "departments"("deletedAt");

-- CreateIndex
CREATE INDEX "departments_name_idx" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_academicYear_key" ON "sessions"("academicYear");

-- CreateIndex
CREATE INDEX "sessions_startDate_idx" ON "sessions"("startDate");

-- CreateIndex
CREATE INDEX "sessions_endDate_idx" ON "sessions"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE INDEX "courses_deletedAt_idx" ON "courses"("deletedAt");

-- CreateIndex
CREATE INDEX "courses_departmentId_idx" ON "courses"("departmentId");

-- CreateIndex
CREATE INDEX "courses_semester_idx" ON "courses"("semester");

-- CreateIndex
CREATE INDEX "courses_code_idx" ON "courses"("code");

-- CreateIndex
CREATE INDEX "course_sessions_courseId_idx" ON "course_sessions"("courseId");

-- CreateIndex
CREATE INDEX "course_sessions_sessionId_idx" ON "course_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "course_sessions_isApproved_idx" ON "course_sessions"("isApproved");

-- CreateIndex
CREATE INDEX "course_sessions_isPublished_idx" ON "course_sessions"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "course_sessions_courseId_sessionId_key" ON "course_sessions"("courseId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "grading_systems_name_key" ON "grading_systems"("name");

-- CreateIndex
CREATE INDEX "grading_systems_deletedAt_idx" ON "grading_systems"("deletedAt");

-- CreateIndex
CREATE INDEX "grading_systems_name_idx" ON "grading_systems"("name");

-- CreateIndex
CREATE INDEX "grading_fields_label_idx" ON "grading_fields"("label");

-- CreateIndex
CREATE UNIQUE INDEX "grading_fields_gradingSystemId_label_variable_key" ON "grading_fields"("gradingSystemId", "label", "variable");

-- CreateIndex
CREATE INDEX "grading_computations_label_idx" ON "grading_computations"("label");

-- CreateIndex
CREATE UNIQUE INDEX "grading_computations_gradingSystemId_label_variable_key" ON "grading_computations"("gradingSystemId", "label", "variable");

-- CreateIndex
CREATE INDEX "grading_ranges_label_idx" ON "grading_ranges"("label");

-- CreateIndex
CREATE UNIQUE INDEX "grading_ranges_gradingSystemId_label_key" ON "grading_ranges"("gradingSystemId", "label");

-- CreateIndex
CREATE INDEX "course_lecturers_courseSessionId_idx" ON "course_lecturers"("courseSessionId");

-- CreateIndex
CREATE INDEX "course_lecturers_lecturerId_idx" ON "course_lecturers"("lecturerId");

-- CreateIndex
CREATE INDEX "course_lecturers_isCoordinator_idx" ON "course_lecturers"("isCoordinator");

-- CreateIndex
CREATE UNIQUE INDEX "course_lecturers_courseSessionId_lecturerId_key" ON "course_lecturers"("courseSessionId", "lecturerId");

-- CreateIndex
CREATE INDEX "course_session_department_levels_courseSessionId_idx" ON "course_session_department_levels"("courseSessionId");

-- CreateIndex
CREATE INDEX "course_session_department_levels_departmentId_idx" ON "course_session_department_levels"("departmentId");

-- CreateIndex
CREATE INDEX "course_session_department_levels_level_idx" ON "course_session_department_levels"("level");

-- CreateIndex
CREATE UNIQUE INDEX "course_session_department_levels_courseSessionId_department_key" ON "course_session_department_levels"("courseSessionId", "departmentId", "level");

-- CreateIndex
CREATE INDEX "enrollments_studentId_idx" ON "enrollments"("studentId");

-- CreateIndex
CREATE INDEX "enrollments_courseSessionId_idx" ON "enrollments"("courseSessionId");

-- CreateIndex
CREATE INDEX "enrollments_status_idx" ON "enrollments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_studentId_courseSessionId_key" ON "enrollments"("studentId", "courseSessionId");

-- CreateIndex
CREATE INDEX "results_enrollmentId_idx" ON "results"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "results_enrollmentId_type_key" ON "results"("enrollmentId", "type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturers" ADD CONSTRAINT "lecturers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturers" ADD CONSTRAINT "lecturers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturer_designations" ADD CONSTRAINT "lecturer_designations_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "lecturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_gradingSystemId_fkey" FOREIGN KEY ("gradingSystemId") REFERENCES "grading_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_fields" ADD CONSTRAINT "grading_fields_gradingSystemId_fkey" FOREIGN KEY ("gradingSystemId") REFERENCES "grading_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_computations" ADD CONSTRAINT "grading_computations_gradingSystemId_fkey" FOREIGN KEY ("gradingSystemId") REFERENCES "grading_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_ranges" ADD CONSTRAINT "grading_ranges_gradingSystemId_fkey" FOREIGN KEY ("gradingSystemId") REFERENCES "grading_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_lecturers" ADD CONSTRAINT "course_lecturers_courseSessionId_fkey" FOREIGN KEY ("courseSessionId") REFERENCES "course_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_lecturers" ADD CONSTRAINT "course_lecturers_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "lecturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_session_department_levels" ADD CONSTRAINT "course_session_department_levels_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_session_department_levels" ADD CONSTRAINT "course_session_department_levels_courseSessionId_fkey" FOREIGN KEY ("courseSessionId") REFERENCES "course_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_courseSessionId_fkey" FOREIGN KEY ("courseSessionId") REFERENCES "course_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
