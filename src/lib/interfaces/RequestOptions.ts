import { HttpStatus } from "../enums/HttpStatus";
import { RequestMethod } from "../enums/RequestMethod";

export interface RequestOptions<T> {
	path?: T,
	method?: RequestMethod,
	errorCode?: HttpStatus,
	authenticated?: boolean,
	isFile?: boolean,
	isDownload?: boolean
}
