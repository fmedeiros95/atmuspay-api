import path from "path";
import { ServerConfig } from "./_core/interfaces/Server";

export const SystemParams = {
	app: {
		name: "AtmusPay",
		version: "1.0.0",
		email: "contato@atmuspay.com.br",
		url: "http://localhost:4200",
	},
	asaas: {
		env: "sandbox",	// sandbox | producao
		token: ""
	}
};

export const Config: ServerConfig = {
	path: {
		configs: path.join(__dirname, "./configs/"),
		files: path.join(__dirname, "./files/"),
		uploads: path.join(__dirname, "./uploads/"),
		templates: path.join(__dirname, "./templates/"),
	},
	mail: {
		active: false,
		transporter: {
			service: "gmail",
			auth: {
				user: "email@gmail.com",
				pass: "password"
			}
		}
	},
	connection: {
		type: "mysql",
		host: "localhost",
		username: "root",
		password: "root",
		database: "atmusPay",
		synchronize: true,
		logging: false,
		entities: [ path.join(__dirname, "entity") + "/*" ],
		subscribers: [ path.join(__dirname, "subscriber") + "/*" ],
	}
};
