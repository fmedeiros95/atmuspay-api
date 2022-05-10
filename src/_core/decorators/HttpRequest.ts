import { paramDecoratorator } from "../main/Decorator";

export function HttpRequest(): ParameterDecorator {
	return paramDecoratorator("HttpRequest", "req");
}
