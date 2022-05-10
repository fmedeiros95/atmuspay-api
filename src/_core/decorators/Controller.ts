import { RequestMethod } from "../enums/RequestMethod";
import { MappingMetadata } from "../interfaces/Mapping";
import { RequestOptions } from "../interfaces/RequestOptions";
import { Type } from "../interfaces/Type";
import { addToInjectionChain } from "../main/Injection";
import { ServerMetadata } from "../main/Server";
import { HashMap } from "../map/HashMap";
import { TypeDecorator } from "../types/TypeDecorator";

const getDefaultOptions = <T>(path: T): RequestOptions<T> => ({
	path: path,
	method: RequestMethod.GET,
	errorCode: 422,
	middlewares: []
});

export function Controller(options?: RequestOptions<string[]>): TypeDecorator {
	return (target: Type<any>) => {
		const target_name = target.name;
		addToInjectionChain(target);
		ServerMetadata.changeWithDefault(target_name, {
			mappings: new HashMap<MappingMetadata>(),
			params: new HashMap<MappingMetadata>()
		}, (value) => {
			value.options = Object.assign(getDefaultOptions(["/"]), options);
			value.type = target;

			return value;
		});

		return target;
	};
}
