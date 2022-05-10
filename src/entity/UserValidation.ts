import { EntityBase } from "../_core/abstracts/EntityBase";
import { Entity, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity()
export class UserValidation extends EntityBase {
	@ManyToOne(type => User, user => user.validations)
	@JoinColumn({ name: "user_id" })
	user: User;
}
