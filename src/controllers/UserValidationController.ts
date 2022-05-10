import { Config } from "../config";
import { User } from "../entity/User";
import { UploadedFile } from "express-fileupload";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { Repository } from "typeorm";
import { Controller, HttpRequest, HttpResponse, Inject, InjectRepository, Method } from "../_core/decorators";
import { RequestMethod } from "../_core/enums/RequestMethod";
import { ApiResError, ApiResSuccess } from "../utils/Response";
import MD5 from "crypto-js/md5";
import { checkJwt } from "../middlewares/checkJwt";
import { Request, Response } from "express";

@Controller({
	path: ["/user/validation"]
})
export class UserValidationController {
	@InjectRepository(User) private userRepo: Repository<User>;

	@Method({
		path: "/new-face-image",
		method: RequestMethod.POST,
		middlewares: [ checkJwt ]
	})
	async newFaceImage(@HttpRequest() req: Request, @HttpResponse() res: Response): Promise<any> {
		try {
			// Get user
			const user = await this.userRepo.findOneByOrFail({ id: res.locals.jwtPayload.id });

			// Instance files
			const selfie: UploadedFile = <UploadedFile>req.files["selfie"];
			const document: UploadedFile = <UploadedFile>req.files["document"];
			const document_verse: UploadedFile = <UploadedFile>req.files["document_verse"];

			// Exists validation folder? If not, create it
			const validationFolder = `validation/${MD5(user.id)}`;
			const dir = path.join(Config.path.uploads, validationFolder);
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}

			[ selfie, document, document_verse ].some((file: UploadedFile) => {
				if (file) {
					console.log(file.name);
					return;
				}
			});

			// console.log(selfie, document, document_verse);
		} catch (error) {
			console.log(error);
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Erro ao enviar documentos, tente novamente mais tarde."
			});
		}
	}
}
