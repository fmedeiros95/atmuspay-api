import { Router } from "express";
import { MappingMetadata } from "./MappingMetadata";
import { RequestOptions } from "./RequestOptions";
import { Type } from "./Type";

export interface ControllerMetadata<T> {
	type?: Type<T>,
	app?: Router,
	options?: RequestOptions<string[] | string>,
	mappings: Map<MappingMetadata>,
	params: Map<MappingMetadata>
}
