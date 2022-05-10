import { EntityBase } from "../_core/abstracts/EntityBase";
import { Column, Entity, Generated, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./User";

export enum UserTokenType {
	GENERAL = "general",
	TRANSFER = "transfer",
	WITHDRAWAL = "withdrawal",
	GET_USER = "get_user"
}

@Entity()
export class UserToken extends EntityBase {
	@Column()
	name: string;

	@Column({ unique: true })
	@Generated("uuid")
	token: string;

	@Column("enum", {
		enum: UserTokenType,
		default: UserTokenType.GENERAL
	})
	type: UserTokenType;

	@Column({ default: false })
	is_active: boolean;

	@Column("json", { nullable: true })
	ips: string[] | null;

	@Column("json", { nullable: true })
	domains: string[] | null;

	@ManyToOne(type => User, user => user.tokens)
	@JoinColumn({ name: "user_id" })
	user: User;
}
