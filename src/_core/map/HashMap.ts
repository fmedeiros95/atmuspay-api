import { Map } from "../abstracts/Map";
import { MapObject } from "./MapObject";
import { Optional } from "./Optional";

export class HashMap<V> extends Map<V> {
	public static fromObject<K>(object: MapObject<K>) {
		const map: Map<K> = new HashMap<K>();
		Object.keys(object).forEach((key) => map.put(key, object[key]));
		return map;
	}

	public put(key: string, value: V) {
		this.inner[key] = value;
		return this;
	}

	public get(key: string): Optional<V> {
		return Optional.of<V>(this.inner[key]);
	}

	public remove(key: string): Optional<V> {
		const value = this.get(key);
		delete this.inner[key];
		return value;
	}
}
