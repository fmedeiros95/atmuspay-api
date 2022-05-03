import validator from "validator";
import { Repository } from "typeorm";
import { RequestMethod } from "../lib/enums/RequestMethod";
import { Controller, HttpRequest, Inject, InjectRepository, PathVariable, Request } from "../lib/decorators";
import { User } from "../entity/User";
import { IUserJoin } from "interfaces/UserJoin";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import path from "path";
import { Config } from "../config";
import { UserHelper } from "../helpers/UserHelper";
import { UserAddress } from "../entity/UserAddress";
import { UserBalance } from "../entity/UserBalance";

@Controller({
	path: ["/user"],
	authenticated: false
})
export class UserController {
	@Inject() private userHelper: UserHelper;

	@InjectRepository(User) private userRepo: Repository<User>;
	@InjectRepository(UserAddress) private userAddressRepo: Repository<UserAddress>;
	@InjectRepository(UserBalance) private userBalanceRepo: Repository<UserBalance>;

	@Request({
		path: "/",
		method: RequestMethod.POST
	})
	async create(@HttpRequest() req): Promise<any> {
		const {
			name,
			email,
			username,
			password,
			confirm_password,
			termos
		}: IUserJoin = req.body;

		// Validar formulário
		if (
			validator.isEmpty(name) ||
			validator.isEmpty(email) ||
			validator.isEmpty(username) ||
			validator.isEmpty(password) ||
			validator.isEmpty(confirm_password)
		) {
			return ApiResError(1, {
				title: "Erro no cadastro",
				message: "Dados para cadastro não enviados."
			});
		}

		// Valid email?
		if (!validator.isEmail(email)) {
			return ApiResError(2, {
				title: "Erro no cadastro",
				message: "Email inválido."
			});
		}

		// check password size
		if (validator.isEmpty(password) || password.trim().length < 8) {
			return ApiResError(3, {
				title: "Erro no cadastro",
				message: "Senha deve conter no mínimo 6 caracteres."
			});
		}

		// check password match
		if (password !== confirm_password) {
			return ApiResError(4, {
				title: "Erro no cadastro",
				message: "As senhas não conferem"
			});
		}

		// check termos
		if (!termos) {
			return ApiResError(5, {
				title: "Erro no cadastro",
				message: "Você deve aceitar os termos de uso."
			});
		}

		// check username availability
		const userExists: User = await this.userRepo.findOne({
			where: { username }
		});
		if (userExists) {
			return ApiResError(6, {
				title: "Erro no cadastro",
				message: "Usuário já cadastrado."
			});
		}

		// check email availability
		const emailExists: User = await this.userRepo.findOne({
			where: { email }
		});
		if (emailExists) {
			return ApiResError(7, {
				title: "Erro no cadastro",
				message: "Email já cadastrado."
			});
		}

		// Create user
		await this.userRepo.save({
			name,
			email,
			username,
			password: await User.hashPassword(password)
		});

		return ApiResSuccess({
			title: "Cadastro realizado com sucesso",
			message: "Seu cadastro foi realizado com sucesso. Agora você pode fazer login."
		});
	}

	@Request({
		path: "/check-availability/:username",
		method: RequestMethod.GET
	})
	async checkAvailability(@HttpRequest() req, @PathVariable("username") username: string): Promise<any> {
		const user: User = await this.userRepo.findOne({
			where: { username }
		});
		if (user) {
			return ApiResError(1, {
				title: "Erro",
				message: "Esse usuário já está em uso."
			});
		}

		return ApiResSuccess({
			title: "Sucesso",
			message: "Esse usuário está disponível."
		});
	}

	@Request({
		path: "/profile-image/:username",
		method: RequestMethod.GET,
		isFile: true
	})
	async profileImage(@HttpRequest() req, @PathVariable("username") username: string): Promise<any> {
		const user: User = await this.userRepo.findOne({
			where: { username }
		});
		if (!user) {
			return ApiResError(1, {
				title: "Erro",
				message: "Usuário não encontrado."
			});
		}

		const profileImage: any = path.resolve(Config.path.uploads, "profile/ttSHrtHMtNML5spVmTQWm6TrqJfxb3Gs.png");
		return profileImage;
	}
}
