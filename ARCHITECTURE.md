# Architecture Documentation: CoHS Results Portal

This document provides a comprehensive overview of the system architecture for the CoHS Results Portal, covering the data models, API structure, and background processing mechanisms.

## 1. Data Models

The system uses PostgreSQL, managed via Prisma. The models are categorized into Identity, Academic Organization, Course Management, Grading, and Records.

### Identity & Access
*   **User**: The central authentication entity. Uses a 1-to-1 relationship to link to specific roles (Admin, Lecturer, or Student). Stores credentials and global roles.
*   **Admin**: Represents system administrators responsible for high-level configuration (College setup, Session management).
*   **Lecturer**: Teaching staff members. Linked to a Department and can be assigned to multiple courses.
*   **LecturerDesignation**: Tracks specific leadership roles held by lecturers (e.g., HOD, Dean, Provost) within specific entities.
*   **Student**: Learner records, including matriculation numbers, current levels, and academic status.

### Academic Organization
*   **Faculty**: The highest academic grouping (e.g., Faculty of Basic Medical Sciences).
*   **Department**: Academic divisions within a Faculty. Defines the `maxLevel` achievable within that department.
*   **Session**: Represents an academic year (e.g., 2024/2025) with specific start and end dates.

### Course Management
*   **Course**: The blueprint of a subject, defining its code, title, units, and the department it belongs to.
*   **CourseSession**: An instance of a `Course` offered within a specific `Session`. This is the junction where grading systems and student enrollments are attached.
*   **CourseLecturer**: A many-to-many mapping between `Lecturer` and `CourseSession`, identifying who teaches the course and who acts as the Coordinator.
*   **CourseSesnDeptAndLevel**: Mapping that defines which student cohorts (by department and level) are eligible/required to take a specific `CourseSession`.

### Grading System
*   **GradingSystem**: A template for scoring (e.g., "Standard 70-point scale"). Contains a pass threshold.
*   **GradingField**: Specific components of a grade (e.g., "CA" at 30%, "Exam" at 70%). Uses `variable` keys for JSON score storage.
*   **GradingRange**: Defines grade boundaries (e.g., 70-100 = "A", 60-69 = "B").

### Academic Records & System
*   **Enrollment**: Records a student's registration in a `CourseSession`. Tracks the student's level at the time of taking the course.
*   **Result**: Stores the actual scores in a JSON format. Supports `INITIAL` and `RESIT` types.
*   **File**: Tracks uploaded documents (CSV/Excel) for batch processing of students, lecturers, or results.
*   **AuditLog**: Immutable record of system actions for security and debugging.

---

## 2. API Resources & Routes

The API is structured into functional modules based on the actor's requirements.

### Authentication (`/auth`)
*   `POST /auth/activate`: Activate account via token and set password.
*   `POST /auth/signin`: Identity-based login for all roles.
*   `POST /auth/reset-password/request` & `confirm`: Self-service password recovery.

### Administrative Management
*   **Admin Management (`/admin`)**: Create/Invite new admins and manage admin profiles.
*   **College Setup (`/college`)**: CRUD operations for Faculties and Departments.
*   **Course Registry (`/courses`)**: Manage the global course list and perform batch course uploads via file.
*   **Lecturer Management (`/lecturers`)**: Manage lecturer profiles and department assignments.
*   **Student Management (`/students`)**: CRUD operations on student records and batch student creation.
*   **Session Management (`/sessions`)**: 
    *   Configure academic years.
    *   Assign courses to sessions.
    *   Assign lecturers and student cohorts (Dept/Level) to courses within a session.

### Grading Configuration (`/grading-systems`)
*   Define grading templates, specific score fields (CA/Exam weights), and result ranges (A-F).

### Lecturer Operations (`/lecturer`)
*   `GET /lecturer/courses-sessions`: List courses the lecturer is assigned to.
*   `GET/POST /lecturer/courses-sessions/{id}/students`: Manage student enrollment for a specific course instance.
*   `POST /lecturer/courses-sessions/{id}/results`: Batch upload student results via file.
*   `PATCH /lecturer/courses-sessions/{id}/results/{studentId}`: Manually edit individual student scores.

### Student Access (`/student`)
*   `GET /student/profile`: View personal academic details.
*   `GET /student/enrollments`: View registered courses and historical results.
*   `POST /student/change-password`: Update account security.

### File & Batch Processing (`/files`)
*   `GET /files`: Track status of uploaded files.
*   `PUT /files/{id}/alt-header-mappings`: Resolve column header mismatches in uploaded CSV/Excel files to ensure successful data parsing.

---

## 3. Background Processing (PGBoss)

To ensure system responsiveness, the portal integrates **PGBoss** for job queue management.

### Implementation Details:
*   **Infrastructure**: PGBoss uses the existing PostgreSQL database as the backing store for the queue, avoiding the need for additional infrastructure like Redis.
*   **Asynchronous Tasks**:
    *   **Batch Uploads**: When an Admin or Lecturer uploads a file (Courses, Lecturers, Students, or Results), the API saves the file to the `File` model and dispatches a background job.
    *   **Data Validation**: The background worker parses the file, validates the data against existing records, and updates the database.
    *   **Result Evaluation**: Large-scale calculations of grades based on `GradingSystem` rules are handled off the main request-response cycle.
*   **Workflow**:
    1.  User uploads file -> API returns `201 Created`.
    2.  Job is queued in PGBoss.
    3.  Worker processes the job and sets `File.isProcessed` to `true`.
    4.  If headers are unrecognized, the process pauses, requiring the user to provide mappings via the `/alt-header-mappings` endpoint.