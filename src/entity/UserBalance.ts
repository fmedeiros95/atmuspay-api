import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { EntityBase } from "../_core/abstracts/EntityBase";
import { User } from "./User";

@Entity()
export class UserBalance extends EntityBase {
	@Column("bigint", { default: 0, transformer: {
		from: (value: string) => {
			return parseInt(value);
		},
		to: (value: number) => {
			return value;
		}
	}})
	balance: number;

	@Column("bigint", { default: 0, transformer: {
		from: (value: string) => {
			return parseInt(value);
		},
		to: (value: number) => {
			return value;
		}
	}})
	balance_blocked: number;

	@Column("bigint", { default: 0, transformer: {
		from: (value: string) => {
			return parseInt(value);
		},
		to: (value: number) => {
			return value;
		}
	}})
	balance_future: number;

    @OneToOne(() => User, user => user.balance)
	@JoinColumn({ name: "user_id" })
    user: User;
}
