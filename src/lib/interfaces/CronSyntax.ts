import { CronTypeParam } from "../types/CronTypeParam";

export interface CronSyntax {
	second?: CronTypeParam,
	minute: CronTypeParam,
	hour: CronTypeParam,
	day: CronTypeParam,
	month: CronTypeParam,
	weekDay: CronTypeParam
}
