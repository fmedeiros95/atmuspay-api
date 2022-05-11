import { Type } from "../interfaces/Type";
import { ServerOptions } from "../interfaces/Server";
import { ScheduleAll } from "../main/Cron";
import { addToInjectionChain } from "../main/Injection";
import { createServerAndListen } from "../main/Server";
import { Server as HttpServer } from "http";
import { AddressInfo } from "net";


export function Server(options?: ServerOptions) {
	return (target: Type<any>) => {
		addToInjectionChain(target);

		createServerAndListen(options).then((server: HttpServer) => {
			// Init the cron jobs
			ScheduleAll();

			// Get the port
			const address = server.address() as AddressInfo;
			console.info("[SERVER] Listening to port:", address.port);
		}).catch((error) => {
			console.error(error);
		});
	};
}
