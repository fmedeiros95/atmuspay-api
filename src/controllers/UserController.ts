import validator from "validator";
import { Repository } from "typeorm";
import { RequestMethod } from "../_core/enums/RequestMethod";
import { Controller, HttpRequest, Inject, InjectRepository, PathVariable, Method, HttpResponse } from "../_core/decorators";
import { User, UserDocumentType, UserGender } from "../entity/User";
import { IUserJoin } from "interfaces/UserJoin";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import path from "path";
import { Config, SystemParams } from "../config";
import { UtilsHelper } from "../helpers/UtilsHelper";
import { Request, Response } from "express";
import { UserHelper } from "../helpers/UserHelper";
import { differenceInYears } from "date-fns";
import { UploadedFile } from "express-fileupload";
import { MD5 } from "crypto-js";
import { MailService } from "../utils/MailService";
import { check2FA, checkJwt, resetPassword } from "../middlewares";
import { AsaasHelper } from "../helpers/AsaasHelper";

@Controller({
	path: ["/user"]
})
export class UserController {
	@Inject() private asaasHelper: AsaasHelper;
	@Inject() private userHelper: UserHelper;
	@Inject() private utilsHelper: UtilsHelper;

	@InjectRepository(User) private userRepo: Repository<User>;

	private excludeNames = [
		"config", "atmus", "atmuspay", "atmuspayoficial", "adms",
		"configs", "admin", "adm", "administrador", "administradora",
		"atmus.pay", "atmuspay.com", "atmuspay.com.br", "atmuus_pay", "atmuus_pay.com",
		"atmusupay.oficial", "atmuspay_oficial", "atmus_pay_oficial", "atmus.pay_oficial",
		"atmus.payoficial", "atmus.payoficial.com", "atmus.payoficial.com.br"
	];

