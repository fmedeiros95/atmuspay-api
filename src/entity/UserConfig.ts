import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { EntityBase } from "../lib/abstracts/EntityBase";
import { User } from "./User";

@Entity()
export class UserConfig extends EntityBase {
	@Column({ default: 390 })
	monthly_payment_default_value: number;

	@Column({ default: 499 })
	recharge_rate_ticket: number;

	@Column({ default: 50 })
	transfer_default_rate: number;

	@Column({ default: 1000000 })
	withdrawal_bank_default_limit: number;

	@Column({ default: 2000000 })
	withdrawal_bank_default_limit_enterprise: number;

	@Column({ default: 1500000 })
	withdrawal_bank_default_limit_selfie_code: number;

	@Column({ default: 690 })
	withdrawal_bank_default_rate: number;

	@Column({ default: 1000 })
	withdrawal_bank_third_default_rate: number;

	@OneToOne(() => User, user => user.config)
	@JoinColumn({ name: "user_id" })
	user: User;
}
