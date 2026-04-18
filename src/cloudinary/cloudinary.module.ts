import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { configureCloudinary } from './cloudinary.config';

configureCloudinary();

@Module({
  providers: [CloudinaryService],
  exports:   [CloudinaryService],
})
export class CloudinaryModule {}