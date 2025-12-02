import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { UserPayload } from "./auth.schema";

export const User = createParamDecorator(
	(data: string, ctx: ExecutionContext) => {
		const request: Request = ctx.switchToHttp().getRequest();

		return data ? request.user?.[data] : (request.user as UserPayload);
	},
);
