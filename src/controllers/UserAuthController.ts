import validator from "validator";
import { Repository } from "typeorm";
import { RequestMethod } from "../lib/enums/RequestMethod";
import { Controller, HttpRequest, Inject, InjectRepository, PathVariable, Request } from "../lib/decorators";
import { User } from "../entity/User";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import { UserHelper } from "../helpers/UserHelper";
import { UserAddress } from "../entity/UserAddress";
import { UserBalance } from "../entity/UserBalance";
import { Category } from "../entity/Category";
import { UserToken, UserTokenType } from "../entity/UserToken";
import { UtilsHelper } from "../helpers/UtilsHelper";
import { UserTwoFactor } from "../entity/UserTwoFactor";
import { MailService } from "../utils/MailService";
import { Config, SystemParams } from "../config";
import { UserUpdate } from "../interfaces/UserUpdate";
import path from "path";
import MD5 from "crypto-js/md5";

@Controller({
	path: ["/user"],
	authenticated: true
})
export class UserAuthController {
	@Inject() private userHelper: UserHelper;
	@Inject() private utilsHelper: UtilsHelper;

	@InjectRepository(Category) private categoryRepo: Repository<Category>;
	@InjectRepository(User) private userRepo: Repository<User>;
	@InjectRepository(UserAddress) private userAddressRepo: Repository<UserAddress>;
	@InjectRepository(UserBalance) private userBalanceRepo: Repository<UserBalance>;
	@InjectRepository(UserToken) private userToken: Repository<UserToken>;
	@InjectRepository(UserTwoFactor) private userTwoFactor: Repository<UserTwoFactor>;

