import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { EntityBase } from "../lib/abstracts/EntityBase";
import { Transaction } from "./Transaction";
import { User } from "./User";
import { UserAccountBank } from "./UserBankAccount";

@Entity()
export class Withdrawal extends EntityBase {
	@Column({ default: false })
	is_reversal: boolean;

	@Column()
	value: number;

	@OneToOne(() => User)
	@JoinColumn({ name: "user_id" })
	user: User;

	@ManyToOne(() => UserAccountBank)
	@JoinColumn({ name: "user_account_bank_id"})
	for_account: UserAccountBank;

	@OneToOne(() => Transaction, transaction => transaction.withdrawal)
    transaction: Transaction;
}
