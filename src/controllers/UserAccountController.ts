import { Bank } from "../entity/Bank";
import { User } from "../entity/User";
import { UserAccountBank, UserAccountBankType } from "../entity/UserBankAccount";
import { UtilsHelper } from "../helpers/UtilsHelper";
import { Controller, HttpRequest, Inject, InjectRepository, Request } from "../lib/decorators";
import { RequestMethod } from "../lib/enums/RequestMethod";
import { Repository } from "typeorm";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import { cpf } from "cpf-cnpj-validator";


@Controller({
	path: ["/user/accounts"],
	authenticated: true
})
export class UserAccountController {
	@Inject() private utilsHelper: UtilsHelper;

	@InjectRepository(Bank) private bankRepo: Repository<Bank>;
	@InjectRepository(User) private userRepo: Repository<User>;
	@InjectRepository(UserAccountBank) private userAccountBankRepo: Repository<UserAccountBank>;

	@Request({
		path: "/",
		method: RequestMethod.POST
	})
	async create(@HttpRequest() req): Promise<any> {
		try {
			const {
				bank_id, agency, account,
				account_type, is_third, is_default,
				code_2fa, document, name
			} = req.body;

			// Get user
			const user = await this.userRepo.findOneByOrFail({ id: req.getUserId() });

			// Check if the two factor is active
			if (user.two_factor && user.two_factor.is_active) {
				// Verify 2FA code
				if (user.two_factor && user.two_factor.is_active) {
					const checkTwoFactor: any = this.utilsHelper.checkTwoFactor(user.two_factor.secret, code_2fa || "");
					if (!checkTwoFactor || checkTwoFactor.delta !== 0) {
						return ApiResError(2, {
							title: "Erro na solicitação",
							message: "Código de 2FA inválido."
						});
					}
				}
			}

			// Check agency length
			if (agency.trim().length !== 4) {
				return ApiResError(3, {
					title: "Erro na solicitação",
					message: "Agência deve conter apenas 4 dígitos."
				});
			}

			// Check account length
			if (account.trim().length > 21) {
				return ApiResError(4, {
					title: "Erro na solicitação",
					message: "Conta deve conter no máximo 21 dígitos."
				});
			}

			// validade account number
			const accountNum = Number(account.slice(0, account.length - 2) + account.slice(account.length - 1));
			if (typeof accountNum !== "number") {
				return ApiResError(5, {
					title: "Erro na solicitação",
					message: "O numero da conta informado é inválido."
				});
			}

			if (!Object.values(UserAccountBankType).includes(account_type)) {
				return ApiResError(6, {
					title: "Erro na solicitação",
					message: "O tipo de conta informado é inválido."
				});
			}

			// Is valid bank
			const bank: Bank = await this.bankRepo.findOneBy({ id: bank_id });
			if (!bank) {
				return ApiResError(7, {
					title: "Erro na solicitação",
					message: "O banco selecionado não existe."
				});
			}

			// Is third party account
			if (is_third == "true") {
				// Validate document
				if (!document || cpf.isValid(document)) {
					return ApiResError(8, {
						title: "Erro na solicitação",
						message: "O CPF informado é inválido."
					});
				}

				// Check user full name
				const splitName: string[] = name.split(" ");
				if (splitName.length < 2 || splitName[0].length < 2 || splitName[splitName.length - 1].length < 2) {
					return ApiResError(9, {
						title: "Erro na solicitação",
						message: "O nome deve ser composto por 2 palavras, com pelo menos 2 caracteres cada."
					});
				}
			}

			// Inser account to user
			const userAccount = new UserAccountBank();
			userAccount.bank = bank;
			userAccount.agency = agency;
			userAccount.account = account;
			userAccount.account_type = account_type;
			userAccount.is_third = is_third;
			userAccount.is_default = is_default;
			userAccount.user = user;
			userAccount.document = document;
			userAccount.name = name;
			await this.userAccountBankRepo.save(userAccount);

			// Get user accounts
			const userAccounts: UserAccountBank[] = await this.userAccountBankRepo.findBy({ user: { id: user.id } });

			return ApiResSuccess({
				title: "Sucesso na solicitação",
				message: "Conta adicionada com sucesso."
			}, {
				accounts: userAccounts.map(account => ({
					_id: account.id,
					bank: account.bank.name,
					agency: account.agency,
					account: account.account,
					codigo: account.bank.code,
					ispb: account.bank.ispb,
					account_type: account.account_type,
					is_third: account.is_third,
					default: account.is_default,
					name: account.name || null,
					document: account.document || null
				}))
			});
		} catch (e) {
			console.log(e);
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Não foi possivel cadastrar sua conta no momento, tente novamente mais tarde."
			}, {
				error: e
			});
		}
	}
}
