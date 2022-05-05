export interface UserUpdate {
	code_2fa?: string;
	address?: {
		city: string,
		complement: string,
		country: string,
		district: string,
		ibge_code?: string,
		number: string,
		state: string,
		street: string,
		zip_code?: string
	}
}
