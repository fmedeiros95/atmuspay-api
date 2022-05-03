import { Type } from "../interfaces/Type";
import { addToInjectionChain } from "../main/Injection";
import { TypeDecorator } from "../types/TypeDecorator";

export function Helper(): TypeDecorator {
	return (target: Type<any> | any) => {
		addToInjectionChain(target);
		return target;
	};
}
