import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  GradingFieldResponse,
  GradingRangeResponse,
  GradingSystemResponse,
} from 'src/prisma/prisma.responses';

export class GradingSystemRes extends PickType(GradingSystemResponse, [
  'id',
  'name',
  'description',
  'threshold',
]) {
  @ApiProperty({ readOnly: true })
  fieldsCount: number;

  @ApiProperty({ readOnly: true })
  rangesCount: number;
}

export class GradingFieldRes extends PickType(GradingFieldResponse, [
  'id',
  'label',
  'description',
  'weight',
  'maxValue',
]) {}

export class GradingRangeRes extends PickType(GradingRangeResponse, [
  'id',
  'label',
  'description',
  'minScore',
  'maxScore',
]) {}
