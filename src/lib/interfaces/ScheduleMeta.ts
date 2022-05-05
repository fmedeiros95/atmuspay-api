import { ScheduleTaskOptions } from "../types/Cron";
import { ScheduledTask } from "node-cron";

export interface ScheduleMeta {
	expression: string,
	property: string,
	target: string,
	task?: ScheduledTask,
	options?: ScheduleTaskOptions
}
