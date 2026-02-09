import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateLecturerBody {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  otherName?: string;

  @ApiProperty({ enum: Gender })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;
}

export class UpdateLecturerBody {
  @ApiProperty({ required: false })
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsString()
  otherName?: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ required: false })
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsString()
  title?: string;
}

export class EditResultBody {
  @ApiProperty()
  @IsObject()
  scores: Record<string, number>;
}

export class GetLecturersQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;
}

export class UploadResultRow {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  matricNumber: string;

  @ApiProperty()
  @IsObject()
  scores: Record<string, number>;
}

export class RegisterStudentBody {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  matricNumber: string;

  @ApiProperty({ type: Object })
  @IsObject()
  scores: Record<string, number>;
}
