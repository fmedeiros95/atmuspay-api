import { Init } from "../lib/abstracts/Init";
import { Cron } from "../lib/decorators/Cron";
import { Task } from "../lib/decorators/Task";

@Cron()
export class TestCron extends Init {
	@Task("* * * * *")
	execute() {
		console.log("[CRON] TestCron executed", new Date());
	}

	public onInit(): void {
		console.log("[CRON] TestCron initialized");
	}
}
