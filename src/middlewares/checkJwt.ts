import { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../_core/enums/HttpStatus";
import { CommandLine } from "../_core/main/Command";
import * as jwt from "jsonwebtoken";

export const checkJwt = (req: Request, res: Response, next: NextFunction) => {
	// Get the jwt token from the head
	const token: string = <string>req.headers["x-access-token"] || <string>req.headers["authorization"];
	let jwtPayload: string | jwt.JwtPayload;

	// Try to validate the token and get data
	try {
		jwtPayload = <any>jwt.verify(token, CommandLine.token);
		res.locals.jwtPayload = jwtPayload;
	} catch (error) {
		// If token is not valid, respond with 401 (unauthorized)
		res.status(HttpStatus.UNAUTHORIZED).json({
			messageCode: HttpStatus.UNAUTHORIZED,
			message: {
				title: "Token inválido",
				message: "Seu token de acesso não e válido, provavelmente ele esta expirado ou sua senha foi alterada."
			}
		});
		return;
	}

	// Call the next middleware or controller
	next();
};
