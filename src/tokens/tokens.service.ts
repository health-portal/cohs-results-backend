import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { TokenPayload, UserPayload } from "src/auth/auth.schema";
import { env } from "src/lib/environment";

@Injectable()
export class TokensService {
	constructor(private readonly jwtService: JwtService) {}

	async generateAccessToken(payload: UserPayload) {
		return await this.jwtService.signAsync(payload, { expiresIn: "1d" });
	}

	async genActivateAccountUrl(payload: TokenPayload) {
		const token = await this.jwtService.signAsync(payload, {
			expiresIn: "7d",
		});
		const url = new URL(env.FRONTEND_BASE_URL + "/auth/activate");
		url.searchParams.set("token", token);
		console.log(`Activation URL: ${url}`);
		return url.toString();
	}

	async genResetPasswordUrl(payload: TokenPayload) {
		const token = await this.jwtService.signAsync(payload, {
			expiresIn: "15m",
		});
		const url = new URL(env.FRONTEND_BASE_URL + "/auth/reset-password");
		url.searchParams.set("token", token);
		console.log(`Reset Password URL: ${url}`);
		return url.toString();
	}

	async verifyToken(token: string) {
		try {
			const payload: TokenPayload = await this.jwtService.verifyAsync(token);
			return payload;
		} catch {
			throw new UnauthorizedException("Invalid or expired token");
		}
	}
}
