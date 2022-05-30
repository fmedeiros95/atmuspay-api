import { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../_core/enums/HttpStatus";
import { AppDataSource } from "../_core/main/Server";
import { User } from "../entity/User";
import * as twoFactor from "node-2fa";
import notp from "notp";

export const check2FA = async (req: Request, res: Response, next: NextFunction) => {
	// Get the user ID from previous midleware
	const id = res.locals.jwtPayload.id;

	// Get the user from database
	const userRepository = AppDataSource.getRepository(User);
	const user: User = await userRepository.findOneByOrFail({ id });

	// Check if user has 2FA enabled
	if (user.two_factor && user.two_factor.is_active) {
		const code_2fa: string = req.body.code_2fa || req.params.code_2fa || req.query.code_2fa || "";

		// Check Parameters
		if (!code_2fa) {
			res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
				messageCode: 999,
				message: {
					title: "Validação do 2FA",
					message: "Parâmetros inválidos"
				}
			});
			return;
		}

		const checkTwoFactor: notp.VerifyResult = twoFactor.verifyToken(user.two_factor.secret, code_2fa);
		if (!checkTwoFactor || checkTwoFactor.delta !== 0) {
			res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
				messageCode: 999,
				message: {
					title: "Validação do 2FA",
					message: "Código de verificação inválido"
				}
			});
			return;
		}
	}

	// Call the next middleware or controller
	next();
};
