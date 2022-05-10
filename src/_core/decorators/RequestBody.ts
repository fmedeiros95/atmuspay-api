import { paramDecoratorator } from "../main/Decorator";

export function RequestBody<T>(): ParameterDecorator {
	return paramDecoratorator("RequestBody", "req", "body");
}
