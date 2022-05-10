import { InjectionType } from "../enums/InjectionType";
import { InjectionMetadata } from "../main/Injection";

export function Persistence(): PropertyDecorator {
	return (target: any, propertyKey: string) => {
		const targetName: string = target.constructor.name;
		const type = Reflect.getMetadata("design:type", target, propertyKey);

		InjectionMetadata.changeWithDefault(targetName, {
			injections: []
		}, (value) => {
			value.injections.push({
				property: propertyKey,
				typeName: type.name,
				type: InjectionType.PERSISTENCE,
				data: { }
			});

			return value;
		});
	};
}
