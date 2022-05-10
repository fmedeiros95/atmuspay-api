import { User } from "../entity/User";
import { UserToken, UserTokenType } from "../entity/UserToken";
import { UtilsHelper } from "../helpers/UtilsHelper";
import { Controller, HttpRequest, Inject, InjectRepository, PathVariable, Method, HttpResponse } from "../_core/decorators";
import { RequestMethod } from "../_core/enums/RequestMethod";
import { Repository } from "typeorm";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import validator from "validator";
import { checkJwt } from "../middlewares/checkJwt";
import { Request, Response } from "express";

@Controller({
	path: ["/user/api-token"]
})
export class UserApiController {
	@Inject() private utilsHelper: UtilsHelper;

	@InjectRepository(User) private userRepo: Repository<User>;
	@InjectRepository(UserToken) private userToken: Repository<UserToken>;

	@Method({
		path: "/",
		method: RequestMethod.GET,
		middlewares: [ checkJwt ]
	})
	async get(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		const user: User = await this.userRepo.findOneBy({ id: res.locals.jwtPayload.id });

		const apiTokens: UserToken[] = await this.userToken.findBy({
			user: { id: user.id }
		});

		return ApiResSuccess({
			title: "Sucesso na consulta",
			message: "Token de acesso consultado com sucesso.",
		}, {
			list: apiTokens.map(token => ({
				_id: token.id,
				name: token.name,
				is_active: token.is_active,
				type: token.type,
				domains: token.domains,
				ips: token.ips,
				token: token.token,
				created_at: token.created_at,
				updated_at: token.updated_at
			}))
		});
	}

	@Method({
		path: "/",
		method: RequestMethod.POST,
		middlewares: [ checkJwt ]
	})
	async create(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		const {
			code_2fa,
			api_token
		}: {
			code_2fa: string,
			api_token: {
				name: string,
				type: UserTokenType,
				ips: string[] | null,
				domains: string[] | null,
			}
		} = req.body;

		// Verifica se os dados necessários estão presentes
		if (validator.isEmpty(code_2fa) || validator.isEmpty(api_token.name) || validator.isEmpty(api_token.type)) {
			return ApiResError(1, {
				title: "Erro na criação",
				message: "Parâmetros inválidos."
			});
		}

		// Get user
		const user: User = await this.userRepo.findOne({
			where: { id: res.locals.jwtPayload.id },
			relations: { two_factor: true }
		});

		// Verifica o 2FA
		if (user.two_factor && user.two_factor.is_active) {
			const checkTwoFactor: any = this.utilsHelper.checkTwoFactor(user.two_factor.secret, code_2fa || "");
			if (!checkTwoFactor || checkTwoFactor.delta !== 0) {
				return ApiResError(6, {
					title: "Erro na criação",
					message: "Código de 2FA inválido."
				});
			}
		}

		// Verificar tipo do token
		if (Object.values(UserTokenType).indexOf(api_token.type) === -1) {
			return ApiResError(2, {
				title: "Erro na criação",
				message: "Tipo de token inválido."
			});
		}

		// Verificar se foram informados os IPs
		if (api_token.ips && api_token.ips.length !== 0) {
			for (const ip of api_token.ips) {
				// Verificar se o IP é válido
				if (!validator.isIP(ip)) {
					return ApiResError(3, {
						title: "Erro na criação",
						message: `O IP ${ip} é inválido.`
					});
				}
			}
		}

		// Verificar se foram informados os domínios
		if (api_token.domains && api_token.domains.length !== 0) {
			for (const domain of api_token.domains) {
				// Verificar se o domínio é válido
				if (!validator.isFQDN(domain)) {
					return ApiResError(4, {
						title: "Erro na atualização",
						message: `O domínio ${domain} é inválido.`
					});
				}
			}
		}

		try {
			// TODO: Implementar a transferência
			const token: UserToken = await this.userToken.save({
				user,
				name: api_token.name,
				type: api_token.type,
				ips: api_token.ips,
				domains: api_token.domains,
			});

			return ApiResSuccess({
				title: "Sucesso na criação",
				message: "Token de acesso criado com sucesso.",
			}, {
				apiToken: {
					_id: token.id,
					name: token.name,
					is_active: token.is_active,
					type: token.type,
					domains: token.domains,
					ips: token.ips,
					token: token.token,
					created_at: token.created_at,
					updated_at: token.updated_at
				}
			});
		} catch (e) {
			return ApiResError(5, {
				title: "Erro na criação",
				message: "Erro ao criar o token, tente novamente mais tarde."
			});
		}

	}

