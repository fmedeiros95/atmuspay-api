import { addYears, subYears } from "date-fns";

import { Between } from "typeorm";

// TypeORM Query Operators
export const AfterDate = (date: Date) => Between(date, addYears(date, 100));
export const BeforeDate = (date: Date) => Between(subYears(date, 100), date);
