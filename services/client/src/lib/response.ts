export type ConvertResponse = {
	message: string
	version: string
	data: any
	createdAt: number
}

export interface LoginDataResponse {
	email: string
	encrypt_key: string
	user_role: string
	fhir_auth_url: string
}
