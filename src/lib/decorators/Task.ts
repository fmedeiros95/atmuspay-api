import cluster from "cluster";
import { validate as ValidateExpression } from "node-cron";
import { CronSyntax } from "../interfaces/CronSyntax";
import { ConditionalExecutor, CronTasks } from "../main/Cron";
import { ScheduleTaskOptions } from "../types/Cron";
import { TypedMethodDecorator } from "../types/Typed";

export function Task(cron: CronSyntax | string, options?: ScheduleTaskOptions): TypedMethodDecorator<any> {
	return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
		const targetName = target.constructor.name;
		ConditionalExecutor.create(() => {
			const expression = syntaxToString(cron);
			if (ValidateExpression(expression)) {
				CronTasks.put(newId(), {
					expression: expression,
					property: propertyKey,
					target: targetName,
					options: options
				});
			} else {
				throw new Error(`Invalid Expression: ${expression}`);
			}
		}).doIf(() => cluster.isPrimary).execute();
	};
}

export function newId() {
	return Math.random().toString(36).substr(2, 9);
}

function parseValue(value: any) {
	if (value == undefined) return undefined;

	if (value instanceof Function) {
		return parseValue(value());
	}

	if (Array.isArray(value)) {
		return value.join(",");
	}

	if (value.every != undefined && value.from == undefined && value.to == undefined) {
		return "*/" + value.every;
	}

	if (value.every == undefined && value.from != undefined && value.to != undefined) {
		return value.from + "-" + value.to;
	}

	if (value.every != undefined && value.from != undefined && value.to != undefined) {
		return value.from + "-" + value.to + "/" + value.every;
	}

	return value;
}

function syntaxToString(cron: CronSyntax | string): string {
	if (typeof cron == "string") {
		return cron;
	}

	return `${parseValue(cron.second) || ""}${cron.second != undefined ? " " : ""}${parseValue(cron.minute)} ${parseValue(cron.hour)} ${parseValue(cron.day)} ${parseValue(cron.month)} ${parseValue(cron.weekDay)}`;
}
