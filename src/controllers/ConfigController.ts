import { Config } from "../entity/Config";
import { checkJwt } from "../middlewares";
import { Repository } from "typeorm";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import { Controller, InjectRepository, Method } from "../_core/decorators";
import { RequestMethod } from "../_core/enums/RequestMethod";

@Controller({
	path: ["/config"],
})
export class ConfigController {
	@InjectRepository(Config) private configRepo: Repository<Config>;

	@Method({
		path: "/",
		method: RequestMethod.GET,
		middlewares: [ checkJwt ]
	})
	public async getConfig() {
		try {
			// Get default config
			const config: Config = await this.configRepo.findOne({ order: { created_at: "ASC" } });

			// Delete specific fields
			delete config.id;
			delete config.created_at;
			delete config.updated_at;

			return ApiResSuccess({
				title: "Sucesso na consulta",
				message: "Configurações carregadas com sucesso.",
			}, {
				list: Object.keys(config).map(key => ({
					config_name: key,
					normalized_value: config[key]
				}))
			});
		} catch (e) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Não foi possível carregar as configurações, tente novamente mais tarde."
			});
		}
	}
}
