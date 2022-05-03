import { TypedMethodDecorator, TypedPromiseMethod } from "./Typed";

export declare type PromiseMethod = (...args: any[]) => Promise<any>;
export declare type PromiseMethodDecorator<T> = TypedMethodDecorator<TypedPromiseMethod<T>>;
