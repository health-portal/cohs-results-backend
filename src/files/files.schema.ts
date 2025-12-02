import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UploadFileBody {
	@ApiProperty()
	@IsString()
	filename: string;

	@ApiProperty()
	@IsString()
	content: string;
}
