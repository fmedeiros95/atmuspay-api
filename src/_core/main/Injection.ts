import { Map } from "../abstracts/Map";
import { InjectionType } from "../enums/InjectionType";
import { Type } from "../interfaces/Type";
import { InjectMetadata } from "../interfaces/InjectMetadata";
import { HashMap } from "../map/HashMap";
import { AppDataSource } from "./Server";

export const InjectionChain: Map<any> = new HashMap<any>();
export const InjectionMetadata: Map<InjectMetadata> = new HashMap<InjectMetadata>();

export function getInjectionChain() {
	return InjectionChain;
}

export function getInjectionMetadata() {
	return InjectionMetadata;
}

export function addToInjectionChain<T>(type: Type<T>, ...args: any[]) {
	InjectionChain.put(type.name, getOrCreateInstance(type, ...args));
}

export function getFromInjectionChainByName<T>(name: string): T {
	return InjectionChain.get(name).get();
}

export function getFromInjectionChain<T>(type: Type<T>): T {
	return getFromInjectionChainByName(type.name);
}

export function processInjectionChain() {
	InjectionChain.forEachKey((key) => {
		InjectionChain.change(key, (value) => {
			const targetName: string = value.constructor.name;
			InjectionMetadata.get(targetName).ifPresent((meta) => {
				meta.injections.forEach((inject) => {
					Object.defineProperty(value, inject.property, {
						get: () => {
							switch (inject.type) {
								case InjectionType.INJECT: return InjectionChain.get(inject.typeName).get();
								case InjectionType.REPOSITORY: return AppDataSource.getRepository(inject.data.name);
								case InjectionType.PERSISTENCE: return AppDataSource;
							}
						}
					});
				});
			});
			return value;
		});
	});

	InjectionChain.forEach((key, value) => {
		onInit(value);
	});
}

function onInit(instance: any) {
	if (instance.onInit instanceof Function) {
		instance.onInit();
	}
}

function getOrCreateInstance<T>(type: Type<T>, ...args: any[]): T {
	return InjectionChain.get(type.name).getOrDefault(new type());
}
