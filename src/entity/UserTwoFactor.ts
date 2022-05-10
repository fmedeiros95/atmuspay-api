import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { EntityBase } from "../_core/abstracts/EntityBase";
import { User } from "./User";

export enum UserTwoFactorType {
	OTP = "otp",
	SMS = "sms",
	EMAIL = "email"
}

@Entity()
export class UserTwoFactor extends EntityBase {
	@Column({ default: false })
	is_active: boolean;

	@Column({ nullable: true })
	secret: string;

	@Column({ default: 0 })
	disable_attempts: number;

	@Column("enum", {
		enum: UserTwoFactorType,
		default: UserTwoFactorType.OTP
	})
	type: UserTwoFactorType;

	@OneToOne(() => User, user => user.two_factor)
	@JoinColumn({ name: "user_id" })
	user: User;
}
