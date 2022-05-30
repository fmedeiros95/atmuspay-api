import { User } from "../entity/User";
import { UserToken, UserTokenType } from "../entity/UserToken";
import { UtilsHelper } from "../helpers/UtilsHelper";
import { Controller, HttpRequest, Inject, InjectRepository, PathVariable, Method, HttpResponse } from "../_core/decorators";
import { RequestMethod } from "../_core/enums/RequestMethod";
import { Repository } from "typeorm";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import validator from "validator";
import { checkJwt, check2FA } from "../middlewares";
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
		try {
			// Get User
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Get user api tokens
			const apiTokens: UserToken[] = await this.userToken.findBy({ user: { id: user.id } });

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
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Erro ao consultar os tokens, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/",
		method: RequestMethod.POST,
		middlewares: [ checkJwt, check2FA ]
	})
	async create(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const { api_token }: {
				api_token: {
					name: string,
					type: UserTokenType,
					ips: string[] | null,
					domains: string[] | null,
				}
			} = req.body;

			// Verifica se os dados necessários estão presentes
			if (!(api_token.name && api_token.type)) {
				return ApiResError(2, {
					title: "Erro na criação",
					message: "Parâmetros inválidos."
				});
			}

			// Get user
			const user: User = await this.userRepo.findOne({
				where: { id: res.locals.jwtPayload.id },
				relations: { two_factor: true }
			});
			// Verificar tipo do token
			if (Object.values(UserTokenType).indexOf(api_token.type) === -1) {
				return ApiResError(3, {
					title: "Erro na criação",
					message: "Tipo de token inválido."
				});
			}

			// Verificar se foram informados os IPs
			if (api_token.ips && api_token.ips.length !== 0) {
				for (const ip of api_token.ips) {
					// Verificar se o IP é válido
					if (!validator.isIP(ip)) {
						return ApiResError(4, {
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
						return ApiResError(5, {
							title: "Erro na atualização",
							message: `O domínio ${domain} é inválido.`
						});
					}
				}
			}

			const token: UserToken = await this.userToken.save({
				user,
				name: api_token.name,
				type: api_token.type,
				ips: api_token.ips,
				domains: api_token.domains,
			});

			return ApiResSuccess({
				title: "Sucesso na solicitação",
				message: "Token criado com sucesso.",
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
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Erro ao criar o token, tente novamente mais tarde."
			});
		}

	}

	@Method({
		path: "/:tokenId",
		method: RequestMethod.DELETE,
		middlewares: [ checkJwt, check2FA ]
	})
	async delete(@HttpRequest() req: Request, @HttpResponse() res: Response, @PathVariable("tokenId") tokenId: string): Promise<any> {
		try {
			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Get token
			const token: UserToken = await this.userToken.findOneByOrFail({
				id: tokenId,
				user: { id: user.id }
			});

			// Delete token
			await this.userToken.delete({ id: token.id });

			return ApiResSuccess({
				title: "Sucesso na solicitação",
				message: "Token de acesso deletado com sucesso."
			});
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Erro ao deletar o token, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/:tokenId",
		method: RequestMethod.PUT,
		middlewares: [ checkJwt, check2FA ]
	})
	async update(@HttpRequest() req: Request, @HttpResponse() res: Response, @PathVariable("tokenId") tokenId: string): Promise<any> {
		try {
			const { api_token }: {
				api_token: {
					is_active: boolean,
				}
			} = req.body;

			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Get token
			const token: UserToken = await this.userToken.findOneByOrFail({
				id: tokenId,
				user: { id: user.id }
			});

			const updatedToken: UserToken = await this.userToken.save({
				...token,
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
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Erro ao atualizar o token, tente novamente mais tarde."
			});
		}
	}
}
