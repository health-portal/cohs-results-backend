import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

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

export class UpsertGradingFieldBody {
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
  maxValue: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(99)
  weight: number;
}

export class UpsertGradingRangeBody {
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
