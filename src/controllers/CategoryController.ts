import { Category } from "../entity/Category";
import { User } from "../entity/User";
import { UtilsHelper } from "../helpers/UtilsHelper";
import { Controller, HttpRequest, Inject, InjectRepository, Request } from "../lib/decorators";
import { RequestMethod } from "../lib/enums/RequestMethod";
import { Repository } from "typeorm";
import { ApiResSuccess } from "../utils/Response";

@Controller({
	path: ["/category"]
})
export class CategoryController {
	@Inject() private utilsHelper: UtilsHelper;

	@InjectRepository(Category) private categoryRepo: Repository<Category>;

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
