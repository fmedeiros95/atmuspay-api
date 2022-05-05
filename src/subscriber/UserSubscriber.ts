import { AppDataSource } from "../lib/main/Server";
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, RemoveEvent } from "typeorm";

import { User } from "../entity/User";
import { UserAddress } from "../entity/UserAddress";
import { UserBalance } from "../entity/UserBalance";
import { UserTwoFactor } from "../entity/UserTwoFactor";
import { MailService } from "../utils/MailService";
import { SystemParams } from "../config";
import { UserConfig } from "../entity/UserConfig";

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface {
	listenTo() { return User; }

	afterLoad(entity: User) {
		// Has user address
		const hasAddress = AppDataSource.manager.getRepository(UserAddress).count({
			where: { user: { id: entity.id } }
		});
		if (!hasAddress) {
			AppDataSource.manager.getRepository(UserAddress).save({ user: entity });
		}

		// Has user balance
		const hasBalance = AppDataSource.manager.getRepository(UserBalance).count({
			where: { user: { id: entity.id } }
		});
		if (!hasBalance) {
			AppDataSource.manager.getRepository(UserBalance).save({ user: entity });
		}

		// Has user balance
		const hasConfig = AppDataSource.manager.getRepository(UserConfig).count({
			where: { user: { id: entity.id } }
		});
		if (!hasConfig) {
			AppDataSource.manager.getRepository(UserConfig).save({ user: entity });
		}

		// Has user two factor
		const hasTwoFactor = AppDataSource.manager.getRepository(UserTwoFactor).count({
			where: { user: { id: entity.id } }
		});
		if (!hasTwoFactor) {
			AppDataSource.manager.getRepository(UserTwoFactor).save({ user: entity });
		}
    }

	afterInsert(event: InsertEvent<any>) {
		// Instance of User
		const user: User = event.entity;

		// Send email confirmation code
		const mail: MailService = new MailService(user.email.toLowerCase(), `${SystemParams.app.name} - Confirme seu e-mail`);
		mail.send("email_confirm", Object.assign(user, {
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

	beforeRemove(event: RemoveEvent<any>) {
		console.log(
			`BEFORE ENTITY WITH ID ${event.entityId} REMOVED: `,
			event.entity,
		);
	}
}
