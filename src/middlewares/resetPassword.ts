import { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../_core/enums/HttpStatus";
import { AppDataSource } from "../_core/main/Server";
import { User } from "../entity/User";

export const resetPassword = (req: Request, res: Response, next: NextFunction) => {
	next();
};
