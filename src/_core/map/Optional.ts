export class Optional<V> {
	private value: V;

	public static of<T>(value: T): Optional<T> {
		return new Optional<T>(value);
	}

	public static empty<T>(): Optional<T> {
		return new Optional(undefined);
	}

	constructor(value: V) {
		this.value = value;
	}

	public get() {
		return this.value;
	}

	public getOrDefault(def: V) {
		return this.value != undefined ? this.value : def;
	}

	public ifPresent(callback: (value: V) => void): Optional<V> {
		if (this.value != undefined) {
			callback(this.value);
		}
		return this;
	}

	public getCopy(): V {
		return Object.assign({}, this.value);
	}

	public ifNotPresent(callback: () => void) {
		if (this.value == undefined) {
			callback();
		}
		return this;
	}

	public then(callback: (value: V) => void): Optional<V> {
		return this.ifPresent(callback);
	}
}
