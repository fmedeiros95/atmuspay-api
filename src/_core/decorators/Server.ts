import { Type } from "../interfaces/Type";
import { ServerOptions } from "../interfaces/Server";
import { ScheduleAll } from "../main/Cron";
import { addToInjectionChain } from "../main/Injection";
import { createServerAndListen } from "../main/Server";
import { CommandLine } from "../main/Command";


export function Server(options?: ServerOptions) {
	return (target: Type<any>) => {
		addToInjectionChain(target);

		createServerAndListen(options).then(() => {
			ScheduleAll();

			console.info("[SERVER] Listening to port:", CommandLine.port);
		}).catch((error) => {
			console.error(error);
		});
	};
}
