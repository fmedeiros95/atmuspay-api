import { User } from "../entity/User";
import { UserTwoFactor } from "../entity/UserTwoFactor";
import { UtilsHelper } from "../helpers/UtilsHelper";
import { Controller, HttpRequest, HttpResponse, Inject, InjectRepository, Method } from "../_core/decorators";
import { RequestMethod } from "../_core/enums/RequestMethod";
import { Repository } from "typeorm";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import { checkJwt } from "../middlewares/checkJwt";
import { Request, Response } from "express";

@Controller({
	path: ["/user/two-factors"]
})
export class UserTwoFactorController {
	@Inject() private utilsHelper: UtilsHelper;

	@InjectRepository(User) private userRepo: Repository<User>;
	@InjectRepository(UserTwoFactor) private userTwoFactor: Repository<UserTwoFactor>;

	@Method({
		path: "/code",
		method: RequestMethod.GET,
		middlewares: [ checkJwt ]
	})
	async getCode(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		const user: User = await this.userRepo.findOneBy({ id: res.locals.jwtPayload.id });
		const userTwoFactor: UserTwoFactor = await this.userTwoFactor.findOne({
			where: { user: { id: user.id } }
		});

		if (userTwoFactor.is_active) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Código de 2FA já ativado."
			});
		}

		try {
			// Geenerate code
			const newSecret = this.utilsHelper.createTwoFactorToken(user);

			// Update user with new secret
			await this.userTwoFactor.save({
				...userTwoFactor,
				secret: newSecret.secret
			});

			// Send code
			return ApiResSuccess({
				title: "Sucesso na consulta",
				message: "Código de 2FA gerado com sucesso.",
			}, {
				code: newSecret.secret,
				qr_code: newSecret.qr,
				qrcode: `https://chart.googleapis.com/chart?chs=200x200&chld=L|0&cht=qr&chl=${newSecret.uri}`
			});
		} catch (e) {
			// Send error
			return ApiResError(1, {
				title: "Erro ao gerar código",
				message: "Erro ao gerar código de 2FA, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/active",
		method: RequestMethod.PUT,
		middlewares: [ checkJwt ]
	})
	async active(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		const user: User = await this.userRepo.findOneBy({ id: res.locals.jwtPayload.id });
		const userTwoFactor: UserTwoFactor = await this.userTwoFactor.findOne({
			where: { user: { id: user.id } }
		});

		try {
			// Geenerate code
			const checkTwoFactor: any = this.utilsHelper.checkTwoFactor(
				userTwoFactor.secret,
				req.body?.code_2fa || ""
			);

			if (!checkTwoFactor || checkTwoFactor.delta !== 0) {
				return ApiResError(1, {
					title: "Erro na ativação",
					message: "Código de 2FA inválido."
				});
			}

			// Update user with new secret
			await this.userTwoFactor.save({
				...userTwoFactor,
				is_active: true
			});

			// Send code
			return ApiResSuccess({
				title: "Sucesso na ativação",
				message: "Código de 2FA ativado com sucesso.",
			});
		} catch (e) {
			// Send error
			return ApiResError(1, {
				title: "Erro na ativação",
				message: "Erro ao ativar 2FA, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/disable",
		method: RequestMethod.PUT,
		middlewares: [ checkJwt ]
	})
	async disable(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		const user: User = await this.userRepo.findOneBy({ id: res.locals.jwtPayload.id });
		const userTwoFactor: UserTwoFactor = await this.userTwoFactor.findOne({
			where: { user: { id: user.id } }
		});

		try {
			// Check code
			const checkTwoFactor: any = this.utilsHelper.checkTwoFactor(
				userTwoFactor.secret,
				req.body?.code_2fa || ""
			);

			if (!checkTwoFactor || checkTwoFactor.delta !== 0) {
				return ApiResError(1, {
					title: "Erro na desativação",
					message: "Código de 2FA inválido."
				});
			}

			// Update user with new secret
			await this.userTwoFactor.save({
				...userTwoFactor,
				is_active: false,
				secret: null
			});

			// Send response
			return ApiResSuccess({
				title: "Desativação bem sucedida",
				message: "Código de 2FA desativado com sucesso.",
			});
		} catch (e) {
			// Send error
			return ApiResError(2, {
				title: "Erro na desativação",
				message: "Erro ao desativar 2FA, tente novamente mais tarde."
			});
		}
	}
}
