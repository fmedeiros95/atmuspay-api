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
		try {
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
			if (!name || !email || !username || !password || !confirm_password) {
				return ApiResError(2, {
					title: "Erro no cadastro",
					message: "Dados para cadastro não enviados."
				});
			}

			username = username.trim().toLowerCase();	// Username must be lowercase
			email = email.trim().toLowerCase();			// Email must be lowercase

			// Valid email?
			if (!validator.isEmail(email)) {
				return ApiResError(3, {
					title: "Erro no cadastro",
					message: "Email inválido."
				});
			}

			const providersFilter = /@bol.com|@yahoo.com|@terra.com|@bol.com.br|@yahoo.com.br|@terra.com.br/;
			if (providersFilter.test(email)) {
				return ApiResError(4, {
					title: "Erro no cadastro",
					message: "Não é permitido cadastro com email deste provedor."
				});
			}

			// check password size
			if (password.trim().length < 8) {
				return ApiResError(5, {
					title: "Erro no cadastro",
					message: "Senha deve conter no mínimo 6 caracteres."
				});
			}

			// check password match
			if (password !== confirm_password) {
				return ApiResError(6, {
					title: "Erro no cadastro",
					message: "As senhas não conferem"
				});
			}

			// check termos
			if (!termos) {
				return ApiResError(7, {
					title: "Erro no cadastro",
					message: "Você deve aceitar os termos de uso."
				});
			}

			// check username
			if (this.excludeNames.includes(username)) {
				return ApiResError(8, {
					title: "Erro no cadastro",
					message: "Nome de usuário inválido."
				});
			}

			// Check username format
			const usernameFormat = /[^\w.]/;
			if (usernameFormat.test(username)) {
				return ApiResError(9, {
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
			const userExists: number = await this.userRepo.countBy({ username });
			if (userExists) {
				return ApiResError(11, {
					title: "Erro no cadastro",
					message: "Usuário já cadastrado."
				});
			}

			// check email availability
			const emailExists: number = await this.userRepo.countBy({ email });
			if (emailExists) {
				return ApiResError(12, {
					title: "Erro no cadastro",
					message: "Email já cadastrado."
				});
			}

			// Create user
			await this.userRepo.save({
				name,
				email,
				email_code: this.utilsHelper.randomCode(6, true),
				email_code_send_at: new Date(),
				username,
				password: await User.hashPassword(password)
			});

			return ApiResSuccess({
				title: "Cadastro realizado",
				message: "Seu cadastro foi realizado com sucesso. Agora você pode fazer login."
			});
		} catch (e) {
			return ApiResError(1, {
				title: "Erro no cadastro",
				message: "Não foi possivel completar o cadastro, tente novamente mais tarde."
			});
		}
	}

	@Request({
		path: "/check-availability/:username",
		method: RequestMethod.GET
	})
	async checkAvailability(@HttpRequest() req, @PathVariable("username") username: string): Promise<any> {
		try {
			username = username.trim().toLowerCase();	// Username must be lowercase

			// check username
			if (this.excludeNames.includes(username)) {
				return ApiResError(2, {
					title: "Erro na consulta",
					message: "Usuário inválido."
				});
			}

			// Check username format
			const usernameFormat = /[^\w.]/;
			if (usernameFormat.test(username)) {
				return ApiResError(3, {
					title: "Erro na consulta",
					message: "Usuário com formato inválido."
				});
			}

			// check username size
			if (username.length < 3 || username.length > 20) {
				return ApiResError(4, {
					title: "Erro na consulta",
					message: "Usuário deve conter entre 3 e 20 caracteres."
				});
			}

			const user: number = await this.userRepo.countBy({ username });
			if (user) {
				return ApiResError(5, {
					title: "Erro na consulta",
					message: "Esse usuário já está em uso."
				});
			}

			return ApiResSuccess({
				title: "Sucesso na consulta",
				message: "Esse usuário está disponível."
			});
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Não conseguimos realizar a consulta, tente novamente mais tarde."
			});
		}
	}

	@Request({
		path: "/profile-image/:username",
		method: RequestMethod.GET,
		errorCode: 404,
		isFile: true
	})
	async profileImage(@HttpRequest() req, @PathVariable("username") username: string): Promise<any> {
		try {
			if (!username) {
				return ApiResError(2, {
					title: "Erro ao buscar imagem",
					message: "Parâmetro de usuário não encontrado."
				});
			}

			const user: User = await this.userRepo.findOneByOrFail({ username });
			const profileImage: string = path.resolve(Config.path.uploads, `${user.avatar}`);
			return profileImage;
		} catch (e) {
			return ApiResError(1, {
				title: "Erro ao consulta",
				message: "Usuário não encontrado."
			});
		}
	}
}
