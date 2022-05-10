import { AppDataSource } from "../_core/main/Server";
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, RemoveEvent } from "typeorm";

import { Transaction, TransactionStatus, TransactionType, TransactionValueType } from "../entity/Transaction";
import { Transfer } from "../entity/Transfer";
import { UserAddress } from "../entity/UserAddress";
import { UserBalance } from "../entity/UserBalance";

@EventSubscriber()
export class TransferSubscriber implements EntitySubscriberInterface {
	listenTo() { return Transfer; }

	afterInsert(event: InsertEvent<any>) {
		// Instance of Transfer
		const transfer: Transfer = event.entity;

		// Create transaction
		AppDataSource.manager.getRepository(Transaction).save({
			user: transfer.send_from,
			type: TransactionType.TRANSFER_TO_USER,
			status: TransactionStatus.PROCESSED,
			value: transfer.value,
			value_type: TransactionValueType.NEGATIVE,
			balance: transfer.send_from.balance.balance,
			transfer
		});

		// Create transaction
		AppDataSource.manager.getRepository(Transaction).save({
			user: transfer.send_to,
			type: TransactionType.TRANSFER_FROM_USER,
			status: TransactionStatus.PROCESSED,
			value: transfer.value,
			value_type: TransactionValueType.POSITIVE,
			balance: transfer.send_to.balance.balance,
			transfer
		});
	}

	beforeRemove(event: RemoveEvent<any>) {
		console.log(
			`BEFORE ENTITY WITH ID ${event.entityId} REMOVED: `,
			event.entity,
		);
	}
}
