import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { EntityBase } from "../lib/abstracts/EntityBase";
import { Bank } from "./Bank";
import { User } from "./User";

export enum UserAccountBankType {
	CORRENTE = "CC",
	POUPANCA = "CP"
}

@Entity()
export class UserAccountBank extends EntityBase {
	@Column()
	account: string;

	@Column("enum", {
		enum: UserAccountBankType
	})
	account_type: UserAccountBankType;

	@Column()
	agency: string;

	@Column({ default: false })
	is_third: boolean;

	@Column({ nullable: true })
	name: string;

	@Column({ nullable: true })
	document: string;

	@Column({ default: false })
	default: boolean;

	@ManyToOne(() => User)
	@JoinColumn({ name: "user_id" })
	user: User;

	@ManyToOne(() => Bank)
	@JoinColumn({ name: "bank_id" })
	bank: Bank;
}
