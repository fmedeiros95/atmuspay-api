import { schedule as ScheduleTask } from "node-cron";
import { getFromInjectionChainByName } from "./Injection";
import { Map } from "../abstracts/Map";
import { ScheduleMeta } from "../interfaces/ScheduleMeta";
import { HashMap } from "../map/HashMap";
import { TypedCallback, TypedFunction } from "../types/Typed";


export const CronTasks: Map<ScheduleMeta> = new HashMap<ScheduleMeta>();
export function ScheduleAll() {
	CronTasks.forEachKey((key) => {
		CronTasks.changeIfPresent(key, (task) => {
			const options = task.options;
			task.task = ScheduleTask(task.expression, () => {
				const type = getFromInjectionChainByName(task.target);
				const instance = type;
				const method = instance[task.property];
				const ret = method.apply(instance);
				const returnType = ret != undefined ? ret.constructor.name : "undefined";

				switch (returnType) {
					case "Observable": {
						break;
					}
					case "Promise": {
						ret.then((e) => console.log(e))
							.catch((e) => console.log(e));
						break;
					}
					default: {
						break;
					}
				}
			}, options);
			return task;
		});
	});
}

export class ConditionalExecutor<T> {
	constructor(private task: TypedFunction<T>) { }

	public static create<T>(task: TypedFunction<T>) {
		return new ConditionalExecutor<T>(task);
	}

	doIf(condition: TypedFunction<boolean>) {
		return new ConditionalTask(this.task, condition);
	}
}

class ConditionalTask<T> {
	constructor(private task: TypedFunction<T>, private condition: TypedFunction<boolean>) { }

	execute(callback?: TypedCallback<T>) {
		if (this.condition()) {
			const value = this.task();
			if (callback != undefined) {
				callback(value);
			} else return value;
		}
		return undefined;
	}
}
