import { Column, Entity, OneToOne } from "typeorm";
import { EntityBase } from "../_core/abstracts/EntityBase";

@Entity()
export class Bank extends EntityBase {
	@Column()
	name: string;

	@Column()
	short_name: string;

	@Column()
	code: string;

	@Column()
	ispb: string;
}
