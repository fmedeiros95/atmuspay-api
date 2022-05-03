import { Column, Entity } from "typeorm";
import { EntityBase } from "../lib/abstracts/EntityBase";

@Entity()
export class Category extends EntityBase {
	@Column()
	name: string;

	@Column()
	description: string;
}
