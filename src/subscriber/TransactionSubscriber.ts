import { AppDataSource } from "../_core/main/Server";
import {
	EntitySubscriberInterface,
	EventSubscriber,
	InsertEvent,
	RemoveEvent,
	UpdateEvent
} from "typeorm";

import { UserBalance } from "../entity/UserBalance";
import {
	Transaction,
	TransactionStatus,
	TransactionType,
	TransactionValueType
} from "../entity/Transaction";

@EventSubscriber()
export class TransactionSubscriber implements EntitySubscriberInterface {
	listenTo() { return Transaction; }

	afterInsert(event: InsertEvent<any>) {
		// Instance of Transaction
		const transaction: Transaction = event.entity;

		if (transaction.status === TransactionStatus.PROCESSED) {
			if (transaction.value_type === TransactionValueType.POSITIVE) {
				// Update user balance
				AppDataSource.manager.getRepository(UserBalance).findOne({
					where: {
						user: { id: transaction.user.id }
					}
				}).then((userBalance: UserBalance) => {
					if (userBalance) {
						userBalance.balance += transaction.value;
						AppDataSource.manager.getRepository(UserBalance).save(userBalance);
					}
				});
			} else if (transaction.value_type === TransactionValueType.NEGATIVE) {
				// Update user balance
				AppDataSource.manager.getRepository(UserBalance).findOne({
					where: {
						user: { id: transaction.user.id }
					}
				}).then((userBalance: UserBalance) => {
					if (userBalance) {
						userBalance.balance -= transaction.value;
						AppDataSource.manager.getRepository(UserBalance).save(userBalance);
					}
				});
			}
		}
	}

	beforeUpdate(event: UpdateEvent<any>): void | Promise<any> {
		console.log("AFTER ENTITY UPDATED: ", event.entity);

		// Instance of Transaction
		// const transaction: Transaction = event.entity;
		// if (transaction.status === TransactionStatus.PROCESSED && 1 != 1) {
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
