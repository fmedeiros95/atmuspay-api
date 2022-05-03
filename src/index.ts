import "reflect-metadata";
import bodyParser from "body-parser";
import cors from "cors";

// Core
import { Init } from "./lib/abstracts/Init";
import { Server } from "./lib/decorators";

// Controllers
import { BanksController } from "./controllers/BanksController";
import { CategoryController } from "./controllers/CategoryController";
import { LoginController } from "./controllers/LoginController";
import { UserController } from "./controllers/UserController";
import { UserAuthController } from "./controllers/UserAuthController";
import { UserFinanceController } from "./controllers/UserFinanceController";

// Helpers
import { TransactionHelper } from "./helpers/TransactionHelper";
import { UserHelper } from "./helpers/UserHelper";
import { UtilsHelper } from "./helpers/UtilsHelper";

// Cron
import { TestCron } from "./cron/TestCron";

// Config
import { Config, SystemParams } from "./config";

@Server({
	controllers: [
		BanksController,
		CategoryController,
		LoginController,
		UserController,
		UserAuthController,
		UserFinanceController
	],
	cron: [
		TestCron
	],
	helpers: [
		TransactionHelper,
		UserHelper,
		UtilsHelper
	],
	use: [
		cors({
			origin: true,
			credentials: true
		}),
		bodyParser.urlencoded({ extended: true }),
		bodyParser.json()
	],
	serveStatic: {
		path: "/uploads",
		use: Config.path.uploads
	},
})
export class AppServer implements Init {
	onInit() {
		console.log(`[SERVER] ${SystemParams.app.name} is online!`);
	}
}
