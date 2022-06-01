import { RequestMethod } from "../_core/enums/RequestMethod";
import { SystemParams } from "../config";
import { Helper, Inject } from "../_core/decorators";
import { HttpHelper } from "./HttpHelper";
import { Method } from "axios";
import qs from "qs";

@Helper()
export class SerproHelper {
	@Inject() private httpHelper: HttpHelper;

	public async getCpfData(cpf: string): Promise<any> {
		const clientToken: any = await this.getClientToken();

		return this.callApi(`consulta-cpf/v1/cpf/${cpf}`, RequestMethod.GET, null, {
			"Accept": "application/json",
			"Authorization": `Bearer ${clientToken.access_token}`
		});
	}

	public async getCnpjData(cnpj: string): Promise<any> {
		const clientToken: any = await this.getClientToken();

		return this.callApi(`consulta-cnpj/v1/cnpj/${cnpj}`, RequestMethod.GET, null, {
			"Accept": "application/json",
			"Authorization": `Bearer ${clientToken.access_token}`
		});
	}

	public getClientToken(): Promise<any> {
		const clientKey: string = Buffer.from(`${SystemParams.serpro.consumerKey}:${SystemParams.serpro.consumerSecret}`).toString("base64");

		return this.callApi("token", RequestMethod.POST, qs.stringify({
			grant_type: "client_credentials"
		}), {
			"Content-Type": "application/x-www-form-urlencoded",
			"Authorization": `Basic ${clientKey}`
		});
	}

	private async callApi(endpoint: string, method: Method, data?: any, headers?: any): Promise<any> {
		return this.httpHelper.request({
			url: `https://gateway.apiserpro.serpro.gov.br/${endpoint}`,
			method,
			data,
			headers
		});
	}
}
