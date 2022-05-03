import { InjectionType } from "../enums/InjectionType";
import { InjectionMetadata } from "../main/Injection";

export function Inject(): PropertyDecorator {
	return (target: any, propertyKey: string) => {
		const targetName: string = target.constructor.name;
		const type = Reflect.getMetadata("design:type", target, propertyKey);
		InjectionMetadata.changeWithDefault(targetName, { injections: [] }, (value) => {
			value.injections.push({
				property: propertyKey,
				typeName: type != undefined ? type.name : undefined,
				type: InjectionType.INJECT,
				data: {}
			});
			return value;
		});
	};
}
