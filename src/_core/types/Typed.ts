import { Observable } from "rxjs";

export type TypedCallback<T> = (value: T) => void;
export type TypedFunction<T> = () => T;

export declare type TypedMethodDecorator<T> = (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void;
export declare type TypedObservableMethod<T> = (...args: any[]) => Observable<T>;
export declare type TypedPromiseMethod<T> = (...args: any[]) => Promise<T>;
