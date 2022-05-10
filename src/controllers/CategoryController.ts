import { Category } from "../entity/Category";
import { Controller, HttpRequest, InjectRepository, Method } from "../_core/decorators";
import { RequestMethod } from "../_core/enums/RequestMethod";
import { Repository } from "typeorm";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import { Init } from "../_core/abstracts/Init";

import migrateCategory from "../migrate/category.migrate.json";
import { Request } from "express";

@Controller({
	path: ["/category"]
})
export class CategoryController implements Init {
	@InjectRepository(Category) private categoryRepo: Repository<Category>;

	async onInit() {
		try {
			if (await this.categoryRepo.count()) return;
			for await (const category of migrateCategory.list) {
				await this.categoryRepo.save(category);
			}
		} catch (error) {
			console.log("[ERROR] Category (MIGRATE):", error);
		}
	}

	@Method({
		path: "/",
		method: RequestMethod.GET
	})
	async index(): Promise<any> {
		try {
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
		} catch (error) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Não foi possível realizar a consulta, tente novamente mais tarde."
			});
		}
	}
}
