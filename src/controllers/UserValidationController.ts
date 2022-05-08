import { Controller, HttpRequest, Request } from "../lib/decorators";
import { RequestMethod } from "../lib/enums/RequestMethod";
import { ApiResError, ApiResSuccess } from "../utils/Response";

@Controller({
	path: ["/user/validation"],
	authenticated: true
})
export class UserValidationController {
	@Request({
		path: "/new-face-image",
		method: RequestMethod.POST
	})
	async newFaceImage(@HttpRequest() req): Promise<any> {
		try {
			const {
				selfie,
				document,
				document_verse
			} = req.files;
		} catch (error) {
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Erro ao enviar documentos, tente novamente mais tarde."
			});
		}
	}
}
