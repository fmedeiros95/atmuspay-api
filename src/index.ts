import "reflect-metadata";
import bodyParser from "body-parser";
import cors from "cors";
import fileUpload from "express-fileupload";

// Core
import { Init } from "./_core/abstracts/Init";
import { Server } from "./_core/decorators";

// Controllers
import { BanksController } from "./controllers/BanksController";
import { ConfigController } from "./controllers/ConfigController";
import { DataController } from "./controllers/DataController";
import { LoginController } from "./controllers/LoginController";
import { UserAccountController } from "./controllers/UserAccountController";
import { UserApiController } from "./controllers/UserApiController";
import { UserFinanceController } from "./controllers/UserFinanceController";
import { UserTwoFactorController } from "./controllers/UserTwoFactorController";
import { UserValidationController } from "./controllers/UserValidationController";
import { UserController } from "./controllers/UserController";

// Helpers
import { AsaasHelper } from "./helpers/AsaasHelper";
import { HttpHelper } from "./helpers/HttpHelper";
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
		ConfigController,
		DataController,
		LoginController,
		UserAccountController,
		UserApiController,
		UserFinanceController,
		UserTwoFactorController,
		UserValidationController,
		UserController
	],
	cron: [
		// TestCron
	],
	helpers: [
		AsaasHelper,
		HttpHelper,
		TransactionHelper,
		UserHelper,
		UtilsHelper
	],
	use: [
		cors({ origin: true, credentials: true }),
		bodyParser.urlencoded({ extended: true }),
		bodyParser.json(),
		fileUpload()
	],
	serveStatic: [{
		path: "/uploads",
		use: Config.path.uploads
	}]
})
export class AppServer implements Init {
	onInit() {
		console.log(`[SERVER] ${SystemParams.app.name} is online!`);
	}
}
