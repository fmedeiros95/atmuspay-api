import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { EntityBase } from "../_core/abstracts/EntityBase";
import { User } from "./User";

@Entity()
export class UserAddress extends EntityBase {
	@Column({ nullable: true })
	city: string;

	@Column({ nullable: true })
	state: string;

	@Column({ nullable: true })
	country: string;

	@Column({ nullable: true })
	street: string;

	@Column({ nullable: true })
	number: string;

	@Column({ nullable: true })
	district: string;

	@Column({ nullable: true })
	complement: string;

	@Column({ nullable: true })
	zip_code: string;

	@Column({ nullable: true })
	ibge_code: string;

    @OneToOne(() => User, user => user.address)
	@JoinColumn({ name: "user_id" })
    user: User;
}
