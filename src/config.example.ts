import path from "path";
import { ServerConfig } from "./lib/interfaces/Server";

export const SystemParams = {
	app: {
		name: "Rifas Brasil",
		version: "1.0.0"
	}
};

export const Config: ServerConfig = {
	path: {
		configs: path.join(__dirname, "./configs/"),
		files: path.join(__dirname, "./files/"),
		uploads: path.join(__dirname, "./uploads/")
	},
	connection: {
		type: "mysql",
		host: "localhost",
		username: "root",
		password: "root",
		database: "rifas",
		synchronize: false,
		logging: false,
		entities: [ path.join(__dirname, "entity") + "/*" ],
		subscribers: [ path.join(__dirname, "subscriber") + "/*" ],
	}
};
