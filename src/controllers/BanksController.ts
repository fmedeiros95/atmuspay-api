import { Repository } from "typeorm";
import { Controller, InjectRepository, Request } from "../lib/decorators";
import { RequestMethod } from "../lib/enums/RequestMethod";
import { Bank } from "../entity/Bank";
import { ApiResSuccess } from "../utils/Response";
import { Init } from "../lib/abstracts/Init";

import migrateBank from "../migrate/bank.migrate.json";

@Controller({
	path: ["/banks"]
})
export class BanksController implements Init {
	@InjectRepository(Bank) private bankRepo: Repository<Bank>;

	async onInit() {
		if (await this.bankRepo.count()) {
			return;
		}

		for await (const bank of migrateBank.list) {
			await this.bankRepo.save(bank);
		}
	}

	@Request({
		path: "/",
		method: RequestMethod.GET
	})
	async index(): Promise<any> {
		const banks = await this.bankRepo.find();
		return ApiResSuccess({
			title: "Sucesso na consulta",
			message: "Consulta realizada com sucesso",
		}, {
			list: banks.map(bank => {
				return {
					_id: bank.id,
					name: bank.name,
					short_name: bank.short_name,
					code: bank.code,
					ispb: bank.ispb
				};
			})
		});
	}
}
