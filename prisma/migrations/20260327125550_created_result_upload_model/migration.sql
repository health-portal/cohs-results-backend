-- CreateTable
CREATE TABLE "result_uploads" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courseSessionId" TEXT NOT NULL,
    "courseSesnDeptLevelId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "result_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "result_uploads_fileId_key" ON "result_uploads"("fileId");

-- CreateIndex
CREATE INDEX "result_uploads_uploadedById_idx" ON "result_uploads"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "result_uploads_courseSessionId_courseSesnDeptLevelId_key" ON "result_uploads"("courseSessionId", "courseSesnDeptLevelId");

-- AddForeignKey
ALTER TABLE "result_uploads" ADD CONSTRAINT "result_uploads_courseSessionId_fkey" FOREIGN KEY ("courseSessionId") REFERENCES "course_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_uploads" ADD CONSTRAINT "result_uploads_courseSesnDeptLevelId_fkey" FOREIGN KEY ("courseSesnDeptLevelId") REFERENCES "course_session_department_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_uploads" ADD CONSTRAINT "result_uploads_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "lecturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_uploads" ADD CONSTRAINT "result_uploads_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
