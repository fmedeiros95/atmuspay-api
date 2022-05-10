import { MappingMetadata } from "../interfaces/Mapping";
import { RequestOptions } from "../interfaces/RequestOptions";
import { ServerMetadata } from "../main/Server";
import { HashMap } from "../map/HashMap";

export function Method(options?: RequestOptions<string>): MethodDecorator {
	return <T>(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<T>) => {
		const target_name = target.constructor.name;
		const returnType = Reflect.getMetadata("design:returntype", target, propertyKey);
		ServerMetadata.changeWithDefault(target_name, {
			mappings: new HashMap<MappingMetadata>(),
			params: new HashMap<MappingMetadata>()
		}, (value) => {
			value.mappings.changeWithDefault(propertyKey, {
				property: propertyKey,
				parameters: []
			}, (propValue) => {
				propValue.property = propertyKey;
				propValue.options = Object.assign({ path: "" }, options);
				propValue.returnType = returnType;
				propValue.returnTypeName = returnType != undefined ? returnType.prototype.constructor.name : undefined;

				return propValue;
			});

			return value;
		});

		return descriptor;
	};
}
