import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LecturerRole, Level } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddAdminBody {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateAdminBody {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;
}


export class UpdateLecturerDesignationDto {
  @ApiProperty({
    description: 'The role to assign to the lecturer',
    enum: LecturerRole,
    example: LecturerRole.HOD,
  })
  @IsEnum(LecturerRole)
  role: LecturerRole;
 
  @ApiPropertyOptional({
    description: 'Student level — required only when role is PART_ADVISER',
    enum: Level,
    example: Level.LVL_300,
  })
  @IsOptional()
  @IsEnum(Level)
  part?: Level;
}
 