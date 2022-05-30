import { EntityBase } from "../utils/EntityBase";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./User";

export enum UserValidationType {
	DOCUMENT = "document",
	DOCUMENT_VERSE = "document_verse",
	SELFIE = "selfie"
}

@Entity()
export class UserValidation extends EntityBase {
	@Column({
		type: "enum",
		enum: UserValidationType
	})
	type: UserValidationType;

	@Column()
	path: string;

	@Column()
	file_type: string;

	@Column({ default: false })
	is_valid: boolean;

	@Column()
	description: string;

	@ManyToOne(type => User, user => user.validations)
	@JoinColumn({ name: "user_id" })
	user: User;
}
