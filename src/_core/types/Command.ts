import { Command } from "../interfaces/Command";

export type Commands<T> = {
	[P in keyof T]: Command<T[P]>;
};
