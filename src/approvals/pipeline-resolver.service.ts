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
   courseSesnDeptLevelId: string) {
    const junction = await this.prisma.courseSesnDeptAndLevel.findUnique({
      where: { id: courseSesnDeptLevelId },
      include: {
        department: { include: { faculty: true } },
        courseSession: {
          include: {
            course: { include: { department: true } },
          },
        },
      },
    });
    if(!junction) {
      throw new NotFoundException(`Could not find Course`)
    }
    const offeringDept = junction?.courseSession.course.department;
    const takingDept = junction?.department;

    const courseType = offeringDept?.id === takingDept?.id 
      ? CourseType.INTRA 
      : CourseType.INTER;
return {
      junctionId: junction?.id,
      courseCode: junction?.courseSession.course.code,
      offeringDeptId: offeringDept.id,
      offeringFacultyId: offeringDept.facultyId,
      takingDeptId: takingDept.id,
      level: junction.level,
      courseType,
    };
  }  

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
        ...(role === LecturerRole.PART_ADVISER ? { part: level ?? null } : {}),
      },
      include: {
        lecturer: { select: { firstName: true, lastName: true, id: true } },
      },
    });

    if (!designation) {
      throw new NotFoundException(
        `No lecturer found for ${role} in Dept ${departmentId}${level ? ` (Level ${level})` : ''}`,
      );
    }

    return {
      lecturerDesignationId: designation.id,
      lecturerId: designation.lecturerId,
      lecturerName: `${designation.lecturer.firstName} ${designation.lecturer.lastName}`,
      role: designation.role,
      departmentId: departmentId,
      priority: 0, // Set by caller
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
    return Promise.all(
      steps.map(async (step) => {
        const deptId = step.scope === PipelineScope.OFFERING_DEPT ? offeringDeptId : takingDeptId;
        const resolvedLevel = step.role === LecturerRole.PART_ADVISER ? level : undefined;

        const resolved = await this.resolveDesignationForStep(step.role, deptId, resolvedLevel);
        return { ...resolved, priority: step.priority };
      }),
    );
  }
  // ============================================================
  // GUARDS
  // ============================================================
async assertLecturerOwnsDesignation(
  lecturerDesignationId: string,
  lecturerId: string,
): Promise<void> {
  const designation = await this.prisma.lecturerDesignation.findFirst({
    where: { 
      id: lecturerDesignationId, 
      lecturerId: lecturerId 
    },
  });

  if (!designation) {
    const requiredDesignation = await this.prisma.lecturerDesignation.findUnique({
        where: { id: lecturerDesignationId }
    });
    if(!requiredDesignation) {
      throw new NotFoundException(
          `This does not exist in the database.`
        );
    }
    else{

      const hasEquivalentRole = await this.prisma.lecturerDesignation.findFirst({
          where: {
              lecturerId: lecturerId,
              role: requiredDesignation.role,
              entity: requiredDesignation.entity
          }
        
      });

      if (!hasEquivalentRole) {
        throw new BadRequestException(
          `Access Denied: You do not hold the required position for this step.`
        );
      }
    }
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