	@Method({
		path: "/:tokenId",
		method: RequestMethod.DELETE,
		middlewares: [ checkJwt ]
	})
	async delete(@HttpRequest() req: Request, @HttpResponse() res: Response, @PathVariable("tokenId") tokenId: string): Promise<any> {
		const { code_2fa }: {
			code_2fa?: string
		} = req.query;

		// Get user
		const user: User = await this.userRepo.findOne({
			where: { id: res.locals.jwtPayload.id },
			relations: { two_factor: true }
		});

		// Verifica o 2FA
		if (user.two_factor && user.two_factor.is_active) {
			const checkTwoFactor: any = this.utilsHelper.checkTwoFactor(user.two_factor.secret, code_2fa || "");
			if (!checkTwoFactor || checkTwoFactor.delta !== 0) {
				return ApiResError(3, {
					title: "Erro na criação",
					message: "Código de 2FA inválido."
				});
			}
		}

		// Get token
		const token: UserToken = await this.userToken.findOne({
			where: {
				id: tokenId,
				user: { id: user.id }
			}
		});
		if (!token) {
			return ApiResError(1, {
				title: "Erro ao deletar",
				message: "Token não encontrado."
			});
		}

		try {
			await this.userToken.delete({ id: tokenId });
			return ApiResSuccess({
				title: "Sucesso na exclusão",
				message: "Token de acesso deletado com sucesso."
			});
		} catch (e) {
			return ApiResError(2, {
				title: "Erro ao deletar",
				message: "Erro ao deletar o token, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/:tokenId",
		method: RequestMethod.PUT,
		middlewares: [ checkJwt ]
	})
	async update(@HttpRequest() req: Request, @HttpResponse() res: Response, @PathVariable("tokenId") tokenId: string): Promise<any> {
		const {
			code_2fa,
			api_token
		}: {
			code_2fa: string,
			api_token: {
				name: string,
				ips: string[] | null,
				domains: string[] | null,
				is_active: boolean,
			}
		} = req.body;

		// Verifica se os dados necessários estão presentes
		if (validator.isEmpty(code_2fa) || validator.isEmpty(api_token.name)) {
			return ApiResError(1, {
				title: "Erro na atualização",
				message: "Parâmetros inválidos."
			});
		}

		// Get user
		const user: User = await this.userRepo.findOne({
			where: { id: res.locals.jwtPayload.id },
			relations: { two_factor: true }
		});

		// Verifica o 2FA
		if (user.two_factor && user.two_factor.is_active) {
			const checkTwoFactor: any = this.utilsHelper.checkTwoFactor(user.two_factor.secret, code_2fa || "");
			if (!checkTwoFactor || checkTwoFactor.delta !== 0) {
				return ApiResError(3, {
					title: "Erro na criação",
					message: "Código de 2FA inválido."
				});
			}
		}

		// Verificar se foram informados os IPs
		if (api_token.ips && api_token.ips.length !== 0) {
			for (const ip of api_token.ips) {
				// Verificar se o IP é válido
				if (!validator.isIP(ip)) {
					return ApiResError(3, {
						title: "Erro na atualização",
						message: `O IP ${ip} é inválido.`
					});
				}
			}
		}

		// Verificar se foram informados os domínios
		if (api_token.domains && api_token.domains.length !== 0) {
			for (const domain of api_token.domains) {
				// Verificar se o domínio é válido
				if (!validator.isFQDN(domain)) {
					return ApiResError(4, {
						title: "Erro na atualização",
						message: `O domínio ${domain} é inválido.`
					});
				}
			}
		}

		// Get token
		const token: UserToken = await this.userToken.findOne({
			where: { id: tokenId },
			relations: { user: true }
		});

		if (token.user.id !== user.id) {
			return ApiResError(5, {
				title: "Erro na atualização",
				message: "Token não pertence ao usuário."
			});
		}

		try {
			const updatedToken: UserToken = await this.userToken.save({
				...token,
				name: api_token.name,
				ips: api_token.ips,
				domains: api_token.domains,
				is_active: api_token.is_active
			});

			return ApiResSuccess({
				title: "Sucesso na atualização",
				message: "Token de acesso atualizado com sucesso.",
			}, {
				apiToken: {
					_id: updatedToken.id,
					name: updatedToken.name,
					is_active: updatedToken.is_active,
					type: updatedToken.type,
					domains: updatedToken.domains,
					ips: updatedToken.ips,
					token: updatedToken.token,
					created_at: updatedToken.created_at,
					updated_at: updatedToken.updated_at
				}
			});
		} catch (e) {
			return ApiResError(6, {
				title: "Erro na atualização",
				message: "Erro ao atualizar o token, tente novamente mais tarde."
			});
		}
	}
}
