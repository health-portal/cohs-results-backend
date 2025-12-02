import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { MessageQueueModule } from "src/message-queue/message-queue.module";
import { TokensModule } from "src/tokens/tokens.module";

@Module({
	imports: [PassportModule, MessageQueueModule, TokensModule],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
