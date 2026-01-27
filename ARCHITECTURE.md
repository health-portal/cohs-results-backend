# ARCHITECTURE

## **Database Schema Design Report**

## **1. User Management & Authentication**

This module handles system access, authentication, and the specific profiles associated with different types of users.

- **User**
  - **Description:** The central authentication entity. It stores credentials (email, password) and the global system role.
  - **Relationships:**
    - **One-to-One:** Links to `Admin`, `Lecturer`, or `Student` profiles based on the `role` enum.
    - **One-to-Many:** Links to `File` uploads owned by the user.

- **Admin**
  - **Description:** Represents an administrative profile.
  - **Relationships:**
    - **Belongs to:** `User` (One-to-One).

- **Student**
  - **Description:** Represents a student profile containing academic details like matriculation number, admission year, current level, and degree status.
  - **Relationships:**
    - **Belongs to:** `User` (One-to-One) for login.
    - **Belongs to:** `Department` (Many-to-One) indicating their major.
    - **Has Many:** `Enrollment` records (courses they are taking).

- **Lecturer**
  - **Description:** Represents an academic staff profile containing titles, qualifications, and personal details.
  - **Relationships:**
    - **Belongs to:** `User` (One-to-One) for login.
    - **Belongs to:** `Department` (Many-to-One) as their primary faculty placement.
    - **Has Many:** `CourseLecturer` entries (courses they teach).
    - **Has Many:** `LecturerDesignation` entries (administrative roles like HOD/Dean).

- **LecturerDesignation**
  - **Description:** Tracks specific administrative roles assigned to a lecturer (e.g., Dean, HOD, Part Adviser) relative to a specific entity.
  - **Relationships:**
    - **Belongs to:** `Lecturer`.

---

### **2. Academic Structure**

This module defines the hierarchy of the institution (Faculties and Departments) and the timeline (Sessions).

- **Faculty**
  - **Description:** The top-level academic unit (e.g., Faculty of Science).
  - **Relationships:**
    - **Has Many:** `Department`s.

- **Department**
  - **Description:** A specific academic subdivision (e.g., Department of Computer Science). It enforces the maximum academic level available.
  - **Relationships:**
    - **Belongs to:** `Faculty`.
    - **Has Many:** `Student`s and `Lecturer`s.
    - **Has Many:** `Course`s (courses owned by the department).

- **Session**
  - **Description:** Represents an academic timeframe (e.g., "2024/2025 Academic Year") with defined start and end dates.
  - **Relationships:**
    - **Has Many:** `CourseSession`s (instances of courses taught in this specific timeframe).

---

### **3. Course Management**

This module distinguishes between the static catalog of courses and the specific instances offered during a semester.

- **Course**
  - **Description:** The static catalog entry of a subject. It includes immutable details like the course code, title, unit load, and the semester it is traditionally offered.
  - **Relationships:**
    - **Belongs to:** `Department` (the owner of the course).
    - **Has Many:** `CourseSession`s (history of when this course was taught).

- **CourseSession**
  - **Description:** A specific instance of a `Course` being taught during a specific `Session`. It handles approval/publishing workflows and links the course to the specific grading system used for that year.
  - **Relationships:**
    - **Belongs to:** `Course` and `Session`.
    - **Belongs to:** `GradingSystem` (defining how this specific class is scored).
    - **Has Many:** `CourseLecturer`s (staff teaching this specific instance).
    - **Has Many:** `Enrollment`s (students taking this class).
    - **Has Many:** `CourseSesnDeptAndLevel` (defines eligibility).

- **CourseLecturer**
  - **Description:** A pivot entity linking a `Lecturer` to a `CourseSession`. It includes a boolean flag `isCoordinator` to identify the lead lecturer for that course instance.
  - **Relationships:**
    - **Links:** `Lecturer` and `CourseSession`.

- **CourseSesnDeptAndLevel**
  - **Description:** Defines which departments and student levels are eligible or required to take a specific course session (e.g., "CSC 101" is for "Computer Science" at "Level 100").
  - **Relationships:**
    - **Links:** `CourseSession` and `Department`.

---

### **4. Grading & Assessment**

This module handles the dynamic configuration of grading rules and the storage of student results.

