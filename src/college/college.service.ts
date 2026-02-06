import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDepartmentBody, CreateFacultyBody } from './college.dto';
import { DepartmentRes, FacultyRes } from './college.responses';

@Injectable()
export class CollegeService {
  constructor(private readonly prisma: PrismaService) {}

  async getFaculties(): Promise<FacultyRes[]> {
    return await this.prisma.faculty.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async getDepartments(): Promise<DepartmentRes[]> {
    return await this.prisma.department.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        shortName: true,
        maxLevel: true,
        faculty: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async createFaculty({ name }: CreateFacultyBody) {
    await this.prisma.faculty.create({ data: { name } });
  }

  async deleteFaculty(facultyId: string) {
    await this.prisma.faculty.update({
      where: { id: facultyId },
      data: { deletedAt: new Date() },
    });
  }

  async createDepartment({
    facultyId,
    name,
    shortName,
    maxLevel,
  }: CreateDepartmentBody) {
    await this.prisma.department.create({
      data: { facultyId, name, shortName, maxLevel },
    });
  }

  async deleteDepartment(deptId: string) {
    await this.prisma.department.update({
      where: { id: deptId },
      data: { deletedAt: new Date() },
    });
  }
}
