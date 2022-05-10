import { paramDecoratorator } from "../main/Decorator";

export function HttpResponse(): ParameterDecorator {
	return paramDecoratorator("HttpResponse", "res");
}
