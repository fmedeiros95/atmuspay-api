import { AppDataSource } from "../lib/main/Server";
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, RemoveEvent } from "typeorm";

import { User } from "../entity/User";
import { UserAddress } from "../entity/UserAddress";
import { UserBalance } from "../entity/UserBalance";

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface {
	listenTo() { return User; }

	afterInsert(event: InsertEvent<any>) {
		// Instance of User
		const user: User = event.entity;

		// Create user address
		AppDataSource.manager.getRepository(UserAddress).save({ user });

		// Create user balace
		AppDataSource.manager.getRepository(UserBalance).save({ user });
	}

	beforeRemove(event: RemoveEvent<any>) {
		console.log(
			`BEFORE ENTITY WITH ID ${event.entityId} REMOVED: `,
			event.entity,
		);
	}
}
