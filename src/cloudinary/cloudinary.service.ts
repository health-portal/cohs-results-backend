import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {

  async uploadFile(
    buffer: Buffer,
    originalname: string,
    folder: string = 'results',
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'raw', // for non-image files like PDFs, Excel
          public_id:     originalname.replace(/\.[^/.]+$/, ''), // strip extension
          use_filename:  true,
          unique_filename: true,
        },
        (error, result: UploadApiResponse) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException(
                `Cloudinary upload failed: ${error?.message}`,
              ),
            );
          } else {
            resolve({
              url:      result.secure_url,
              publicId: result.public_id,
            });
          }
        },
      );

      // Pipe the buffer into the upload stream
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  }
}