import { HttpStatus } from "../enums/HttpStatus";
import { RequestMethod } from "../enums/RequestMethod";

export interface RequestOptions<T> {
	path?: T,
	method?: RequestMethod,
	errorCode?: HttpStatus,
	middlewares?: any[],
	isFile?: boolean,
	isDownload?: boolean
}
