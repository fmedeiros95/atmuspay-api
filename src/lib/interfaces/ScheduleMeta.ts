import { ScheduledTask } from "node-cron";
import { ScheduleTaskOptions } from "../types/ScheduleTaskOptions";

export interface ScheduleMeta {
	expression: string,
	property: string,
	target: string,
	task?: ScheduledTask,
	options?: ScheduleTaskOptions
}
