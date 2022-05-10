import { User } from "entity/User";
import { NextFunction, Request, Response } from "express";
import { HttpStatus } from "lib/enums/HttpStatus";
import { AppDataSource } from "../_core/main/Server";

export const checkRole = (roles: string[]) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		// Get the user ID from previous midleware
		const id = res.locals.jwtPayload.userId;

		// Get user role from the database
		const userRepository = AppDataSource.getRepository(User);
		let user: User;
		try {
			user = await userRepository.findOneByOrFail({ id });
		} catch (e) {
			res.status(HttpStatus.UNAUTHORIZED).json({
				messageCode: HttpStatus.UNAUTHORIZED,
				message: {
					title: "Unauthorized",
					message: "You are not authorized to access this resource",
				}
			});
		}

		// Get user roles
		const userRoles: string[] = user.admin_roles;

		// Check if array of authorized roles includes the user's role
		const hasRole: boolean = userRoles.some(role => roles.includes(role));
		if (hasRole) next();
		else res.status(HttpStatus.UNAUTHORIZED).json({
			messageCode: HttpStatus.UNAUTHORIZED,
			message: {
				title: "Unauthorized",
				message: "You are not authorized to access this resource",
			}
		});
	};
};
