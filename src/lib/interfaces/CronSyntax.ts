import { CronTypeParam } from "../types/Cron";

export interface CronSyntax {
	second?: CronTypeParam,
	minute: CronTypeParam,
	hour: CronTypeParam,
	day: CronTypeParam,
	month: CronTypeParam,
	weekDay: CronTypeParam
}
