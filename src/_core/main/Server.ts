import express, { Request } from "express";
import { Express, IRoute, Response, RequestHandler, Router } from "express";
import { createServer, Server } from "http";
import { DataSource } from "typeorm";
import { CommandLine } from "./Command";
import { getFromInjectionChain, processInjectionChain } from "./Injection";
import { Map } from "../abstracts/Map";
import { HttpStatus } from "../enums/HttpStatus";
import { RequestMethod } from "../enums/RequestMethod";
import { MappingMetadata, MappingParameter } from "../interfaces/Mapping";
import { ServerOptions, ServerStatic } from "../interfaces/Server";
import { ControllerMetadata } from "../interfaces/ControllerMetadata";
import { HashMap } from "../map/HashMap";

export let AppDataSource: DataSource;
export const ServerMetadata: Map<ControllerMetadata<any>> = new HashMap<ControllerMetadata<any>>();
export function createServerAndListen(options: ServerOptions) {
	const keepConnection = !CommandLine.connection;
	if (!keepConnection) {
		AppDataSource = new DataSource(CommandLine.connection);
	}

	return new Promise((resolve, reject) => {
		connectDatabase(keepConnection).then(() => {
			processInjectionChain();

			const AppServer: Express = express();
			const appRouter = Router({ mergeParams: true });

			AppServer.use(options.use || []);
			if (options.serveStatic) {
				options.serveStatic.forEach((staticRoute: ServerStatic) => {
					AppServer.use(staticRoute.path, express.static(staticRoute.use));
				});
			}

			const appPrefix = "/v1";

			ServerMetadata.forEachAsync((key, value) => {
				value.app = Router({ mergeParams: true });
				value.mappings.forEach((key, method) => {
					handleControllers(value, method);
				});

				if (value.options.middlewares && value.options.middlewares.length > 0) {
					appRouter.use(value.options.path, value.options.middlewares, value.app);
				} else {
					appRouter.use(value.options.path, value.app);
				}
			}).then(() => {
				AppServer.use(appPrefix, appRouter);

				// Create the HTTP server
				const httpServer: Server = createServer(AppServer);
				httpServer.listen(CommandLine.port, () => {
					resolve(httpServer);
				});
			});
		}).catch((error) => {
			console.info("[SERVER] Error while connecting to database.");
			console.error(error);
		});
	});
}


function connectDatabase(keepConnection: boolean): Promise<DataSource> {
	if (keepConnection) {
		return Promise.resolve(null);
	}

	console.log("[SERVER] Connecting to database...");
	return AppDataSource.initialize();
}

function getExpressMatchingMethod<T>(route: IRoute, method: RequestMethod, middlewares: any[], ...handlers: RequestHandler[]): IRoute {
	const args = [];
	if (middlewares && middlewares.length > 0) {
		args.push(middlewares);
	}
	args.push(...handlers);

	// Set the matching method
	switch (method) {
		case RequestMethod.GET: return route.get(...args);
		case RequestMethod.POST: return route.post(...args);
		case RequestMethod.PUT: return route.put(...args);
		case RequestMethod.DELETE: return route.delete(...args);
		case RequestMethod.OPTIONS: return route.options(...args);
		case RequestMethod.ALL: return route.all(...args);
		default: return route.all(...args);
	}
}

function handleControllers<T>(controllerMeta: ControllerMetadata<T>, meta: MappingMetadata) {
	const options = Object.assign(Object.assign({}, controllerMeta.options, {
		path: ""
	}), meta.options);
	options.path = options.path == "" || options.path == undefined ? "/" : options.path;

	getExpressMatchingMethod(controllerMeta.app.route(options.path), options.method, options.middlewares, (req: Request, res: Response): Promise<void> => {
		const instance: T = getFromInjectionChain(controllerMeta.type);

		const method = instance[meta.property];
		const parameters: MappingParameter[] = meta.parameters;

		const promiseArr = [];
		Object.keys(req.params).forEach(name => {
			controllerMeta.params.get(name).ifPresent((metaParam: MappingMetadata) => {
				const paramMethod = instance[metaParam.property];
				promiseArr.push(paramMethod.apply(instance, [
					req.params[name],
					name
				]).then((nValue: any) => {
					req.params[name] = nValue;

					return nValue;
				}));
			});
		});

		if (promiseArr.length == 0) {
			promiseArr.push(Promise.resolve({}));
		}

		return Promise.all(promiseArr).then(() => {
			const args = parameters.sort((v1: MappingParameter, v2: MappingParameter) => {
				return v1.index - v2.index;
			}).map((param: MappingParameter) => {
				const value = param.path.reduce((pv, cv: string) => {
					if (pv != undefined) return pv[cv];
					return undefined;
				}, { req, res });

				if (param.decorator == "RequestBody") {
					return Object.assign(new param.type(), value);
				}

				return value;
			});

			// Return the result of the method
			const value = method.apply(instance, args);

			if (meta.returnTypeName == undefined) {
				meta.returnTypeName = value.constructor.name;
			}

			if (options.isFile) {
				value.then((resp: any) => {
					res.sendFile(resp);
				}).catch((err: any) => {
					const status = err.status != undefined ? err.status : (options.errorCode != undefined ? options.errorCode : HttpStatus.INTERNAL_SERVER_ERROR);
					const error = new HttpError(err.messageCode || status, err.message || err);
					res.status(status).send(error);
				});
				return;
			}

			if (options.isDownload) {
				value.then((resp: any) => {
					res.end(resp);
				}).catch((err: any) => {
					const status = err.status != undefined ? err.status : (options.errorCode != undefined ? options.errorCode : HttpStatus.INTERNAL_SERVER_ERROR);
					const error = new HttpError(err.messageCode || status, err.message || err);
					res.status(status).send(error);
				});
				return;
			}

			switch (meta.returnTypeName) {
				case "Observable": {
					value.subscribe((value: any) => {
						res.json(value);
					});
					break;
				}
				case "Promise": {
					value.then((value: any) => {
						res.json(value);
					}).catch((err: any) => {
						const status: number = err.status != undefined ? err.status : (options.errorCode != undefined ? options.errorCode : HttpStatus.UNPROCESSABLE_ENTITY);
						const error: HttpError = new HttpError(err.messageCode || status, err.message || err);
						res.status(status).send(error);
					});
					break;
				}
				default: {
					res.send(value);
					return;
				}
			}
		}).catch(err => {
			res.status(err.status != undefined ? err.status : HttpStatus.INTERNAL_SERVER_ERROR).send(err);
		});
	});
}

export class HttpError extends Error {
	messageCode: HttpStatus | number;
	message: any;
	error: Error;

	constructor(
		messageCode: HttpStatus | number,
		message: string,
		error?: Error
	) {
		super();

		this.messageCode	= messageCode;
		this.message		= message;
		this.error			= error;
	}
}
