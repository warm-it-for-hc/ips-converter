import { decryptData, encryptData, resourceReclassify, severityColors } from '@/lib/avatar'
import type { ConvertResponse, LoginDataResponse } from '@/lib/response'

const AVATAR_AUTH_URL =
	'https://www.vis-term.com/avatar_web_gateway_operate/api-avc/v1/auth/user/signin'
const AVATAR_CONVERTER_URL =
	'https://www.vis-term.com/avatar_web_gateway_operate/api-avc/v1/fhir/avc-data-converter-pcp'

const AUTH_CREDENTIALS = {
	email: 'ips001@ips001.com',
	password: 'ips001',
}

const isSerializable = (payload: unknown) => {
	try {
		JSON.parse(JSON.stringify(payload))
		return true
	} catch (error) {
		return false
	}
}

const buildAssetData = (assets: Record<string, unknown>) =>
	Object.fromEntries(
		Object.entries(assets).map(([key, value]) => {
			if (!Array.isArray(value) || value.length === 0) {
				return [key, value]
			}

			const filtered = (value as Array<any>)
				.filter(
					item => Array.isArray(item?.assetKey?.opt_disease) && item.assetKey.opt_disease.length > 0,
				)
				.map(item => {
					const asset = item.assetKey
					const severity = Math.max(...(asset.opt_disease as number[]))
					const colorRgb = severityColors(severity)

					return {
						assetKey: {
							anatomy_code: asset.anatomy_code,
							asset_code: asset.asset_code,
							body_system_code: asset.body_system_code,
							color_rgb: colorRgb.rgb,
							opt_display: asset.opt_display,
						},
					}
				})

			return [key, filtered]
		}),
	)

const buildEncryptedAssetPayload = (encryptKey: string, conversionResult: string) => {
	const decrypted = decryptData({
		encryptKey,
		type: 'decrypt',
		avcJson: conversionResult,
	})

	if (!decrypted) return null

	const reclassifiedData = resourceReclassify(decrypted)
	if (!reclassifiedData?.assets) return null

	return encryptData({
		encryptKey,
		type: 'encrypt',
		avcJson: JSON.stringify([buildAssetData(reclassifiedData.assets)]),
	})
}

const authenticateUser = async () => {
	const response = await fetch(AVATAR_AUTH_URL, {
		method: 'POST',
		body: JSON.stringify(AUTH_CREDENTIALS),
		headers: { 'Content-Type': 'application/json' },
	})

	if (!response.ok) {
		throw new Error('Avatar authentication failed')
	}

	const responseJson = await response.json()
	const token = response.headers.get('Authorization')
	const results = JSON.parse(responseJson.results) as LoginDataResponse

	if (!token || !results?.encrypt_key) {
		throw new Error('Avatar authentication missing credentials')
	}

	return { token, encryptKey: results.encrypt_key }
}

const requestFhirConversion = async (payload: ConvertResponse['data']) => {
	const response = await fetch(AVATAR_CONVERTER_URL, {
		method: 'POST',
		body: JSON.stringify(payload),
		headers: { 'Content-Type': 'application/json' },
	})

	if (!response.ok) {
		throw new Error('Failed to convert FHIR payload to AVC data')
	}

	return response.json() as Promise<{ results: string }>
}

export type AvatarAssetPayload = {
	token: string
	encryptKey: string
	encryptedAsset: string
}

export class AvatarSyncError extends Error {
	constructor(public code: AvatarSyncErrorCode, message?: string) {
		super(message ?? code)
	}
}

export type AvatarSyncErrorCode =
	| 'invalid-payload'
	| 'missing-conversion-result'
	| 'encryption-failed'
	| 'unknown'

export const buildAvatarAssetPayload = async (
	payload: ConvertResponse['data'],
): Promise<AvatarAssetPayload> => {
	if (!isSerializable(payload)) {
		throw new AvatarSyncError('invalid-payload')
	}

	try {
		const { token, encryptKey } = await authenticateUser()
		const conversionResponse = await requestFhirConversion(payload)

		if (!conversionResponse?.results) {
			throw new AvatarSyncError('missing-conversion-result')
		}

		const encryptedAsset = buildEncryptedAssetPayload(encryptKey, conversionResponse.results)
		if (!encryptedAsset) {
			throw new AvatarSyncError('encryption-failed')
		}

		return { token, encryptKey, encryptedAsset }
	} catch (error) {
		if (error instanceof AvatarSyncError) {
			throw error
		}
		throw new AvatarSyncError('unknown', error instanceof Error ? error.message : undefined)
	}
}

export const postAvatarAssetToFrame = (
	iframe: HTMLIFrameElement | null,
	avatarUrl: string,
	assetPayload: AvatarAssetPayload,
) => {
	if (!iframe) {
		throw new AvatarSyncError('unknown', 'Avatar frame not available')
	}

	iframe.contentWindow?.postMessage(
		JSON.stringify({
			domain: 'asset-web',
			msg: 'assetObj request!',
			data: {
				asset: assetPayload.encryptedAsset,
				encrypt_key: assetPayload.encryptKey,
			},
		}),
		avatarUrl,
	)
}

export { isSerializable }
