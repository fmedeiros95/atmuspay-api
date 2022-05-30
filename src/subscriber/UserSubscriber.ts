import { AppDataSource } from "../_core/main/Server";
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, RemoveEvent } from "typeorm";

import { User } from "../entity/User";
import { UserAddress } from "../entity/UserAddress";
import { UserBalance } from "../entity/UserBalance";
import { UserTwoFactor } from "../entity/UserTwoFactor";
import { MailService } from "../utils/MailService";
import { SystemParams } from "../config";
import { UserConfig } from "../entity/UserConfig";

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
	listenTo() { return User; }

	afterInsert(event: InsertEvent<User>) {
		// Instance of User
		const user: User = event.entity;

		// Send email confirmation code
		const mailService: MailService = new MailService(user.email.toLowerCase(), `${SystemParams.app.name} - Confirme seu e-mail`);
		mailService.send("email_confirm", Object.assign(user, {
			code: user.email_code
		}));

		// Create user address
		AppDataSource.manager.getRepository(UserAddress).save({ user });

		// Create user balace
		AppDataSource.manager.getRepository(UserBalance).save({ user });

		// Create user config
		AppDataSource.manager.getRepository(UserConfig).save({ user });

		// Create user two factor
		AppDataSource.manager.getRepository(UserTwoFactor).save({ user });
	}

	beforeRemove(event: RemoveEvent<User>) {
		console.log(
			`BEFORE ENTITY WITH ID ${event.entityId} REMOVED: `,
			event.entity,
		);
	}
}