- **GradingSystem**
  - **Description:** A template defining how a course is graded (e.g., pass mark threshold).
  - **Relationships:**
    - **Has Many:** `GradingField` (components like Exam, CA).
    - **Has Many:** `GradingComputation` (formulas).
    - **Has Many:** `GradingRange` (Grade definitions A, B, C).
    - **Used By:** `CourseSession`.

- **GradingField**
  - **Description:** Defines specific assessable components (e.g., "Mid-Semester Test", "Final Exam") and their weight/max score.
  - **Relationships:**
    - **Belongs to:** `GradingSystem`.

- **GradingComputation** & **GradingRange**
  - **Description:** `Computation` stores logic for calculating totals. `Range` stores letter grade boundaries (e.g., 70-100 is an 'A').
  - **Relationships:**
    - **Belong to:** `GradingSystem`.

- **Enrollment**
  - **Description:** Records a student's registration for a specific course session and their final status (Passed/Failed/Absent).
  - **Relationships:**
    - **Links:** `Student` and `CourseSession`.
    - **Has Many:** `Result`s.

- **Result**
  - **Description:** Stores the actual academic performance. It uses a JSON field (`scores`) to flexibly store values matching the `GradingFields`. It distinguishes between `INITIAL` attempts and `RESIT` attempts.
  - **Relationships:**
    - **Belongs to:** `Enrollment`.

---

### **5. Utilities & System Logs**

- **File**
  - **Description:** Stores binary data for uploaded documents (Results, Bulk Registrations, etc.) along with processing status metadata.
  - **Relationships:**
    - **Belongs to:** `User` (uploader).

- **AuditLog**
  - **Description:** A security and tracking entity that records actions taken within the system (`action`), who did it (`actorInfo`), and on what object (`entity`, `entityId`).

Based on the OpenAPI specification and the Database Schema provided, here is a comprehensive **System Resource & Functional Report**.

This report breaks down the backend into functional domains, explaining how resources interact and defining the specific capabilities of the three actor types: **Admin**, **Lecturer**, and **Student**.

---

## **Backend System Resource Report**

### **1. Authentication & Account Lifecycle**

**Controllers:** `AuthController`, `AdminController`
**Primary Actors:** All Users

The system uses a centralized authentication mechanism via JWT (JSON Web Tokens). The account lifecycle is "Invite-First," meaning Admins initiate account creation, and users claim their accounts.

- **Account Activation:**
  - **Workflow:** An Admin creates an entity (Admin, Lecturer, or Student). The system generates a token. The user hits the `/auth/activate` endpoint with this token to set their password and activate their account.
  - **Login:** The `/auth/signin` endpoint accepts an identifier (Email or Matric No) and Password to return an `accessToken`.
- **Password Management:**
  - **Recovery:** Users can request a password reset (`/auth/reset-password/request`), receiving a token to confirm the change (`/auth/reset-password/confirm`).
  - **Self-Service:** Students can change their password while logged in via `/student/change-password`.

---

### **2. College Structure Management**

**Controllers:** `CollegeController`
**Primary Actor:** Admin

This module defines the static hierarchy of the institution. It serves as the backbone for linking students and courses.

- **Faculties:** The top-level units (e.g., "Faculty of Science"). Admins can create (`POST`) and retrieve (`GET`) faculties.
- **Departments:** The specific academic units (e.g., "Computer Science").
  - **Constraint:** Every department must belong to a Faculty and has a `maxLevel` (e.g., LVL_400 or LVL_500), which dictates the maximum academic progression for students in that department.
  - **Relationships:** Departments are the owners of **Courses**, **Lecturers**, and **Students**.

---

### **3. Academic Session & Planning**

**Controllers:** `SessionsController`
**Primary Actor:** Admin

This module handles the temporal aspect of the university (Time-boxing).

- **Session Management:** Admins create academic years (e.g., "2025/2026") with defined `startDate` and `endDate`.
- **Course Session Instantiation (Crucial Logic):**
  - A **Course** is a static catalog entry. A **CourseSession** is that course being taught in a specific year.
  - **Workflow:** Admins use `/sessions/{sessionId}/courses` to "Assign" a static course to the current year.
  - **Configuration:** When assigning a course to a session, the Admin must select a **Grading System** (defining how it will be scored) and assign **Departments/Levels** eligible to take it.
- **Staffing:** Admins assign lecturers to these course sessions via `/sessions/{id}/courses/{id}/lecturers`. This endpoint creates the `CourseLecturer` link and designates one lecturer as the **Coordinator**.

