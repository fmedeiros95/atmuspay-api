import { paramDecoratorator } from "../main/Decorator";

export function RequestParam<T>(name: string): ParameterDecorator {
	return paramDecoratorator("RequestParam", "req", "query", name);
}
