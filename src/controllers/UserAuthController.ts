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

@Controller({
	path: ["/user"],
	authenticated: true
})
export class UserAuthController {
	@Inject() private userHelper: UserHelper;

	@InjectRepository(Category) private categoryRepo: Repository<Category>;
	@InjectRepository(User) private userRepo: Repository<User>;
	@InjectRepository(UserAddress) private userAddressRepo: Repository<UserAddress>;
	@InjectRepository(UserBalance) private userBalanceRepo: Repository<UserBalance>;

	@Request({
		path: "/",
		method: RequestMethod.GET
	})
	async get(@HttpRequest() req): Promise<any> {
		const user: User = await this.userRepo.findOneOrFail({
			where: { id: req.getUserId() },
			relations: {
				address: true,
				balance: true,
				accounts: true,
				category: true
			}
		});

		return ApiResSuccess({
			title: "Sucesso na consuta",
			message: "Usuário consultado com sucesso.",
		}, {
			user: this.userHelper.privateData(user)
		});
	}

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

		const categoryId: string = req.body.category;
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


	@Request({
		path: "/email-confirmation-resend",
		method: RequestMethod.GET
	})
	async emailConfirmationResend(@HttpRequest() req): Promise<any> {
		const user: User = await this.userRepo.findOneOrFail({
			where: { id: req.getUserId() }
		});

		if (user.email_verified) {
			return ApiResError(2, {
				title: "Erro na consulta",
				message: "Você já confirmou seu email."
			});
		}

		// const emailConfirmation: EmailConfirmation = this.emailConfirmationRepo.create();
		// await this.emailConfirmationRepo.save(emailConfirmation);

		// await this.userRepo.save({
		// 	...user,
		// 	email_confirmation: emailConfirmation
		// });

		return ApiResSuccess({
			title: "Email reenviado com sucesso",
			message: "Um novo email de confirmação foi enviado para você."
		});
	}

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
			user: {
				_id: user.id,
				user: user.username,
				verified_account: user.email_verified,
				document: {
					document: user.document,
					type: user.document_type,
				}
			}
		});
	}
}
