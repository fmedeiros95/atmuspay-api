import { HttpHelper } from "../helpers/HttpHelper";
import { Controller, HttpRequest, Inject, PathVariable, Method, HttpResponse } from "../_core/decorators";
import { RequestMethod } from "../_core/enums/RequestMethod";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import { Request, Response } from "express";

@Controller({
	path: ["/data"]
})
export class DataController {
	@Inject() private httpHelper: HttpHelper;

	@Method({
		path: "/inquire-cpf/:cpf",
		method: RequestMethod.GET
	})
	async inquireCpf(@HttpRequest() req: Request, @HttpResponse() res: Response, @PathVariable("cpf") cpf: string): Promise<any> {
		try {
			const cpfData: any = await this.httpHelper.request({
				url: "https://api.targetdata-smart.com/api/PF/CPF",
				method: "POST",
				data: { cpf },
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json",
					"Authorization": "Bearer "
				}
			});
			if (!cpfData?.result.length) {
				return ApiResError(2, {
					title: "Erro na consulta",
					message: "O CPF informado não foi encontrado."
				});
			}

			const userData: {
				cadastral: {
					CPF: string;
					nomePrimeiro: string | null;
					nomeMeio: string | null;
					nomeUltimo: string | null;
					nomeParentesco: string | null;
					sexo: string;
					dataNascimento: string;
					statusReceitaFederal: string;
					maeNomePrimeiro: string | null;
					maeNomeMeio: string | null;
					maeNomeUltimo: string | null;
					maeNomeParentesco: string | null;
					obito: string;
				};
				socioDemografico: {
					profissao: string | null;
					rendaPresumida: string | null;
				};
				patrimonio: {
					veiculo: any[];
					imovel: any[];
				}
			} = cpfData.result[0].pessoa;

			const fullName: string = this.trataNome(`${userData.cadastral.nomePrimeiro || ""} ${userData.cadastral.nomeMeio || ""} ${userData.cadastral.nomeUltimo || ""} ${userData.cadastral.nomeParentesco || ""}`);
			const motherName: string = this.trataNome(`${userData.cadastral.maeNomePrimeiro || ""} ${userData.cadastral.maeNomeMeio || ""} ${userData.cadastral.maeNomeUltimo || ""} ${userData.cadastral.maeNomeParentesco || ""}`);
			const birthDate: string = this.trataNascimento(userData.cadastral.dataNascimento);

			return ApiResSuccess({
				title: "Sucesso",
				message: "CPF encontrado."
			}, {
				data: {
					nome: fullName,
					cpf: userData.cadastral.CPF,
					nascimento: birthDate,
					mae: motherName,
					obito: userData.cadastral.obito === "1" ? true : false,
					socioDemografico: userData.socioDemografico || null,
					patrimonio: userData.patrimonio || null
				}
			});
		} catch (error) {
			return ApiResError(1, {
				title: "Erro na consulta",
				message: "Não foi possível consultar o CPF, tente novamente mais tarde."
			});
		}
	}

	private trataNome(nome: string): string {
		return nome.toLowerCase().replace(/\b[a-z]/g, function(letter) {
			return letter.toUpperCase();
		}).replace(/\s+/g, " ").trim();
	}

	private trataNascimento(date: string): string {
		const data = date.split("-");
		return `${data[2]}${data[1]}${data[0]}`;
	}
}
