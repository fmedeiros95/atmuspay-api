import { RequestOptions } from "./RequestOptions";
import { Type } from "./Type";

export interface MappingMetadata {
	options?: RequestOptions<string>,
	property: string,
	returnType?: Type<any>,
	returnTypeName?: string,
	parameters: MappingParameter[]
}

export interface MappingParameter {
	index: number,
	path: string[],
	type: Type<any>,
	decorator: string
}