---

### **4. Grading System Configuration**

**Controllers:** `GradingSystemsController`
**Primary Actor:** Admin

The system allows for dynamic grading rules rather than hardcoded logic. This allows different courses (or different years) to use different assessment criteria.

- **System Definition:** Admins create a system (e.g., "Standard Science Grading") with a pass/fail `threshold`.
- **Grading Fields:** Defines the input columns (e.g., "CA" with max 30 marks, "Exam" with max 70 marks).
- **Computations:** Defines the formulas (e.g., `Total = CA + Exam`).
- **Ranges:** Defines the letter grades (e.g., 70-100 = "A").
- **Usage:** These systems are linked to `CourseSessions` upon creation.

---

### **5. Course & Lecturer Catalog**

**Controllers:** `CoursesController`, `LecturersController`
**Primary Actor:** Admin

- **Courses (Catalog):**
  - Admins manage the static list of courses (Code, Title, Units, Semester).
  - **Batch Operations:** Admins can upload a file (Excel/CSV) via `/courses/batch` to create multiple courses simultaneously.
- **Lecturers (Staff):**
  - Admins manage staff profiles (Name, Title, Department).
  - **Batch Operations:** Bulk creation via `/lecturers/batch`.
  - **Profile Access:** Lecturers can view their own profile via `/lecturer/profile`.

---

### **6. Student Management**

**Controllers:** `StudentsController`, `StudentController`
**Primary Actors:** Admin, Student

- **Administrative View:**
  - Admins manage the lifecycle of students (Admission, Suspension, Graduation).
  - Admins can perform CRUD operations and bulk uploads via `/students/batch`.
- **Student View:**
  - Students have read-only access to their profile via `/student/profile`.
  - **Enrollment History:** Students can view a list of all courses they have taken and their statuses via `/student/enrollments`.

---

### **7. Course Execution (The Lecturer's Workspace)**

**Controllers:** `LecturerController`
**Primary Actor:** Lecturer

This is the functional core where academic activities occur. Once an Admin assigns a Lecturer to a Course Session, the Lecturer takes over.

- **Dashboard:** Lecturers retrieve their assigned classes via `/lecturer/courses-sessions`.
- **Student Registration:**
  - Lecturers are responsible for populating the class list.
  - **Methods:** They can register a single student (`/students`) or upload a bulk file (`/students/batch`).
  - **Validation:** The system checks if the student exists and handles duplications.
- **Results Processing:**
  - **Input:** Lecturers upload results via file (`/results`) or edit specific student scores (`/results/{studentId}`).
  - **Data Structure:** The scores submitted must match the `GradingFields` defined in the `GradingSystem` attached to that specific `CourseSession`.
  - **Viewing:** Lecturers can download or view the full result sheet for their course.

---

### **8. File Management & Utilities**

**Controllers:** `FilesController`
**Primary Actors:** Admin, Lecturer

Since the system relies heavily on batch operations (creating 1000 students or uploading 500 results), a robust file handler is implemented.

- **Upload & Parsing:** Files are uploaded to the `/files` endpoints.
- **Header Mapping:** To handle CSVs with different column names (e.g., "Matric No" vs "MatricNumber"), the system includes an endpoint `/files/{fileId}/alt-header-mappings` to map user-uploaded headers to system-required fields dynamically.

---

### **Summary of Permissions**

| Resource        | Admin Access                   | Lecturer Access            | Student Access                           |
| :-------------- | :----------------------------- | :------------------------- | :--------------------------------------- |
| **Users/Auth**  | Invite Users, Manage Admins    | Activate Account, Login    | Activate Account, Login, Change Password |
| **Colleges**    | Full CRUD                      | Read Only (Contextual)     | Read Only (Contextual)                   |
| **Sessions**    | Create, Assign Courses         | Read Only                  | Read Only                                |
| **Grading**     | Create Systems, Fields, Ranges | Read (Applied to Course)   | Read (Applied to Result)                 |
| **Courses**     | Create Catalog, Batch Upload   | Teach Assigned Sessions    | Enroll/View                              |
| **Enrollments** | View All                       | Register Students, Manage  | View Own                                 |
| **Results**     | View All                       | Upload/Edit for own Course | View Own                                 |
