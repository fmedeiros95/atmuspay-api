import { User } from "../entity/User";
import { UserTwoFactor } from "../entity/UserTwoFactor";
import { UtilsHelper } from "../helpers/UtilsHelper";
import { Controller, HttpRequest, Inject, InjectRepository, Request } from "../lib/decorators";
import { RequestMethod } from "../lib/enums/RequestMethod";
import { Repository } from "typeorm";
import { ApiResError, ApiResSuccess } from "../utils/Response";

@Controller({
	path: ["/user/two-factors"],
	authenticated: true
})
export class UserTwoFactorController {
	@Inject() private utilsHelper: UtilsHelper;

	@InjectRepository(User) private userRepo: Repository<User>;
	@InjectRepository(UserTwoFactor) private userTwoFactor: Repository<UserTwoFactor>;

	@Request({
		path: "/code",
		method: RequestMethod.GET
	})
	async getCode(@HttpRequest() req): Promise<any> {
		const user: User = await this.userRepo.findOneBy({ id: req.getUserId() });
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

	@Request({
		path: "/active",
		method: RequestMethod.PUT
	})
	async active(@HttpRequest() req): Promise<any> {
		const user: User = await this.userRepo.findOneBy({ id: req.getUserId() });
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

	@Request({
		path: "/disable",
		method: RequestMethod.PUT
	})
	async disable(@HttpRequest() req): Promise<any> {
		const user: User = await this.userRepo.findOneBy({ id: req.getUserId() });
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
