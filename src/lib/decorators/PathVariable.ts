import { paramDecoratorator } from "../main/Decorator";

export function PathVariable<T>(name: string): ParameterDecorator {
	return paramDecoratorator("PathVariable", "req", "params", name);
}
