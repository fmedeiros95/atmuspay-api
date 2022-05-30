import {
	PrimaryGeneratedColumn,
	CreateDateColumn,
	UpdateDateColumn,
	BaseEntity
} from "typeorm";

export abstract class EntityBase {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@CreateDateColumn()
	created_at: Date;

	@UpdateDateColumn()
	updated_at: Date;
}
