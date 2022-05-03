import { RequestHandler } from "express";
import { DataSourceOptions } from "typeorm";
import { Type } from "./Type";

export interface ServerConfig {
	port?: number;
	token?: string;
	path?: any;
	mail?: any;
	connection?: DataSourceOptions;
	jwtExpiresIn?: string;
	requestDelay?: number;
	basePath?: string;
}

export interface ServerOptions {
	controllers?: Type<any>[];
	helpers?: Type<any>[];
	cron?: Type<any>[];
	socket?: Type<any>[];
	use?: RequestHandler[];
	serveStatic?: {
		use: string,
		path: string
	}
}
