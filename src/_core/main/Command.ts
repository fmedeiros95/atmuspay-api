import { argv } from "process";
import { ServerConfig } from "../interfaces/Server";
import { Commands } from "../types/Command";
import { Config } from "../../config";

export const comandList: Commands<ServerConfig> = {
	port: {
		default: 3001,
		alias: ["p"]
	},
	token: {
		default: "dAppBackend",
		alias: ["t"]
	},
	requestDelay: {
		default: 3000,
		alias: ["rd"]
	},
	jwtExpiresIn: {
		default: "1d",
		alias: []
	},
    basePath: {
        default: "/",
        alias: ["bp"]
    }
};

export const CommandLine: ServerConfig = CommandValues();

function defaultValues() {
	return Object.keys(comandList).map((key) => ({
		key: key,
		value: comandList[key].default
	})).reduce((pv, cv) => {
		pv[cv.key] = cv.value;
		return pv;
	}, {});
}

function CommandValues(): ServerConfig {
	const args: any = {};
	argv.slice(2).forEach((arg) => {
		const spl = arg.split("=");
		if (spl[0] != undefined) {
			if (spl[1] != undefined) {
				if (!isNaN(Number(spl[1]))) {
					args[spl[0].replace("--", "")] = Number(spl[1]);
				} else if (spl[1] == "true" || spl[1] == "false") {
					args[spl[0].replace("--", "")] = spl[1] == "true" ? true : false;
				} else {
					args[spl[0].replace("--", "")] = spl[1];
				}
			} else {
				args[spl[0].replace("--", "")] = true;
			}
		}
	});

	const env: any = defaultValues();
	return {
		...env,
		...Config,
		...args
	};
}
