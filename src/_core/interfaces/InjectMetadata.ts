import { InjectionType } from "../enums/InjectionType";

interface InjectPropMetadata {
	property: string,
	typeName: string,
	type: InjectionType,
	data: any
}

export interface InjectMetadata {
	injections: InjectPropMetadata[]
}
