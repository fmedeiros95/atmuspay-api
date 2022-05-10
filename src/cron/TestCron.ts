import { Init } from "../_core/abstracts/Init";
import { Cron } from "../_core/decorators/Cron";
import { Task } from "../_core/decorators/Task";

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
