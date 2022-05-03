import { MappingMetadata } from "../interfaces/Mapping";
import { HashMap } from "../map/HashMap";
import { ServerMetadata } from "./Server";

export function paramDecoratorator<T>(decorator: string, ...path: string[]) {
	return (target: Object, propertyKey: string, parameterIndex: number) => {
		const target_name = target.constructor.name;
		const type = Reflect.getMetadata("design:paramtypes", target, propertyKey)[parameterIndex];
		ServerMetadata.changeWithDefault(target_name, {
			mappings: new HashMap<MappingMetadata>(),
			params: new HashMap<MappingMetadata>()
		}, (value) => {
			value.mappings.changeWithDefault(propertyKey, {
				property: propertyKey,
				parameters: []
			}, (prop) => {
				prop.parameters.push({
					index: parameterIndex,
					path: path,
					type: type,
					decorator: decorator
				});

				return prop;
			});

			return value;
		});
	};
}
