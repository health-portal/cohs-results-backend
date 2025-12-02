import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

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
  @IsNumber()
  threshold: number;
}

export class UpdateGradingSystemBody {
  @ApiProperty()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsString()
  description?: string;
}

export class GradingField {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  maxScore: number;

  @ApiProperty()
  @IsNumber()
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
  label: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  expression: string;

  @ApiProperty()
  @IsNumber()
  weight: number;

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
  description: string;

  @ApiProperty()
  @IsNumber()
  minScore: number;

  @ApiProperty()
  @IsNumber()
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
