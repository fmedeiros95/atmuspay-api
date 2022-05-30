import { Method } from "axios";
import QueryString from "qs";
import { Helper, Inject } from "../_core/decorators";
import { HttpHelper } from "./HttpHelper";

@Helper()
export class AsaasHelper {
	@Inject() private httpHelper: HttpHelper;

	private access_token: string;
	private environment: string;

	private async call(path: string, method: Method, data: any = null) {
		await this.httpHelper.request({
			url: `https://${this.settings.getUrl()}/api/v3/${path}`,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"access_token": this.access_token
			},
			method,
			data
		});

	}

	// CONFIGURAÇÕES
	public settings = {
		setAccessToken: (access_token: string) => {
			this.access_token = access_token;
		},
		setEnvironment: (environment: string) => {
			if (environment != "sandbox" && environment != "producao") {
				throw new Error("Invalid environment");
			}
			this.environment = environment;
		},
		getAccessToken: () => {
			return this.access_token;
		},
		getEnvironment: () => {
			return this.environment;
		},
		getUrl: () => {
			switch (this.settings.getEnvironment()) {
				case "sandbox": return "sandbox.asaas.com";
				case "producao": return "asaas.com";
				default: throw new Error("Invalid environment");
			}
		}
	};

	// CLIENTES
	public customer = {
		getAll: (filters: any) => {
			const uri = filters ? `customers?${QueryString.stringify(filters)}` : "customers";
			return this.call(uri, "GET");
		},
		getById: (id: string) => {
			return this.call(`customers/${id}`, "GET");
		},
		getByEmail: (email: string) => {
			return this.call(`customers?email=${email}`, "GET");
		},
		getByDocument: (document: string) => {
			return this.call(`customers?cpfCnpj=${document}`, "GET");
		},
		create: (data: any) => {
			return this.call("customers", "POST", data);
		},
		update: (id: string, data: any) =>{
			return this.call(`customers/${id}`, "POST", data);
		},
		delete: (id: string) => {
			return this.call(`customers/${id}`, "DELETE");
		}
	};

	// COBRANÇAS
	public payment = {
		getAll: (filters: any) => {
			const uri = filters ? `payments?${QueryString.stringify(filters)}` : "payments";
			return this.call(uri, "GET");
		},
		getById: (id: string) => {
			return this.call(`payments/${id}`, "GET");
		},
		getByCustomer: (filters: any, customer_id: string) => {
			const uri = filters ? `customers/${customer_id}/payments?${QueryString.stringify(filters)}` : `customers/${customer_id}/payments`;
			return this.call(uri, "GET");
		},
		getBySubscription: (filters: any, subscription_id: string) => {
			const uri = filters ? `subscriptions/${subscription_id}/payments?${QueryString.stringify(filters)}` : `subscriptions/${subscription_id}/payments`;
			return this.call(uri, "GET");
		},
		create: (data: any) => {
			return this.call("payments", "POST", data);
		},
		update: (id: string, data?: any) => {
			return  this.call(`payments/${id}`, "POST", data);
		},
		delete: (id: string) => {
			return this.call(`payments/${id}`, "DELETE");
		},
		received: (id: string) => {
			return this.call(`payments/isReceivedPayment/${id.split("_")[1]}`, "GET");
		}
	};

	// SUBSCRIÇÕES
	public subscription = {
		getAll: (filters: any) => {
			const uri = filters ? `subscriptions?${QueryString.stringify(filters)}` : "subscriptions";
			return this.call(uri, "GET");
		},
		getById: (id: string) => {
			return this.call(`subscriptions/${id}`, "GET");
		},
		getByCustomer: (filters: any, customer_id: string) => {
			const uri = filters ? `customers/${customer_id}/subscriptions?${QueryString.stringify(filters)}` : `customers/${customer_id}/subscriptions`;
			return this.call(uri, "GET");
		},
		create: (data: any) => {
			return this.call("subscriptions", "POST", data);
		},
		update: (id: string, data: any) => {
			return this.call(`subscriptions/${id}`, "POST", data);
		},
		delete: (id: string) => {
			return this.call(`subscriptions/${id}`, "DELETE");
		}
	};

	// PIX
	public pix = {
		createPaymentQrCode: (payment_id: string) => {
			return this.call(`pixQrCode/createPaymentQrCode/${payment_id}`, "GET");
		}
	};
}
