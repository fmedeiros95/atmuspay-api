export interface Command<T> {
	default: T,
	alias: string[]
}
