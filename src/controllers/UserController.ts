import validator from "validator";
import { Repository } from "typeorm";
import { RequestMethod } from "../lib/enums/RequestMethod";
import { Controller, HttpRequest, Inject, InjectRepository, PathVariable, Request } from "../lib/decorators";
import { User } from "../entity/User";
import { IUserJoin } from "interfaces/UserJoin";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import path from "path";
import { Config } from "../config";
import { UtilsHelper } from "../helpers/UtilsHelper";

@Controller({
	path: ["/user"],
	authenticated: false
})
export class UserController {
	@Inject() private utilsHelper: UtilsHelper;

	@InjectRepository(User) private userRepo: Repository<User>;

	private excludeNames = [
		"config", "atmus", "atmuspay", "atmuspayoficial", "adms",
		"configs", "admin", "adm", "administrador", "administradora",
		"atmus.pay", "atmuspay.com", "atmuspay.com.br", "atmuus_pay", "atmuus_pay.com",
		"atmusupay.oficial", "atmuspay_oficial", "atmus_pay_oficial", "atmus.pay_oficial",
		"atmus.payoficial", "atmus.payoficial.com", "atmus.payoficial.com.br"
	];

	@Request({
		path: "/",
		method: RequestMethod.POST
	})
	async create(@HttpRequest() req): Promise<any> {
		let {
			username,
			email
		}: IUserJoin = req.body;

		const {
			name,
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

		username = username.trim().toLowerCase();	// Username must be lowercase
		email = email.trim().toLowerCase();		// Email must be lowercase

		// Valid email?
		if (!validator.isEmail(email)) {
			return ApiResError(2, {
				title: "Erro no cadastro",
				message: "Email inválido."
			});
		}

		const providersFilter = /@bol.com|@yahoo.com|@terra.com|@bol.com.br|@yahoo.com.br|@terra.com.br/;
		if (providersFilter.test(email)) {
			return ApiResError(12, {
				title: "Erro no cadastro",
				message: "Não é permitido cadastro com email deste provedor."
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

		// check username
		if (this.excludeNames.includes(username)) {
			return ApiResError(9, {
				title: "Erro no cadastro",
				message: "Nome de usuário inválido."
			});
		}

		// Check username format
		const usernameFormat = /[^\w.]/;
		if (usernameFormat.test(username)) {
			return ApiResError(11, {
				title: "Erro no cadastro",
				message: "Nome de usuário com formato inválido."
			});
		}

		// check username size
		if (username.length < 3 || username.length > 20) {
			return ApiResError(10, {
				title: "Erro no cadastro",
				message: "Nome de usuário deve conter entre 3 e 20 caracteres."
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

		try {
			// Create user
			await this.userRepo.save({
				name,
				email,
				email_code: this.utilsHelper.randomCode(6, true),
				username,
				password: await User.hashPassword(password)
			});

			return ApiResSuccess({
				title: "Cadastro realizado com sucesso",
				message: "Seu cadastro foi realizado com sucesso. Agora você pode fazer login."
			});
		} catch (e) {
			return ApiResError(8, {
				title: "Erro no cadastro",
				message: "Erro ao cadastrar usuário, tente novamente mais tarde."
			});
		}
	}

	@Request({
		path: "/check-availability/:username",
		method: RequestMethod.GET
	})
	async checkAvailability(@HttpRequest() req, @PathVariable("username") username: string): Promise<any> {
		username = username.trim().toLowerCase();	// Username must be lowercase

		// check username
		if (this.excludeNames.includes(username)) {
			return ApiResError(9, {
				title: "Erro",
				message: "Usuário inválido."
			});
		}

		// Check username format
		const usernameFormat = /[^\w.]/;
		if (usernameFormat.test(username)) {
			return ApiResError(11, {
				title: "Erro",
				message: "Usuário com formato inválido."
			});
		}

		// check username size
		if (username.length < 3 || username.length > 20) {
			return ApiResError(10, {
				title: "Erro",
				message: "Usuário deve conter entre 3 e 20 caracteres."
			});
		}

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
		path: "/profile-image",
		method: RequestMethod.GET,
		errorCode: 404,
		isFile: true
	})
	async profileImage(@HttpRequest() req): Promise<any> {
		const username: string = req.query.user;
		if (!username) {
			return ApiResError(1, {
				title: "Erro ao buscar imagem",
				message: "Parâmetro de usuário não encontrado."
			});
		}

		try {
			const user: User = await this.userRepo.findOneByOrFail({ username });
			if (!user.avatar) {
				return ApiResError(2, {
					title: "Erro ao buscar imagem",
					message: "Usuário não possui imagem de perfil."
				});
			}

			const profileImage: string = path.resolve(Config.path.uploads, `${user.avatar}`);
			return profileImage;
		} catch (e) {
			return ApiResError(3, {
				title: "Erro ao buscar imagem",
				message: "Usuário não encontrado."
			});
		}
	}
}
