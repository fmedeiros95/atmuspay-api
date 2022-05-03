import { User } from "../entity/User";
import { Helper } from "../lib/decorators";

@Helper()
export class UserHelper {
	maskEmail(email: string): string {
		// mam****@gmail.com
		return email?.replace(/^(.+?)@(.+?)$/, "$1****@$2");
	}

	maskPhone(phone: string): string {
		// 55****1135
		return phone?.replace(/^(\d{2})(\d{4})(\d{4})$/, "$1****$3");
	}

	privateData(user: User): any {
		return {
			_id: user.id,
			document: {
				document: user.document,
				type: user.document_type
			},
			withdrawal_bank: {
				is_active: true,
				custom_rate: false,
				rate: 3390,
				custom_third_rate: false,
				third_rate: 4890,
				custom_limit: false,
				limit: 1234,
				third_enabled: false,
				automatic_credit_input_bank: true,
				custom_min_value: false,
				min_value: 1000
			},
			monthly_payment: {
				custom_payment: false,
				value: 0,
				pending_value: 0
			},
			whitelabel: {
				is_active: false,
				whitelabel: null
			},
			admin: {
				is_active: false,
				permissions: []
			},
			password: {
				two_factors: {
					is_active: user.two_factors !== null,
					disable_attempts: 0,
					type: "otp"
				},
				requested_change: true,
				last_change: null,
				login_attempts: user.fail_login
			},
			email: {
				verified: user.email_verified,
				email: this.maskEmail(user.email)	// mam****@gmail.com
			},
			validation: {
				is_valid: true,
				files: []
			},
			phone: {
				count_send_verification_code: 0,
				verified: user.phone_verified,
				phone: this.maskPhone(user.phone)	// 55****1135
			},
			address: user.address,
			images: {
				profile: {
					updated: "2019-03-16T22:44:57.142Z",
					profile: "profile/ttSHrtHMtNML5spVmTQWm6TrqJfxb3Gs.png"
				}
			},
			balance: {
				balance: user.balance.balance,
				balance_blocked: user.balance.balance_blocked,
				balance_future: user.balance.balance_future
			},
			birthday: user.birthday,
			gender: user.gender,
			is_international: user.is_international,
			access_card: user.access_card,
			is_active: user.is_active,
			finished_by_user: user.finished_by_user,
			is_blocked: user.is_blocked,
			blocked_by_user: user.blocked_by_user,
			verified_account: user.verified_account,
			updated_at: user.updated_at,
			user: user.username,
			name: user.name,
			accounts: user.accounts,
			created_at: user.created_at,
			category: user.category,
			sessions: []
		};
	}
}
