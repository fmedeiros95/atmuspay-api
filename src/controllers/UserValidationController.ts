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
import { UserValidation, UserValidationType } from "../entity/UserValidation";

@Controller({
	path: ["/user/validation"]
})
export class UserValidationController {
	@InjectRepository(User) private userRepo: Repository<User>;
	@InjectRepository(UserValidation) private userValidationRepo: Repository<UserValidation>;

	// Valid document file format (jpg, png, jpeg, pdf)
	private validFormats: string[] = [ "image/jpeg", "image/png", "image/jpg", "application/pdf" ];

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

			// Required files
			if (!selfie || !document) {
				return ApiResError(1, {
					title: "Erro na solicitação",
					message: "Please, send all required files"
				});
			}

			// Validate selfie file format and size (max size: 2MB)
			if (!this.validFormats.includes(selfie.mimetype)) {
				return ApiResError(2, {
					title: "Erro na solicitação",
					message: "Please, send a valid selfie file"
				});
			}
			if (selfie.size > 2000000) {
				return ApiResError(3, {
					title: "Erro na solicitação",
					message: "Please, send a selfie file with a maximum size of 2MB"
				});
			}

			// Validate document file format and size (max size: 2MB)
			if (!this.validFormats.includes(document.mimetype)) {
				return ApiResError(4, {
					title: "Erro na solicitação",
					message: "Please, send a valid document file"
				});
			}
			if (document.size > 2000000) {
				return ApiResError(5, {
					title: "Erro na solicitação",
					message: "Please, send a document file with a maximum size of 2MB"
				});
			}

			// Validate document_verse file format and size (max size: 2MB)
			if (document_verse && !this.validFormats.includes(document_verse.mimetype)) {
				return ApiResError(6, {
					title: "Erro na solicitação",
					message: "Please, send a valid document_verse file"
				});
			}
			if (document_verse && document_verse.size > 2000000) {
				return ApiResError(7, {
					title: "Erro na solicitação",
					message: "Please, send a document_verse file with a maximum size of 2MB"
				});
			}

			// Save files
			const selfiePath = `${validationFolder}/selfie.${selfie.name.split(".").pop()}`;
			const documentPath = `${validationFolder}/document.${document.name.split(".").pop()}`;
			const document_versePath = document_verse ? `${validationFolder}/document_verse.${document_verse.name.split(".").pop()}` : null;

			await selfie.mv(path.join(Config.path.uploads, selfiePath));
			await document.mv(path.join(Config.path.uploads, documentPath));
			if (document_verse) await document_verse.mv(path.join(Config.path.uploads, document_versePath));

			// Add files to user validation
			// this.userValidationRepo.save()
			// 	{
			// 	user: user,
			// 	type: UserValidationType.,

			// const insert: UserValidation[] = [];
			// insert.push({
			// 	user,
			// 	type: UserValidationType.DOCUMENT,
			// })
			// const documentValidation = new UserValidation();
			// documentValidation.user = user;
			// documentValidation.type = UserValidationType.DOCUMENT;
			// // user.validation.selfie = selfiePath;
			// // user.validation.document = documentPath;
			// // user.validation.document_verse = document_versePath;
			// // await this.userRepo.save(user);

			return ApiResSuccess({
				title: "Sucesso",
				message: "Your files were successfully uploaded"
			});
		} catch (error) {
			console.log(error);
			return ApiResError(1, {
				title: "Erro na solicitação",
				message: "Erro ao enviar documentos, tente novamente mais tarde."
			});
		}
	}
}
