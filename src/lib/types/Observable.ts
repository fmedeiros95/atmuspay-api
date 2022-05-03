import { Observable } from "rxjs";
import { TypedMethodDecorator, TypedObservableMethod } from "./Typed";

export declare type ObservableMethod = (...args: any[]) => Observable<any>;
export declare type ObservableMethodDecorator<T> = TypedMethodDecorator<TypedObservableMethod<T>>;
