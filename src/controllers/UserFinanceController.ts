import validator from "validator";
import { Between, FindManyOptions, Raw, Repository } from "typeorm";
import { User } from "../entity/User";
import { Controller, HttpRequest, Inject, InjectRepository, Request } from "../lib/decorators";
import { RequestMethod } from "../lib/enums/RequestMethod";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import { Transaction, TransactionStatus, TransactionType } from "../entity/Transaction";
import { Transfer } from "../entity/Transfer";
import { TransactionHelper } from "../helpers/TransactionHelper";
import { startOfDay, endOfDay } from "date-fns";
import moment from "moment";
import { UtilsHelper } from "../helpers/UtilsHelper";

@Controller({
	path: ["/user/finance"],
	authenticated: true
})
export class UserFinanceController {
	@InjectRepository(User) private userRepo: Repository<User>;
	@InjectRepository(Transaction) private transactionRepo: Repository<Transaction>;
	@InjectRepository(Transfer) private transferRepo: Repository<Transfer>;

	@Inject() private transactionHelper: TransactionHelper;
	@Inject() private utilsHelper: UtilsHelper;

	@Request({
		path: "/new-transfer",
		method: RequestMethod.POST
	})
	async newTransfer(@HttpRequest() req): Promise<any> {
		try {
			const {
				code_2fa,
				to_user_id,
				value
			} = req.body;
			const fixedValue: number = Math.round(value);

			if (!code_2fa || !to_user_id || !value) {
				return ApiResError(2, {
					title: "Erro na solicitação",
					message: "Parâmetros não enviados."
				});
			}

			const user: User = await this.userRepo.findOneById(req.getUserId());

			// Check 2FA
			if (user.two_factor && user.two_factor.is_active) {
				const checkTwoFactor: any = this.utilsHelper.checkTwoFactor(user.two_factor.secret, code_2fa || "");
				if (!checkTwoFactor || checkTwoFactor.delta !== 0) {
					return ApiResError(7, {
						title: "Erro na solicitação",
						message: "Código de 2FA inválido."
					});
				}
			}


			if (validator.isUUID(to_user_id) === false) {
				return ApiResError(2, {
					title: "Erro na solicitação",
					message: "Usuário não encontrado."
				});
			}

			if (isNaN(fixedValue) || fixedValue <= 0) {
				return ApiResError(3, {
					title: "Erro na solicitação",
					message: "Valor inválido."
				});
			}

			if (user.id === to_user_id) {
				return ApiResError(4, {
					title: "Erro na solicitação",
					message: "Você não pode transferir para você mesmo."
				});
			}

			if (user.balance.balance < fixedValue) {
				return ApiResError(5, {
					title: "Erro na solicitação",
					message: "Saldo insuficiente."
				});
			}

			const toUser: User = await this.userRepo.findOneOrFail({
				where: { id: to_user_id },
				relations: {
					balance: true
				}
			});
			if (!toUser) {
				return ApiResError(6, {
					title: "Erro na solicitação",
					message: "Usuário não encontrado."
				});
			}

			// TODO: Implementar a transferência
			const transfer: Transfer = await this.transferRepo.save({
				send_from: user,
				send_to: toUser,
				value: fixedValue
			});

			await this.utilsHelper.sleep(1000);

			const transaction: Transaction = await this.transactionRepo.findOne({
				where: {
					transfer: { id: transfer.id }
				},
				relations: {
					transfer: true,
					withdrawal: true,
					user: true
				}
			});

			return ApiResSuccess({
				title: "Sucesso na solicitação",
				message: "Sua transferência foi realizada com sucesso."
			}, {
				transaction: this.transactionHelper.publicData(transaction)
			});
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Não conseguimos processar sua solicitação, tente novamente mais tarde."
			});
		}
	}

	@Request({
		path: "/account-extract",
		method: RequestMethod.GET
	})
	async accountExtract(@HttpRequest() req): Promise<any> {
		const user: User = await this.userRepo.findOne({
			where: { id: req.getUserId() }
		});

		let {
			page,			// Pagina atual
			results,		// Results per page
			order_type,		// ASC or DESC
		} = req.query;

		const {
			initialDate,	// Data inicial de consulta
			finalDate,		// Data final de consulta
			value_exact,	// Valor exato
			value,			// negative or positive
			type			// Transaction type
		} = req.query;

		page = page || 1;
		results = results || 20;
		order_type = order_type	|| "DESC";

		if (!validator.isDate(initialDate) || !validator.isDate(finalDate)) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Dados para consulta não enviados."
			});
		}

		const instaceInitialDate = new Date(initialDate);
		const instaceFinalDate = new Date(finalDate);

		if (instaceInitialDate > instaceFinalDate) {
			return ApiResError(2, {
				title: "Erro na consulta",
				message: "Data inicial maior que a data final."
			});
		}

		// Default filter
		const query: FindManyOptions<Transaction> = {
			where: {
				user: { id: user.id },
				created_at: Raw(alias => `${alias} BETWEEN :initialDate AND :finalDate`, {
					initialDate: `${initialDate} 00:00:00`,
					finalDate: `${finalDate} 23:59:59`
				}),
				// created_at: Between(initialDate, finalDate)
			},
			order: { created_at: order_type },
			skip: (page - 1) * results,
			take: results,
			relations: {
				transfer: true,
				withdrawal: true
			}
		};

		// Exact value filter
		if (value_exact && !isNaN(value_exact)) {
			query.where["value"] = value_exact;
		}

		// Value type filter
		if (value && ["positive", "negative"].includes(value)) {
			query.where["value_type"] = value;
		}

		// Type filter
		if (type && type !== "") {
			query.where["type"] = type;
		}

		try {
			// Get transactions
			const transactions: Transaction[] = await this.transactionRepo.find(query);

			// Get total with filter
			const totalResults: number = await this.transactionRepo.count({
				where: { ...query.where }
			});

			// Sum transactions value on this page
			const totalValue: number = transactions.reduce((accumulator, transaction) => {
				return accumulator + transaction.value;
			}, 0);

			// Response
			return ApiResSuccess({
				title: "Sucesso na consuta",
				message: "Extrato consultado com sucesso.",
			}, {
				total: totalValue,	// Total movimentações
				list: transactions.map(transaction => this.transactionHelper.publicData(transaction)),
				pageNumbers: Math.ceil(totalResults / results)
			});
		} catch (e) {
			console.error(e);
			return ApiResError(3, {
				title: "Erro na consulta",
				message: "Ocorreu um erro ao tentar consultar o extrato. Tente novamente mais tarde."
			});
		}
	}
}
