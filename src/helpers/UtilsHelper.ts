import jsonwebtoken from "jsonwebtoken";
import * as twoFactor from "node-2fa";

import { Helper } from "../lib/decorators";
import { CommandLine } from "../lib/main/Command";
import { User } from "../entity/User";
import { SystemParams } from "../config";

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

	public createTwoFactorToken(user: User) {
		return twoFactor.generateSecret({
			name: SystemParams.app.name,
			account: user.username
		});
	}

	public checkTwoFactor(user2faToken: string, code: string) {
		return twoFactor.verifyToken(user2faToken, code);
	}

	public randomCode(length: number, isNumber?: boolean) {
		let result = "";
		const characters = isNumber ? "0123456789" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		const charactersLength = characters.length;
		for (let i = 0; i < length; i++) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}

	public getMinutesBetweenDates(startDate: Date, endDate: Date) {
		const diff = endDate.getTime() - startDate.getTime();
		return ((diff / 60) * 1000);
	}
}
