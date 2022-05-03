import jsonwebtoken from "jsonwebtoken";

import { Helper } from "../lib/decorators";
import { CommandLine } from "../lib/main/Command";

@Helper()
export class UtilsHelper {
	public async sleep(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	public createJWT(id: string | number, options?: any): string {
		return jsonwebtoken.sign({ id }, CommandLine.token, {
			expiresIn: options?.expiresIn || CommandLine.jwtExpiresIn
		});
	}
}
