import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { EntityBase } from "../_core/abstracts/EntityBase";
import { Transfer } from "./Transfer";
import { User } from "./User";
import { Withdrawal } from "./Withdrawal";

export enum TransactionStatus {
	PROCESSED = "processed",
	PENDING = "pending",
	ERROR = "error",
	GENERATED_FILE = "generated-file",
	PROCESSING = "processing",
	REVERSED = "reversed",
	CANCELED = "canceled"
}

export enum TransactionType {
	WITHDRAWAL_BANK = "withdrawal.bank",
	RATE_WITHDRAWAL_BANK = "rate.withdrawal.bank",
	TRANSFER_TO_USER = "transfer.to.user",
	TRANSFER_FROM_USER = "transfer.from.user",
	DEBIT_MONTHLY_PAYMENT = "debit.monthly.payment",
	CREDIT_TICKET_INVOICE = "credit.ticket.invoice",
	CREDIT_TICKET_RECHARGE = "credit.ticket.recharge",
	DEBIT_RECHARGE_CELLPHONE = "debit.recharge.cellphone",
	DEBIT_SERVICE_PIN = "debit.service.pin",
	DEBIT_RATE_TICKET_RECHARGE = "debit.rate.ticket.recharge",
}

export enum TransactionValueType {
	POSITIVE = "positive",
	NEGATIVE = "negative"
}

@Entity()
export class Transaction extends EntityBase {
	@Column("enum", { enum: TransactionType, nullable: true })
	type: TransactionType;

	@Column("enum", {
		enum: TransactionStatus,
		default: TransactionStatus.PENDING
	})
	status: TransactionStatus;

	@Column()
	balance: number;

	@Column()
	value: number;

	@Column("enum", {
		enum: TransactionValueType
	})
	value_type: TransactionValueType;

	@Column({ nullable: true })
	description: string;

	@Column({ nullable: true })
	note: string;

    @ManyToOne(() => User, user => user.transactions, { eager: true })
	@JoinColumn({ name: "user_id" })
    user: User;

	@ManyToOne(() => Transfer, transfer => transfer.transactions)
	@JoinColumn({ name: "transfer_id" })
    transfer: Transfer;

	@ManyToOne(() => Withdrawal, withdrawal => withdrawal.transaction)
	@JoinColumn({ name: "withdrawal_id" })
    withdrawal: Withdrawal;
}
