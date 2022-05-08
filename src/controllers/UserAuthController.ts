import validator from "validator";
import { Repository } from "typeorm";
import { RequestMethod } from "../lib/enums/RequestMethod";
import { Controller, HttpRequest, Inject, InjectRepository, PathVariable, Request } from "../lib/decorators";
import { User, UserDocumentType, UserGender } from "../entity/User";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import { UserHelper } from "../helpers/UserHelper";
import { UtilsHelper } from "../helpers/UtilsHelper";
import { MailService } from "../utils/MailService";
import { Config, SystemParams } from "../config";
import { UploadedFile } from "express-fileupload";
import path from "path";
import MD5 from "crypto-js/md5";
import { differenceInYears } from "date-fns";

@Controller({
	path: ["/user"],
	authenticated: true
})
export class UserAuthController {
	@Inject() private userHelper: UserHelper;
	@Inject() private utilsHelper: UtilsHelper;

	@InjectRepository(User) private userRepo: Repository<User>;

	@Request({
		path: "/",
		method: RequestMethod.GET,
		errorCode: 401
	})
	async get(@HttpRequest() req): Promise<any> {
		try {
			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: req.getUserId() });

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

	@Request({
		path: "/",
		method: RequestMethod.PUT
	})
	async update(@HttpRequest() req): Promise<any> {
		try {
			const {
				code_2fa, name,
				birthday, gender
			} = req.body;

			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: req.getUserId() });

			// CHeck if two factor is active
			if (user.two_factor && user.two_factor.is_active) {
				// Validate two factor code
				const checkTwoFactor: any = this.utilsHelper.checkTwoFactor(user.two_factor.secret, code_2fa || "");
				if (!checkTwoFactor || checkTwoFactor.delta !== 0) {
					return ApiResError(2, {
						title: "Erro na criação",
						message: "Código de 2FA inválido."
					});
				}
			}

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
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Erro ao atualizar os dados, tente novamente mais tarde."
			});
		}
	}

	@Request({
		path: "/document",
		method: RequestMethod.PUT
	})
	async updateDocument(@HttpRequest() req): Promise<any> {
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
			const user: User = await this.userRepo.findOneByOrFail({ id: req.getUserId() });

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

	@Request({
		path: "/profile-image",
		method: RequestMethod.PUT
	})
	async updateProfileImage(@HttpRequest() req): Promise<any> {
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
			const user: User = await this.userRepo.findOneByOrFail({ id: req.getUserId() });

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

	@Request({
		path: "/address",
		method: RequestMethod.PUT
	})
	async updateAddress(@HttpRequest() req): Promise<any> {
		try {
			const {
				code_2fa, city, complement, district,
				ibge_code, number, state, street, zip_code
			} = req.body;

			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: req.getUserId() });

			// Check if the two factor is active
			if (user.two_factor && user.two_factor.is_active) {
				// Verify 2FA code
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

	@Request({
		path: "/config",
		method: RequestMethod.GET
	})
	async getConfig(@HttpRequest() req): Promise<any> {
		try {
			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: req.getUserId() });

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
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Não foi possível carregar as configurações, tente novamente mais tarde."
			});
		}
	}

	// USER EMAIL
	@Request({
		path: "/email-confirmation-resend",
		method: RequestMethod.GET
	})
	async emailConfirmationResend(@HttpRequest() req): Promise<any> {
		try {
			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: req.getUserId() });

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

	@Request({
		path: "/email-confirmation-code",
		method: RequestMethod.POST
	})
	async emailConfirmationCode(@HttpRequest() req): Promise<any> {
		try {
			const { email_code } = req.body;

			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: req.getUserId() });

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

	@Request({
		path: "/request-email-change",
		method: RequestMethod.POST
	})
	async requestEmailChange(@HttpRequest() req): Promise<any> {
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
			const user: User = await this.userRepo.findOneByOrFail({ id: req.getUserId() });

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

	// USER PHONE
	@Request({
		path: "/phone",
		method: RequestMethod.PUT
	})
	async updatePhone(@HttpRequest() req): Promise<any> {
		try {
			const { phone } = req.body;
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Não foi possível alterar seu telefone, tente novamente mais tarde."
			});
		}
	}

	@Request({
		path: "/:username",
		method: RequestMethod.GET
	})
	async getByUsername(@HttpRequest() req, @PathVariable("username") username: string): Promise<any> {
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
