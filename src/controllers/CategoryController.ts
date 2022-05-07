import { Category } from "../entity/Category";
import { Controller, HttpRequest, InjectRepository, Request } from "../lib/decorators";
import { RequestMethod } from "../lib/enums/RequestMethod";
import { Repository } from "typeorm";
import { ApiResSuccess } from "../utils/Response";
import { Init } from "../lib/abstracts/Init";

import migrateCategory from "../migrate/category.migrate.json";

@Controller({
	path: ["/category"]
})
export class CategoryController implements Init {

	@InjectRepository(Category) private categoryRepo: Repository<Category>;

	async onInit() {
		if (await this.categoryRepo.count()) {
			return;
		}

		for await (const category of migrateCategory.list) {
			await this.categoryRepo.save(category);
		}
	}

	@Request({
		path: "/",
		method: RequestMethod.GET
	})
	async index(@HttpRequest() req): Promise<any> {
		const categories = await this.categoryRepo.find();
		return ApiResSuccess({
			title: "Sucesso na consulta",
			message: "Consulta realizada com sucesso",
		}, {
			list: categories.map(category => {
				return {
					_id: category.id,
					name: category.name,
					description: category.description,
					created_at: category.created_at,
					updated_at: category.updated_at
				};
			})
		});
	}
}
