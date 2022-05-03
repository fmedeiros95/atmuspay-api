import { HashMap } from "../map/HashMap";
import { MapObject } from "../map/MapObject";
import { Optional } from "../map/Optional";

export abstract class Map<V> {
	protected inner: MapObject<V>;

	constructor() {
		this.inner = new MapObject();
	}

	public static fromOther<K>(object: Map<K>) {
		const map: Map<K> = new HashMap<K>();
		Object.keys(object.inner).forEach((key) => map.put(key, object[key]));
		return map;
	}

	public debug() {
		console.group("map");

		console.log("size:", this.size());
		console.log(this.inner);

		console.groupEnd();
	}

	public forEach(callback: (key: string, value: V) => void) {
		Object.keys(this.inner).forEach((key) => {
			callback(key, this.inner[key]);
		});
	}

	public forEachKey(callback: (key: string) => void) {
		Object.keys(this.inner).forEach((key) => {
			callback(key);
		});
	}

	public forEachAsync(callback: (key: string, value: V) => void): Promise<Map<V>> {
		return new Promise((resolve, reject) => {
			Object.keys(this.inner).forEach((key) => {
				callback(key, this.inner[key]);
			});
			resolve(this);
		});
	}

	public map<X>(callback: (key: string, value: V) => X) {
		const map: Map<X> = new HashMap();

		Object.keys(this.inner).forEach((key) => {
			map.put(key, callback(key, this.inner[key]));
		});

		return map;
	}

	public mapKeyValue<X>(callback: (key: string, value: V) => { key: string, value: X }) {
		const map: Map<X> = new HashMap();

		Object.keys(this.inner).forEach((key) => {
			const nEntry = callback(key, this.inner[key]);
			map.put(nEntry.key, nEntry.value);
		});

		return map;
	}

	public values(): V[] {
		const arr: V[] = [];

		this.forEach((k, v) => arr.push(v));

		return arr;
	}

	public keys(): string[] {
		return Object.keys(this.inner);
	}

	public getAsObject(): MapObject<V> {
		return this.inner;
	}

	public pure(): any {
		const obj = {};

		Object.keys(this.inner).forEach((key) => {
			obj[key] = this.inner[key];
		});

		return obj;
	}

	public size() {
		return Object.keys(this.inner).length;
	}

	public filter(filterFunc: (key: string, value: V) => boolean) {
		const map: Map<V> = new HashMap();

		Object.keys(this.inner).forEach((key) => {
			if (filterFunc(key, this.inner[key])) {
				map.put(key, this.inner[key]);
			}
		});

		return map;
	}

	public changeIfPresent(key: string, changeFunc: (value: V) => V): Map<V> {
		if (this.inner[key] != undefined) {
			Object.assign(this.inner[key], changeFunc(this.inner[key]));
		}
		return this;
	}

	public changeOrSet(key: string, changeFunc: (value: Optional<V>) => V): Map<V> {
		const value = this.inner[key];
		const opt = changeFunc(Optional.of(value));
		if (opt != undefined) {
			this.inner[key] = opt;
		}
		return this;
	}

	public forEachChange(changeFunc: (value: V) => V): Map<V> {
		this.forEach((key, value) => {
			this.change(key, changeFunc);
		});
		return this;
	}

	public change(key: string, changeFunc: (value: V) => V): Map<V> {
		if (this.inner[key] == undefined) {
			this.inner[key] = changeFunc(undefined);
		} else {
			Object.assign(this.inner[key], changeFunc(this.inner[key]));
		}
		return this;
	}

	public changeWithDefault(key: string, def: V, changeFunc: (value: V) => V): Map<V> {
		if (this.inner[key] == undefined) {
			this.inner[key] = def;
		}
		return this.change(key, changeFunc);
	}

	public assign(object: MapObject<V>): Map<V> {
		Object.keys(object).forEach((key) => {
			if (this.inner[key] == undefined) {
				this.inner[key] = object[key];
			} else {
				Object.assign(this.inner[key], object[key]);
			}
		});
		return this;
	}

	public replace(map: Map<V>): Map<V> {
		this.inner = map.inner;
		return this;
	}

	public get object(): MapObject<V> {
		return this.inner;
	}

	public has(key: string): boolean {
		return this.inner[key] != undefined;
	}

	public abstract put(key: string, value: V): Map<V>;
	public abstract get(key: string): Optional<V>;
	public abstract remove(key: string): Optional<V>;
}
