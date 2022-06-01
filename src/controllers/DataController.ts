import { SerproHelper } from "../helpers/SerproHelper";
import { Controller, HttpRequest, Inject, PathVariable, Method, HttpResponse } from "../_core/decorators";
import { RequestMethod } from "../_core/enums/RequestMethod";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import { Request, Response } from "express";
import { SystemParams } from "config";

@Controller({
	path: ["/"]
})
export class DataController {
	@Inject() private serproHelper: SerproHelper;

	@Method({
		path: "/inquire-cpf/:cpf",
		method: RequestMethod.GET
	})
	async inquireCpf(@HttpRequest() req: Request, @HttpResponse() res: Response, @PathVariable("cpf") cpf: string): Promise<any> {
		try {
			const cpfData: any = await this.serproHelper.getCpfData(cpf);
			if (!cpfData) {
				return ApiResError(2, {
					title: "Erro na consulta",
					message: "O CPF informado não foi encontrado."
				});
			}

			// Check if the CPF is regular
			if (cpfData.situacao.codigo !== "0") {
				return ApiResError(3, {
					title: "Erro na consulta",
					message: "O CPF informado não é regular."
				});
			}

			return ApiResSuccess({
				title: "Sucesso",
				message: "CPF encontrado."
			}, {
				data: {
					nome: cpfData.nome,
					cpf: cpfData.ni,
					nascimento: cpfData.nascimento,
					situacao: cpfData.situacao,
					obito: cpfData?.obito
				}
			});
		} catch (error) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Não foi possível consultar o CPF, tente novamente mais tarde."
			});
		}
	}
}