	// USER DETAILS
	@Request({
		path: "/",
		method: RequestMethod.GET,
		errorCode: 401
	})
	async get(@HttpRequest() req): Promise<any> {
		try {
			const user: User = await this.userRepo.findOneOrFail({
				where: { id: req.getUserId() },
				relations: {
					address: true,
					balance: true,
					accounts: true,
					category: true,
					two_factor: true
				}
			});

			if (user.is_blocked) {
				return ApiResError(2, {
					title: "Erro na consulta",
					message: "Usuário bloqueado."
				});
			}

			return ApiResSuccess({
				title: "Sucesso na consuta",
				message: "Usuário consultado com sucesso.",
			}, {
				user: this.userHelper.privateData(user)
			});
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Usuário não encontrado."
			});
		}
	}

	@Request({
		path: "/",
		method: RequestMethod.PUT
	})
	async update(@HttpRequest() req): Promise<any> {
		const {
			code_2fa,
		}: UserUpdate = req.body;

		// Verifica se os dados necessários estão presentes
		if (validator.isEmpty(code_2fa)) {
			return ApiResError(1, {
				title: "Erro na criação",
				message: "Parâmetros inválidos."
			});
		}

		// Get user
		const user: User = await this.userRepo.findOne({
			where: { id: req.getUserId() },
			relations: { two_factor: true, address: true }
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
	}
	// USER DETAILS

	@Request({
		path: "/profile-image",
		method: RequestMethod.PUT
	})
	async updateProfileImage(@HttpRequest() req): Promise<any> {
		if (!req.files || Object.keys(req.files).length === 0) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Nenhum arquivo enviado."
			});
		}
		const image: {
			name: string,
			size: number,
			mimetype: string,
			data: Buffer,
			md5: string,
			mv: Function
		} = req.files.image;

		if (!image) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Parâmetros inválidos."
			});
		}

		const acceptedMimeTypes = ["image/png", "image/jpeg", "image/jpg"];
		if (!acceptedMimeTypes.includes(image.mimetype)) {
			return ApiResError(2, {
				title: "Erro na solicitação",
				message: "Formato de imagem inválido."
			});
		}

		// Image max size is 3MB
		if (image.size > 3000000) {	// size in bytes
			return ApiResError(3, {
				title: "Erro na solicitação",
				message: "Tamanho de imagem excede o limite de 3MB."
			});
		}

		// Get user
		const user: User = await this.userRepo.findOneBy({ id: req.getUserId() });

		try {
			const fileName = `profile/${MD5(`${user.id}`)}.${image.mimetype.split("/")[1]}`;
			const uploadDir = path.join(Config.path.uploads, fileName);
			const updatedAt = new Date();

			// Move image to uploads
			await image.mv(uploadDir);

			// Update user image
			await this.userRepo.save({
				...user,
				avatar: fileName,
				avatar_updated_at: updatedAt
			});

			return ApiResSuccess({
				title: "Sucesso na solicitação",
				message: "Imagem atualizada com sucesso."
			}, {
				image: {
					profile: fileName,
					updated: updatedAt
				}
			});
		} catch (e) {
			return ApiResError(4, {
				title: "Erro na solicitação",
				message: "Não foi possível atualizar a imagem de perfil, tente novamente mais tarde."
			});
		}
	}

	@Request({
		path: "/address",
		method: RequestMethod.PUT
	})
	async updateAddress(@HttpRequest() req): Promise<any> {
		const {
			code_2fa, city, complement,
			country, district, ibge_code,
			number, state, street, zip_code
		}: {
			code_2fa?: string,
			city: string,
			complement?: string,
			country?: string,
			district: string,
			ibge_code?: string,
			number: string,
			state: string,
			street: string,
			zip_code?: string
		} = req.body;

		// Verifica se os dados necessários estão presentes
		if (!city || !country || !district || !number ||
			!state || !street || (country == "Brasil" && (
				!zip_code || !ibge_code
			))
		) {
			return ApiResError(1, {
				title: "Erro na criação",
				message: "Parâmetros inválidos."
			});
		}

		// Get user
		const user: User = await this.userRepo.findOne({
			where: { id: req.getUserId() },
			relations: { two_factor: true, address: true }
		});

		if (user.two_factor && user.two_factor.is_active) {
			// Verifica o 2FA
			if (user.two_factor && user.two_factor.is_active) {
				const checkTwoFactor: any = this.utilsHelper.checkTwoFactor(user.two_factor.secret, code_2fa || "");
				if (!checkTwoFactor || checkTwoFactor.delta !== 0) {
					return ApiResError(2, {
						title: "Erro na criação",
						message: "Código de 2FA inválido."
					});
				}
			}
		}

		try {
			// Get address
			const address: UserAddress = await this.userAddressRepo.findOneBy({
				user: { id: user.id }
			});

			// Update address
			address.city = city;
			address.complement = complement;
			address.country = country;
			address.district = district;
			address.ibge_code = ibge_code;
			address.number = number;
			address.state = state;
			address.street = street;
			address.zip_code = zip_code;
			await this.userAddressRepo.save(address);

			return ApiResSuccess({
				title: "Sucesso na solicitação",
				message: "Endereço atualizado com sucesso."
			});
		} catch (e) {
			return ApiResError(3, {
				title: "Erro na solicitação",
				message: "Não foi possível atualizar o endereço, tente novamente mais tarde."
			});
		}
	}

	// TWO-FACTOR AUTH
	@Request({
		path: "/two-factors/code",
		method: RequestMethod.GET
	})
	async getTwoFactorCode(@HttpRequest() req): Promise<any> {
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
		path: "/two-factors/active",
		method: RequestMethod.PUT
	})
	async activeTwoFactor(@HttpRequest() req): Promise<any> {
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
		path: "/two-factors/disable",
		method: RequestMethod.PUT
	})
	async disableTwoFactor(@HttpRequest() req): Promise<any> {
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
	// /TWO-FACTOR AUTH

	// API TOKENS
	@Request({
		path: "/api-token",
		method: RequestMethod.GET
	})
	async getApiToken(@HttpRequest() req): Promise<any> {
		const user: User = await this.userRepo.findOneBy({
			id: req.getUserId()
		});

		const apiTokens: UserToken[] = await this.userToken.find({
			where: {
				user: { id: user.id }
			}
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

	@Request({
		path: "/api-token",
		method: RequestMethod.POST
	})
	async createApiToken(@HttpRequest() req): Promise<any> {
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
			where: { id: req.getUserId() },
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

	@Request({
		path: "/api-token/:tokenId",
		method: RequestMethod.DELETE
	})
	async deleteApiToken(@HttpRequest() req, @PathVariable("tokenId") tokenId: string): Promise<any> {
		const { code_2fa }: {
			code_2fa: string
		} = req.query;

		// Get user
		const user: User = await this.userRepo.findOne({
			where: { id: req.getUserId() },
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

	@Request({
		path: "/api-token/:tokenId",
		method: RequestMethod.PUT
	})
	async updateApiToken(@HttpRequest() req, @PathVariable("tokenId") tokenId: string): Promise<any> {
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
			where: { id: req.getUserId() },
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
	// /API TOKEN

	// USER CONFIG
	@Request({
		path: "/config",
		method: RequestMethod.GET
	})
	async config(@HttpRequest() req): Promise<any> {
		const user: User = await this.userRepo.findOneOrFail({
			where: { id: req.getUserId() },
			relations: { config: true }
		});

		// Delete specific fields
		delete user.config.id;
		delete user.config.created_at;
		delete user.config.updated_at;

		return ApiResSuccess({
			title: "Sucesso na consulta",
			message: "Configurações carregadas com sucesso.",
		}, {
			list: Object.keys(user.config).map(key => ({
				config_name: key,
				normalized_value: user.config[key]
			}))
		});
	}
	// /USER CONFIG

	// USER CATEGORY
	@Request({
		path: "/category",
		method: RequestMethod.PUT
	})
	async updateCategory(@HttpRequest() req): Promise<any> {
		const user: User = await this.userRepo.findOneOrFail({
			where: { id: req.getUserId() },
			relations: {
				address: true,
				balance: true,
				accounts: true,
				category: true
			}
		});

		const categoryId: string = req.body?.category;
		if (!categoryId) {
			return ApiResError(1, {
				title: "Erro na atualização",
				message: "Parâmetros inválidos."
			});
		}

		const category: Category = await this.categoryRepo.findOne({
			where: { id: categoryId }
		});
		if (!category) {
			return ApiResError(1, {
				title: "Erro na atualização",
				message: "Categoria não encontrada.",
			});
		}

		user.category = category;
		await this.userRepo.save(user);

		return ApiResSuccess({
			title: "Sucesso na atualização",
			message: "Categoria atualizada com sucesso.",
		}, {
			updated: this.userHelper.privateData(user)
		});
	}
	// /USER CATEGORY

	// USER EMAIL
	@Request({
		path: "/email-confirmation-resend",
		method: RequestMethod.GET
	})
	async emailConfirmationResend(@HttpRequest() req): Promise<any> {
		const user: User = await this.userRepo.findOneOrFail({
			where: { id: req.getUserId() }
		});

		if (user.email_verified) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Você já confirmou seu email."
			});
		}

		if (user.email_code_send_at) {
			const diffLastCodeSend: number = this.utilsHelper.getMinutesBetweenDates(new Date(), user.email_code_send_at);
			if (diffLastCodeSend < 5) {
				return ApiResError(2, {
					title: "Erro na solicitação",
					message: "Você só pode solicitar um novo código a cada 5 minutos."
				});
			}
		}
		try {
			// Generate new code
			const emailCode: string = this.utilsHelper.randomCode(6, true);

			// Save code
			await this.userRepo.save({
				...user,
				email_code: emailCode,
				email_code_send_at: new Date()
			});

			// Send email confirmation code
			const mail: MailService = new MailService(user.email, `${SystemParams.app.name} - Confirme seu e-mail`);
			mail.send("email_confirm", Object.assign(user, {
				code: emailCode
			}));

			return ApiResSuccess({
				title: "Email reenviado com sucesso",
				message: "Um novo email código de confirmação foi enviado para você."
			});
		} catch (e) {
			return ApiResError(3, {
				title: "Erro na solicitação",
				message: "Erro ao solicitar novo código, tente novamente mais tarde."
			});
		}
	}

	@Request({
		path: "/email-confirmation-code",
		method: RequestMethod.POST
	})
	async emailConfirmationCode(@HttpRequest() req): Promise<any> {
		const { email_code }: {
			email_code: string
		} = req.body;

		if (validator.isEmpty(email_code)) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Parâmetros inválidos."
			});
		}

		// Get user
		const user: User = await this.userRepo.findOneBy({ id: req.getUserId() });

		// Check code is valid
		if (!user.email_code || user.email_code !== email_code) {
			return ApiResError(2, {
				title: "Erro na solicitação",
				message: "Código de confirmação inválido."
			});
		}

		try {
			// Update user
			await this.userRepo.save({
				...user,
				email_verified: true,
				email_verified_at: new Date()
			});

			return ApiResSuccess({
				title: "Email confirmado com sucesso",
				message: "Seu email foi confirmado com sucesso."
			});
		} catch (e) {
			return ApiResError(3, {
				title: "Erro na solicitação",
				message: "Erro ao confirmar seu email, tente novamente mais tarde."
			});
		}
	}

	@Request({
		path: "/request-email-change",
		method: RequestMethod.POST
	})
	async requestEmailChange(@HttpRequest() req): Promise<any> {
		const {
			email
		}: { email: string } = req.body;

		if (validator.isEmpty(email)) {
			return ApiResError(1, {
				title: "Erro na atualização",
				message: "Parâmetros inválidos."
			});
		}

		if (!validator.isEmail(email)) {
			return ApiResError(2, {
				title: "Erro na atualização",
				message: "Email inválido."
			});
		}

		const user: User = await this.userRepo.findOneBy({ id: req.getUserId() });
		if (user.email === email) {
			return ApiResError(3, {
				title: "Erro na atualização",
				message: "Email não pode ser o mesmo que o atual."
			});
		}

		if (user.email_changed_at) {
			const diffLastEmailChange: number = this.utilsHelper.getMinutesBetweenDates(new Date(), user.email_changed_at);
			if (diffLastEmailChange < 60) {
				return ApiResError(4, {
					title: "Erro na atualização",
					message: "Você só pode alterar seu email uma vez a cada 60 minutos."
				});
			}
		}

		const exists: number = await this.userRepo.countBy({ email });
		if (exists) {
			return ApiResError(4, {
				title: "Erro na atualização",
				message: "Email já cadastrado."
			});
		}

		try {
			// Generate new code
			const emailCode: string = this.utilsHelper.randomCode(6, true);

			await this.userRepo.save({
				...user,
				email,
				email_changed_at: new Date(),
				email_code: emailCode
			});

			// Send email confirmation code
			const mail: MailService = new MailService(email, `${SystemParams.app.name} - Confirme seu e-mail`);
			mail.send("email_confirm", Object.assign(user, {
				code: emailCode
			}));

			return ApiResSuccess({
				title: "Email alterado com sucesso",
				message: "Um novo email de confirmação foi enviado para você."
			});
		} catch (error) {
			return ApiResError(5, {
				title: "Erro na atualização",
				message: "Erro ao atualizar o email, tente novamente mais tarde."
			});
		}
	}
	// /USER EMAIL

	// USER PHONE
	@Request({
		path: "/phone",
		method: RequestMethod.PUT
	})
	async updatePhone(@HttpRequest() req): Promise<any> {
		const { phone }: {
			phone: string
		} = req.body;
	}


	// USER SEARCH
	@Request({
		path: "/:username",
		method: RequestMethod.GET
	})
	async getByUsername(@HttpRequest() req, @PathVariable("username") username: string): Promise<any> {
		const user: User = await this.userRepo.findOne({
			where: { username }
		});

		if (!user) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Usuário não encontrado.",
			});
		}

		return ApiResSuccess({
			title: "Sucesso na consulta",
			message: "Usuário consultado com sucesso.",
		}, {
			user: this.userHelper.publicData(user)
		});
	}
	// /USER SEARCH
}
