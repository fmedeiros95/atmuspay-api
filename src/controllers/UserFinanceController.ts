import validator from "validator";
import { FindManyOptions, FindOptionsOrderValue, LessThan, MoreThan, Raw, Repository } from "typeorm";
import { User } from "../entity/User";
import { Controller, HttpRequest, HttpResponse, Inject, InjectRepository, Method } from "../_core/decorators";
import { RequestMethod } from "../_core/enums/RequestMethod";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import { Transaction, TransactionType } from "../entity/Transaction";
import { Transfer } from "../entity/Transfer";
import { TransactionHelper } from "../helpers/TransactionHelper";
import { UtilsHelper } from "../helpers/UtilsHelper";
import { checkJwt, check2FA } from "../middlewares";
import { Request, Response } from "express";

@Controller({
	path: ["/user/finance"]
})
export class UserFinanceController {
	@InjectRepository(User) private userRepo: Repository<User>;
	@InjectRepository(Transaction) private transactionRepo: Repository<Transaction>;
	@InjectRepository(Transfer) private transferRepo: Repository<Transfer>;

	@Inject() private transactionHelper: TransactionHelper;
	@Inject() private utilsHelper: UtilsHelper;

	@Method({
		path: "/new-transfer",
		method: RequestMethod.POST,
		middlewares: [ checkJwt, check2FA ]
	})
	async newTransfer(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const {
				to_user_id,
				value
			} = req.body;
			const fixedValue: number = Math.round(value);

			if (!(to_user_id && value)) {
				return ApiResError(2, {
					title: "Erro na solicitação",
					message: "Parâmetros não enviados."
				});
			}

			// Get user
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Is a valid UUID
			if (validator.isUUID(to_user_id) === false) {
				return ApiResError(3, {
					title: "Erro na solicitação",
					message: "Usuário não encontrado."
				});
			}

			if (isNaN(fixedValue) || fixedValue <= 0) {
				return ApiResError(4, {
					title: "Erro na solicitação",
					message: "Valor inválido."
				});
			}

			if (user.id === to_user_id) {
				return ApiResError(5, {
					title: "Erro na solicitação",
					message: "Você não pode transferir para você mesmo."
				});
			}

			if (user.balance.balance < fixedValue) {
				return ApiResError(6, {
					title: "Erro na solicitação",
					message: "Seu saldo é insuficiente."
				});
			}

			// Get user to transfer
			const toUser: User = await this.userRepo.findOneByOrFail({ id: to_user_id });

			// Create transfer
			const transfer: Transfer = await this.transferRepo.save({
				send_from: user,
				send_to: toUser,
				value: fixedValue
			});

			// Sleep to wait for the transfer to be created
			await this.utilsHelper.sleep(1000);

			// Get related transaction
			const transaction: Transaction = await this.transactionRepo.findOne({
				where: {
					user: { id: user.id },
					transfer: { id: transfer.id }
				},
				relations: {
					transfer: true,
					withdrawal: true
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

	@Method({
		path: "/account-extract",
		method: RequestMethod.GET,
		middlewares: [ checkJwt ]
	})
	async accountExtract(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			const user: User = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			let {
				page,			// Pagina atual
				results,		// Results per page
				order_type,		// ASC or DESC
			}: {
				page?: number,
				results?: number,
				order_type?: FindOptionsOrderValue
			} = req.query;

			const {
				initialDate,	// Data inicial de consulta
				finalDate,		// Data final de consulta
				value_exact,	// Valor exato
				value,			// negative or positive
				type			// Transaction type
			}: {
				initialDate?: string,
				finalDate?: string,
				value_exact?: number,
				value?: string,
				type?: TransactionType
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
					})
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
				// With value type filter
				if (value && ["positive", "negative"].includes(value)) {
					if (value === "positive") {
						query.where["value"] = Raw(alias => `${alias} = :value`, { value: Math.abs(value_exact) });
					} else {
						query.where["value"] = Raw(alias => `${alias} = :value`, { value: -Math.abs(value_exact) });
					}
				} else {
					query.where["value"] = Raw(alias => `${alias} = :valuePositive OR ${alias} = :valueNegative`, {
						valuePositive: Math.abs(value_exact),
						valueNegative: -Math.abs(value_exact)
					});
				}
			} else {
				// Value type filter
				if (value && ["positive", "negative"].includes(value)) {
					query.where["value"] = value === "positive" ? MoreThan(0) : LessThan(0);
				}
			}

			// Type filter
			if (type && Object.values(TransactionType).includes(type)) {
				query.where["type"] = type;
			}

			// Get transactions
			const transactions: Transaction[] = await this.transactionRepo.find(query);

			// Get total with filter
			const totalResults: number = await this.transactionRepo.countBy({ ...query.where });

			// Sum transactions value on this page
			const totalValue: number = transactions.reduce((accumulator, transaction) => {
				return accumulator + Math.abs(transaction.value);
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
		} catch (error) {
			return ApiResError(3, {
				title: "Erro na consulta",
				message: "Ocorreu um erro ao tentar consultar o extrato. Tente novamente mais tarde."
			}, { error });
		}
	}
}
