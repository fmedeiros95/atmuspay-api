import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { EntityBase } from "../utils/EntityBase";
import { Transaction } from "./Transaction";
import { User } from "./User";

@Entity()
export class Transfer extends EntityBase {
	@Column({ default: false })
	is_reversal: boolean;

	@Column()
	value: number;

	@ManyToOne(() => User, { eager: true })
	@JoinColumn({ name: "send_to_id" })
	send_to: User;

	@ManyToOne(() => User, { eager: true })
	@JoinColumn({ name: "send_from_id" })
	send_from: User;

    @OneToMany(() => Transaction, transaction => transaction.transfer)
    transactions: Transaction[];
}
