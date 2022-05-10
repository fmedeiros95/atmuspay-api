import { Type } from "../interfaces/Type";
import { InjectionType } from "../enums/InjectionType";
import { InjectionMetadata } from "../main/Injection";

export function InjectRepository(name: string | Type<any>): PropertyDecorator {
	return (target: any, propertyKey: string) => {
		const targetName: string = target.constructor.name;
		const type = Reflect.getMetadata("design:type", target, propertyKey);
		InjectionMetadata.changeWithDefault(targetName, {
			injections: []
		}, (value) => {
			value.injections.push({
				property: propertyKey,
				typeName: type != undefined ? type.name : undefined,
				type: InjectionType.REPOSITORY,
				data: { name }
			});

			return value;
		});
	};
}
