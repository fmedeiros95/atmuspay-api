import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { Helper } from "../_core/decorators";

@Helper()
export class HttpHelper {
	public async request(options: AxiosRequestConfig): Promise<AxiosResponse> {
		return await axios(options).then((response: AxiosResponse) => {
			return response.data;
		}).catch((error) => { return false; });
	}
}
