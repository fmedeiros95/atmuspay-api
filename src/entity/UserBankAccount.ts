import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { EntityBase } from "../utils/EntityBase";
import { Bank } from "./Bank";
import { User } from "./User";

export enum UserAccountBankType {
	CORRENTE = "CC",
	POUPANCA = "CP"
}

@Entity()
export class UserAccountBank extends EntityBase {
	@Column()
	agency: string;

	@Column()
	account: string;

	@Column("enum", {
		enum: UserAccountBankType
	})
	account_type: UserAccountBankType;

	@Column({ default: false })
	is_default: boolean;

	@Column({ default: false })
	is_third: boolean;

	@Column({ nullable: true })
	name: string;

	@Column({ nullable: true })
	document: string;

	@ManyToOne(() => User)
	@JoinColumn({ name: "user_id" })
	user: User;

	@ManyToOne(() => Bank, { eager: true })
	@JoinColumn({ name: "bank_id" })
	bank: Bank;
}
