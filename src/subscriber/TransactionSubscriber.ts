import { AppDataSource } from "../_core/main/Server";
import {
	EntitySubscriberInterface,
	EventSubscriber,
	InsertEvent,
	RemoveEvent,
	Repository,
	UpdateEvent
} from "typeorm";

import { UserBalance } from "../entity/UserBalance";
import {
	Transaction,
	TransactionStatus,
	TransactionType
} from "../entity/Transaction";

@EventSubscriber()
export class TransactionSubscriber implements EntitySubscriberInterface<Transaction> {
	listenTo() { return Transaction; }

	afterInsert(event: InsertEvent<Transaction>): void {
		// Instance of Transaction
		const transaction: Transaction = event.entity;

		if (transaction.status === TransactionStatus.PROCESSED) {
			// Get user balance repository
			const userBalanceRepo: Repository<UserBalance> = AppDataSource.manager.getRepository(UserBalance);

			// Process value
			userBalanceRepo.increment({ user: { id: transaction.user.id } }, "balance", transaction.value);

			// Update user balance
			// userBalanceRepo.findOneBy({ user: { id: transaction.user.id }})
			// 	.then((userBalance: UserBalance) => {
			// 		if (userBalance) {
			// 			userBalance.balance += transaction.value;
			// 			userBalanceRepo.save(userBalance);
			// 		}
			// 	});
		}
	}

	beforeUpdate(event: UpdateEvent<Transaction>): void {
		console.log("AFTER ENTITY UPDATED: ", event.entity);

		// Instance of Transaction
		// const transaction: Transaction = event.entity;
		// if (transaction.status === TransactionStatus.PROCESSED) {
		// 	if (transaction.value_type === TransactionValueType.POSITIVE) {
		// 		// Update user balance
		// 		AppDataSource.manager.getRepository(UserBalance).findOne({
		// 			where: {
		// 				user: { id: transaction.user.id }
		// 			}
		// 		}).then((userBalance: UserBalance) => {
		// 			if (userBalance) {
		// 				userBalance.balance += transaction.value;
		// 				AppDataSource.manager.getRepository(UserBalance).save(userBalance);
		// 			}
		// 		});
		// 	} else if (transaction.value_type === TransactionValueType.NEGATIVE) {
		// 		// Update user balance
		// 		AppDataSource.manager.getRepository(UserBalance).findOne({
		// 			where: {
		// 				user: { id: transaction.user.id }
		// 			}
		// 		}).then((userBalance: UserBalance) => {
		// 			if (userBalance) {
		// 				userBalance.balance -= transaction.value;
		// 				AppDataSource.manager.getRepository(UserBalance).save(userBalance);
		// 			}
		// 		});
		// 	}
		// }
	}

	beforeRemove(event: RemoveEvent<any>) {
		console.log(
			`BEFORE ENTITY WITH ID ${event.entityId} REMOVED: `,
			event.entity,
		);
	}
}