	@Method({
		path: "/",
		method: RequestMethod.GET,
		errorCode: 401,
		middlewares: [ checkJwt ]
	})
	async get(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		this.asaasHelper.settings.setEnvironment(SystemParams.asaas.env);
		this.asaasHelper.settings.setAccessToken(SystemParams.asaas.token);


		try {
			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Check if user is blocked
			if (user.is_blocked) {
				return ApiResError(2, {
					title: "Erro na consulta",
					message: "Usuário bloqueado."
				});
			}

			return ApiResSuccess({
				title: "Sucesso na consuta",
				message: "Usuário consultado com sucesso.",
			}, { user: this.userHelper.privateData(user) });
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Usuário não encontrado."
			});
		}
	}

	@Method({
		path: "/",
		method: RequestMethod.POST
	})
	async create(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
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
			const user: User = new User();
			user.name = name;
			user.email = email;
			user.email_code = this.utilsHelper.randomCode(6, true);
			user.email_code_send_at = new Date();
			user.username = username;
			user.password = password;

			// Hash password
			user.hashPassword();

			// Save user
			await this.userRepo.save(user, { listeners: true });

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

	@Method({
		path: "/",
		method: RequestMethod.PUT,
		middlewares: [ checkJwt, check2FA ]
	})
	async update(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const {
				name, birthday, gender
			} = req.body;

			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Check user full name
			const splitName: string[] = name.split(" ");
			if (splitName.length < 2 || splitName[0].length < 2 || splitName[splitName.length - 1].length < 2) {
				return ApiResError(3, {
					title: "Erro na solicitação",
					message: "O nome deve ser composto por 2 palavras, com pelo menos 2 caracteres cada."
				});
			}

			// Validate birthday date
			const splitBirthday: string[] = birthday.split("/");
			if (splitBirthday.length !== 3) {
				return ApiResError(4, {
					title: "Erro na solicitação",
					message: "A data de nascimento informada é inválida."
				});
			}

			// Check user years old
			const birthdayDate: Date = new Date(Number(splitBirthday[2]), Number(splitBirthday[1]) - 1, Number(splitBirthday[0]));
			if (differenceInYears(new Date(), birthdayDate) < 18 && !user.is_emancipated) {
				return ApiResError(5, {
					title: "Erro na solicitação",
					message: "Você deve ser maior de 18 anos ou emancipado."
				});
			}

			// Check user gender
			if (gender !== null && !Object.values(UserGender).includes(gender)) {
				return ApiResError(6, {
					title: "Erro na solicitação",
					message: "O sexo informado é invalido!"
				});
			}

			// Update user
			user.name = name;
			user.birthday = birthdayDate;
			user.gender = gender;
			await this.userRepo.save(user);

			return ApiResSuccess({
				title: "Dados atualizados",
				message: "Seus dados foram atualizados com sucesso."
			});
		} catch (error) {
			console.log(error);
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Erro ao atualizar os dados, tente novamente mais tarde."
			}, { error });
		}
	}

	@Method({
		path: "/address",
		method: RequestMethod.PUT,
		middlewares: [ checkJwt, check2FA ]
	})
	async updateAddress(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const {
				city, complement, district,
				ibge_code, number, state, street, zip_code
			} = req.body;

			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Update address
			user.address.city = city;
			user.address.complement = complement;
			user.address.district = district;
			user.address.ibge_code = ibge_code;
			user.address.number = number;
			user.address.state = state;
			user.address.street = street;
			user.address.zip_code = zip_code;
			await this.userRepo.save(user);

			return ApiResSuccess({
				title: "Sucesso na solicitação",
				message: "Endereço atualizado com sucesso."
			});
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Não foi possível atualizar o endereço, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/document",
		method: RequestMethod.PUT,
		middlewares: [ checkJwt ]
	})
	async updateDocument(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const { document, name, birthday }: {
				document: string,
				name: string,
				birthday: Date
			} = req.body;

			// Check document exists
			const documentExists: number = await this.userRepo.countBy({ document });
			if (documentExists) {
				return ApiResError(2, {
					title: "Erro na solicitação",
					message: "Este documento já está cadastrado."
				});
			}

			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Update user
			user.name = name;
			user.birthday = birthday;
			user.document = document;
			user.document_type = UserDocumentType.CPF;
			await this.userRepo.save(user);

			return ApiResSuccess({
				title: "Sucesso na solicitação",
				message: "Dados atualizados com sucesso."
			});
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Erro ao atualizar os dados, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/check-availability/:username",
		method: RequestMethod.GET
	})
	async checkAvailability(@HttpRequest() req: Request, @HttpResponse() res: Response, @PathVariable("username") username: string): Promise<any> {
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

	@Method({
		path: "/email-confirmation-resend",
		method: RequestMethod.GET,
		middlewares: [checkJwt]
	})
	async emailConfirmationResend(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Check if the user is already confirmed
			if (user.email_verified) {
				return ApiResError(2, {
					title: "Erro na solicitação",
					message: "Você já confirmou seu email."
				});
			}

			// Check confirmation already sent
			if (user.email_code_send_at) {
				// Check last confirmation email sent
				const diffLastCodeSend: number = this.utilsHelper.getMinutesBetweenDates(new Date(), user.email_code_send_at);
				if (diffLastCodeSend < 5) {
					return ApiResError(3, {
						title: "Erro na solicitação",
						message: "Você só pode solicitar um novo código a cada 5 minutos."
					});
				}
			}

			// Generate new code
			const emailCode: string = this.utilsHelper.randomCode(6, true);

			// Save code
			user.email_code = emailCode;
			user.email_code_send_at = new Date();
			await this.userRepo.save(user);

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
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Erro ao solicitar novo código, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/email-confirmation-code",
		method: RequestMethod.POST,
		middlewares: [checkJwt]
	})
	async emailConfirmationCode(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const { email_code } = req.body;

			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Check code is valid
			if (!user.email_code || user.email_code !== email_code) {
				return ApiResError(2, {
					title: "Erro na solicitação",
					message: "Código de confirmação inválido."
				});
			}

			// Update user
			user.email_verified = true;
			user.email_verified_at = new Date();
			await this.userRepo.save(user);

			return ApiResSuccess({
				title: "Email confirmado com sucesso",
				message: "Seu email foi confirmado com sucesso."
			});
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Não foi possível confirmar seu email, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/request-email-change",
		method: RequestMethod.POST,
		middlewares: [checkJwt]
	})
	async requestEmailChange(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const { email } = req.body;

			// Is email valid?
			if (!validator.isEmail(email)) {
				return ApiResError(2, {
					title: "Erro na solicitação",
					message: "Email inválido."
				});
			}

			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Is same email?
			if (user.email === email) {
				return ApiResError(3, {
					title: "Erro na solicitação",
					message: "Email não pode ser o mesmo que o atual."
				});
			}

			// Check if emails recently changed
			if (user.email_changed_at) {
				// Can change email again?
				const diffLastEmailChange: number = this.utilsHelper.getMinutesBetweenDates(new Date(), user.email_changed_at);
				if (diffLastEmailChange < 60) {
					return ApiResError(4, {
						title: "Erro na solicitação",
						message: "Você só pode alterar seu email uma vez a cada 60 minutos."
					});
				}
			}

			// Emails already used?
			const exists: number = await this.userRepo.countBy({ email });
			if (exists) {
				return ApiResError(4, {
					title: "Erro na solicitação",
					message: "Email já cadastrado."
				});
			}

			// Generate new code
			const emailCode: string = this.utilsHelper.randomCode(6, true);

			// Update user
			user.email = email;
			user.email_code = emailCode;
			user.email_code_send_at = new Date();
			await this.userRepo.save(user);

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
			return ApiResError(1, {
				title: "Erro na atualização",
				message: "Não foi possível alterar seu email, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/profile-image",
		method: RequestMethod.PUT,
		middlewares: [ checkJwt ]
	})
	async updateProfileImage(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const image: UploadedFile = <UploadedFile>req.files["image"];
			if (!image) {
				return ApiResError(3, {
					title: "Erro na solicitação",
					message: "Parâmetros inválidos."
				});
			}

			// Check fi
			const acceptedMimeTypes = ["image/png", "image/jpeg", "image/jpg"];
			if (!acceptedMimeTypes.includes(image.mimetype)) {
				return ApiResError(4, {
					title: "Erro na solicitação",
					message: "Formato de imagem inválido."
				});
			}

			// Image max size is 3MB
			if (image.size > 3000000) {	// size in bytes
				return ApiResError(5, {
					title: "Erro na solicitação",
					message: "Tamanho de imagem excede o limite de 3MB."
				});
			}

			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// File data
			const fileName = `profile/${MD5(`${user.id}`)}.${image.mimetype.split("/")[1]}`;
			const uploadDir = path.join(Config.path.uploads, fileName);
			const updatedAt = new Date();

			// Move image to uploads
			await image.mv(uploadDir);

			// Update user image
			user.avatar = fileName;
			user.avatar_updated_at = updatedAt;
			await this.userRepo.save(user);

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
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Não foi possível atualizar a imagem de perfil, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/profile-image/:username",
		method: RequestMethod.GET,
		errorCode: 404,
		isFile: true
	})
	async profileImage(@HttpRequest() req: Request, @HttpResponse() res: Response, @PathVariable("username") username: string): Promise<any> {
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

	@Method({
		path: "/phone",
		method: RequestMethod.PUT,
		middlewares: [ checkJwt ]
	})
	async updatePhone(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const { phone } = req.body;
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Não foi possível alterar seu telefone, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/request-password-recovery",
		method: RequestMethod.POST
	})
	async requestPasswordRecovery(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const { email } = req.body;

			if (!(email && email.trim())) {
				return ApiResError(2, {
					title: "Erro na solicitação",
					message: "Parâmetros inválidos."
				});
			}

			// Is valid email
			if (!validator.isEmail(email)) {
				return ApiResError(3, {
					title: "Erro na solicitação",
					message: "E-mail inválido."
				});
			}

			// Get user
			const user: User = await this.userRepo.findOneBy({ email });

			// Check if user exists
			if (!user) {
				return ApiResError(4, {
					title: "Erro na solicitação",
					message: "E-mail não encontrado na base de dados."
				});
			}

			// Check last request 30 minutes
			const lastRequest: Date = user.password_last_email_at;
			if (lastRequest && lastRequest.getTime() + ((30 * 60) * 1000) > new Date().getTime()) {
				return ApiResError(5, {
					title: "Erro na solicitação",
					message: "Você deve esperar 30 minutos para solicitar outro e-mail de recuperação de senha."
				});
			}

			// Generate token
			const tokenReset: string = this.utilsHelper.randomCode(32);
			const token: string = this.utilsHelper.createJWT({
				id: user.id,
				email: user.email,
				type: "password-recovery",
				token: tokenReset,
				is2FA: user.two_factor.is_active
			}, { expiresIn: "30m" });

			// Send email
			const mailService: MailService = new MailService(user.email, `${SystemParams.app.name} - Recuperação de senha`);
			mailService.send("reset_password", {
				token,
				fullName: user.name
			});

			// Update user password last email at
			user.password_token_reset = tokenReset;
			user.password_last_email_at = new Date();
			await this.userRepo.save(user);

			return ApiResSuccess({
				title: "Sucesso na solicitação",
				message: "E-mail de recuperação de senha enviado com sucesso."
			});
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Não foi possível solicitar a recuperação de senha, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/password-recovery",
		method: RequestMethod.POST,
		middlewares: [ checkJwt, resetPassword ]
	})
	async passwordRecovery(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const {
				password,
				confirm_password,
				code_2fa
			} = req.body;

			// if ()
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Não foi possível realizar a alteração de senha, tente novamente mais tarde."
			});
		}
	}

	@Method({
		path: "/:username",
		method: RequestMethod.GET,
		middlewares: [ checkJwt ]
	})
	async getByUsername(@HttpRequest() req: Request, @HttpResponse() res: Response, @PathVariable("username") username: string): Promise<any> {
		try {
			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ username });

			return ApiResSuccess({
				title: "Sucesso na consulta",
				message: "Usuário consultado com sucesso.",
			}, { user: this.userHelper.publicData(user) });
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Não foi possível consultar o usuário, tente novamente mais tarde."
			});
		}
	}
}
