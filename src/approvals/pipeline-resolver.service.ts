import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CourseType, Level, LecturerRole, PipelineScope } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import type {
  ICourseSessionContext,
  IPipelineStep,
  IResolvedStep,
  ITakingDeptLevel,
} from './approval.types';

@Injectable()
export class PipelineResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {}

  // ============================================================
  // COURSE SESSION CONTEXT
  // ============================================================

  /**
   * Resolve full context from CourseSesnDeptAndLevel.
   * Each row = one (dept + level) pair = one ApprovalFlow.
   * Offering dept comes from course.department.
   */
  async resolveCourseSessionContext(
    courseSessionId: string,
  ): Promise<ICourseSessionContext> {
    const courseSession = await this.prisma.courseSession.findUnique({
      where: { id: courseSessionId },
      include: {
        course: {
          include: {
            department: { include: { faculty: true } },
          },
        },
        deptsAndLevels: {
          include: {
            department: { include: { faculty: true } },
          },
        },
      },
    });

    if (!courseSession) {
      throw new NotFoundException(`Course session ${courseSessionId} not found`);
    }

    if (!courseSession.deptsAndLevels.length) {
      throw new BadRequestException(
        `Course session ${courseSessionId} has no departments/levels assigned`,
      );
    }

    const offeringDept = courseSession.course.department;

    const takingDeptLevels: ITakingDeptLevel[] =
      courseSession.deptsAndLevels.map((dl) => ({
        departmentId: dl.department.id,
        departmentName: dl.department.name,
        facultyId: dl.department.facultyId,
        level: dl.level,
      }));

    const courseType = takingDeptLevels.every(
      (dl) => dl.departmentId === offeringDept.id,
    )
      ? CourseType.INTRA
      : CourseType.INTER;

    return {
      id: courseSession.id,
      courseCode: courseSession.course.code,
      offeringDeptId: offeringDept.id,
      offeringDeptName: offeringDept.name,
      offeringFacultyId: offeringDept.facultyId,
      courseType,
      takingDeptLevels,
    };
  }

  // ============================================================
  // TEMPLATE RESOLUTION
  // Template is faculty-scoped — one active per faculty at a time
  // ============================================================

  /**
   * Find the active template for the offering faculty.
   * Returns null if none — falls back to default fixed pipeline.
   */
  async resolveActiveTemplate(facultyId: string) {
    return this.prisma.pipelineTemplate.findFirst({
      where: { isActive: true, facultyId },
      include: { steps: { orderBy: { priority: 'asc' } } },
    });
  }

  // ============================================================
  // DEFAULT FIXED PIPELINE STEPS
  // ============================================================

  /**
   * INTRA (same dept):
   *   1. PART_ADVISER (offering dept)
   *   2. HOD (offering dept)
   *
   * INTER (cross dept):
   *   1. HOD (offering dept)
   *   2. PART_ADVISER (taking dept)
   *   3. HOD (taking dept)
   */
  getDefaultSteps(courseType: CourseType): IPipelineStep[] {
    if (courseType === CourseType.INTRA) {
      return [
        { role: LecturerRole.PART_ADVISER, scope: PipelineScope.OFFERING_DEPT, priority: 1 },
        { role: LecturerRole.HOD,          scope: PipelineScope.OFFERING_DEPT, priority: 2 },
      ];
    }

    return [
      { role: LecturerRole.HOD,          scope: PipelineScope.OFFERING_DEPT, priority: 1 },
      { role: LecturerRole.PART_ADVISER, scope: PipelineScope.TAKING_DEPT,   priority: 2 },
      { role: LecturerRole.HOD,          scope: PipelineScope.TAKING_DEPT,   priority: 3 },
    ];
  }

  // ============================================================
  // PERSONNEL RESOLUTION
  // ============================================================

  /**
   * Resolve which LecturerDesignation handles a step.
   * Dept sourced from designation.lecturer.departmentId.
   * For PART_ADVISER: matches on designation.part via LEVEL_TO_PART.
   */
  async resolveDesignationForStep(
    role: LecturerRole,
    departmentId: string,
    level?: Level,
  ): Promise<IResolvedStep> {
    const designation = await this.prisma.lecturerDesignation.findFirst({
      where: {
        role,
        lecturer: { departmentId },
        // part is Level? on the model — pass level directly, no conversion needed
        ...(role === LecturerRole.PART_ADVISER ? { part: level ?? null } : {}),
      },
      include: {
        lecturer: { include: { department: true } },
      },
    });

    if (!designation) {
      throw new NotFoundException(
        `No lecturer found with role ${role} in department ${departmentId}` +
          (level ? ` for level ${level}` : ''),
      );
    }

    return {
      lecturerDesignationId: designation.id,
      lecturerId: designation.lecturerId,
      lecturerName: `${designation.lecturer.firstName} ${designation.lecturer.lastName}`,
      role: designation.role,
      departmentId: designation.lecturer.departmentId,
      priority: 0,
    };
  }

  /**
   * Resolve all steps for a single (dept + level) flow.
   */
  async resolveStepsForFlow(
    steps: IPipelineStep[],
    offeringDeptId: string,
    takingDeptId: string,
    level: Level,
  ): Promise<IResolvedStep[]> {
    const resolved: IResolvedStep[] = [];

    for (const step of steps) {
      const deptId =
        step.scope === PipelineScope.OFFERING_DEPT
          ? offeringDeptId
          : takingDeptId;

      const resolvedLevel =
        step.role === LecturerRole.PART_ADVISER
          ? (step.level ?? level)
          : undefined;

      const resolvedStep = await this.resolveDesignationForStep(
        step.role,
        deptId,
        resolvedLevel,
      );

      resolved.push({ ...resolvedStep, priority: step.priority });
    }

    return resolved;
  }

  // ============================================================
  // GUARDS
  // ============================================================

  async assertLecturerOwnsDesignation(
    lecturerDesignationId: string,
    lecturerId: string,
  ): Promise<void> {
    const designation = await this.prisma.lecturerDesignation.findFirst({
      where: { id: lecturerDesignationId, lecturerId },
    });

    if (!designation) {
      throw new BadRequestException(
        `Lecturer ${lecturerId} does not own designation ${lecturerDesignationId}`,
      );
    }
  }

  /**
   * Assert a lecturer holds a DEAN designation.
   * Optionally verifies they belong to a specific faculty.
   */
  async assertIsDeanOfFaculty(
    lecturerId: string,
    facultyId?: string,
  ): Promise<void> {
    const designation = await this.prisma.lecturerDesignation.findFirst({
      where: {
        lecturerId,
        role: LecturerRole.DEAN,
        ...(facultyId
          ? { lecturer: { department: { facultyId } } }
          : {}),
      },
    });

    if (!designation) {
      throw new BadRequestException(
        facultyId
          ? `Lecturer ${lecturerId} is not the Dean of faculty ${facultyId}`
          : `Lecturer ${lecturerId} does not hold a DEAN designation`,
      );
    }
  }

  /**
   * Resolve the facultyId from a lecturer's own department.
   */
  async resolveFacultyFromDean(lecturerId: string): Promise<string> {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lecturerId },
      include: { department: true },
    });

    if (!lecturer) {
      throw new NotFoundException(`Lecturer ${lecturerId} not found`);
    }

    return lecturer.department.facultyId;
  }
}