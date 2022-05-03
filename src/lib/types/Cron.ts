import { ScheduleOptions } from "node-cron";

export type CronEvery = {
	every: number
}

export type CronEveryRange = {
	every: number,
	from: number,
	to: number
}

export type CronRange = {
	from: number,
	to: number
}

export type CronType = "*" | number | number[] | CronEvery | CronRange | CronEveryRange;
export type CronTypeParam = CronType | FunctionCronType
export type FunctionCronType = () => CronType;
export type ScheduleTaskOptions = ScheduleOptions & { event: string };
