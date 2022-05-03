interface IApiResMessage {
	title: string;
	message: string;
}

export const ApiResError = (messageCode: number, message: IApiResMessage): Promise<never> => {
	return Promise.reject({
		messageCode,
		message
	});
};

export const ApiResSuccess = (message: IApiResMessage, data?: any): Promise<any> => {
	return Promise.resolve({
		...data,
		messageCode: 0,
		message
	});
};
