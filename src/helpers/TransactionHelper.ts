import { Transaction } from "../entity/Transaction";
import { Transfer } from "../entity/Transfer";
import { Withdrawal } from "../entity/Withdrawal";
import { Helper } from "../lib/decorators";

@Helper()
export class TransactionHelper {
	public publicData(transaction: Transaction): any {
		const data = {
			_id: transaction.id,
			type: transaction.type,
			value: transaction.value,
			status: transaction.status,
			balance: transaction.balance,
			created_at: transaction.created_at,
			description: transaction.description,
			user: {
				_id: transaction.user.id,
				name: transaction.user.name,
				user: transaction.user.username,
				verified_account: transaction.user.verified_account,
				document: {
					number: transaction.user.document,
					type: transaction.user.document_type,
				},
			}
		};

		if (transaction.transfer) {
			data["transfer"] = this.transferPublicData(transaction.transfer);
		}

		if (transaction.withdrawal) {
			data["withdrawal"] = this.withdrawalPublicData(transaction.withdrawal);
		}

		return data;
	}

	public withdrawalPublicData(withdrawal: Withdrawal): any {
		return {
			_id: withdrawal.id,
		};
	}

	public transferPublicData(transfer: Transfer): any {
		return {
			_id: transfer.id,
			is_reversal: transfer.is_reversal,
			send_to: {
				name: transfer.send_to.name,
				user: transfer.send_to.username,
				verified_account: transfer.send_to.verified_account,
				document: {
					document: transfer.send_to.document,
					type: transfer.send_to.document_type
				}
			},
			send_from: {
				name: transfer.send_from.name,
				user: transfer.send_from.username,
				verified_account: transfer.send_from.verified_account,
				document: {
					document: transfer.send_from.document,
					type: transfer.send_from.document_type
				}
			}
		};
	}
}
