import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateGradingSystemBody {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  threshold: number;
}

export class UpdateGradingSystemBody {
  @ApiProperty({ nullable: true })
  @IsString()
  name?: string;

  @ApiProperty({ nullable: true })
  @IsString()
  description?: string;

  @ApiProperty({ nullable: true })
  @IsInt()
  @Min(0)
  @Max(100)
  threshold?: number;
}

export class GradingField {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsInt()
  maxScore: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(99)
  weight: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variable: string;
}

export class UpsertGradingFieldsBody {
  @ApiProperty({
    type: GradingField,
    isArray: true,
  })
  @IsArray()
  fields: GradingField[];
}

export class GradingComputation {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  expression: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variable: string;
}

export class UpsertGradingComputationsBody {
  @ApiProperty({
    type: GradingComputation,
    isArray: true,
  })
  @IsArray()
  computations: GradingComputation[];
}

export class GradingRange {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(99)
  minScore: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(100)
  maxScore: number;
}

export class UpsertGradingRangesBody {
  @ApiProperty({
    type: GradingRange,
    isArray: true,
  })
  @IsArray()
  ranges: GradingRange[];
}

export class GradingSystemRes {
  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description?: string;

  @ApiProperty()
  threshold: number;

  @ApiProperty()
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  deletedAt: Date | null;

  @ApiProperty()
  fieldsCount: number;

  @ApiProperty()
  computationsCount: number;

  @ApiProperty()
  rangesCount: number;
}
