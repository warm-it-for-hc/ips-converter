import CryptoJS from 'crypto-js'
import { DateTime } from 'luxon'

interface CryptDataProps {
	encryptKey: string
	type: string
	avcJson?: string
}

/**
 * 아바타차트 리소스 타입
 */
interface AvcJsonResource {
	patient_info: PatientInfo
	avc_data: AvcData[]
	anatomy_hierarchy: AnatomyHierarchy[]
	observations: Observation[]
	medications: Medication[]
}

/**
 * 환자 정보 타입
 */
interface PatientInfo {
	id: string
	gender: string
	birthDate: string
	name: string
	address: string
	telecom: string
}

/**
 * 아바타차트 데이터 타입
 */
interface AvcData {
	source: AvcDataSource
	body_coordinate: AvcDataBodyCoordinate[]
	origin_info: AvcDataOriginInfo[]
}

interface DashboardData {
	condition: Record<string, AvcData>
	procedure: Record<string, AvcData>
}

/**
 * 아바타차트 - source 타입
 */
interface AvcDataSource {
	resource_type: string
	system: string
	code: string
	opt_disease: number
	vt_code: string
	des_eng: string
	des_kor: string
}

/**
 * 아바타차트 - body coordinate(3D) 타입
 */
interface AvcDataBodyCoordinate
	extends Pick<AvcDataSource, 'resource_type' | 'opt_disease' | 'code'> {
	anatomy_code: string
	anatom_name: string
	gender_div: string
	opt_display: string
	anatomy_name_kr: string
	body_system_code: string
	body_system_code_name_kr: string
	display_code: string
	info_date: string[]
}

/**
 * 아바타차트 - origin info 타입
 */
interface AvcDataOriginInfo {
	id: string
	display: string
	date: string
}

/**
 * 해부학 계층 타입
 */
interface AnatomyHierarchy {
	parentAnatomy_code: string
	anatomy_code: string
}

/**
 * 진검(진단) 데이터 타입
 */
interface Observation {
	observation_date: string
	category_system: string
	category_code: string
	category_display: string
	code_system: string
	code: string
	code_display: string
	component_system: string
	component_code: string
	component_display: string
	value_quantity: number
	value_text: string
	value_unit: string
	reference_high: number
	reference_low: number
}

/**
 * 투약 데이터 타입
 */
interface Medication {
	authored_on_date: string
	medication_code: string
	medication_display: string
	medication_system: string
	expected_supply_duration: string
	dosage_start_date: string
	dosage_end_date: string
	dose_quantity: number
	dose_unit: string
	route: string
	frequency_per_day: number
}

/**
 * 애셋 데이터 타입
 */
interface AssetData {
	asset: Record<string, AssetKey>[]
	asset_background: AssetBackground[]
}

interface AssetKey {
	anatomy_code: string
	asset_code: string
	body_system_code: string
	color_rgb: string
	opt_display: string
	opt_disease: number[]
}

export type AssetBackground = Record<string, unknown>

export const encryptData = ({ encryptKey, type, avcJson }: CryptDataProps) => {
	try {
		const fixedKey = CryptoJS.enc.Utf8.parse(encryptKey.substring(0, 16))
		const iv = CryptoJS.enc.Utf8.parse(encryptKey.substring(0, 16))

		if (type === 'encrypt') {
			/* 암호화 */
			if (!avcJson) return ''

			return CryptoJS.AES.encrypt(avcJson, fixedKey, {
				iv: iv,
				padding: CryptoJS.pad.Pkcs7,
				mode: CryptoJS.mode.CBC,
			}).toString()
		} else {
			/* 복호화 */
			if (!avcJson) return ''

			try {
				const cipher = CryptoJS.AES.decrypt(avcJson, fixedKey, {
					iv: iv,
					padding: CryptoJS.pad.Pkcs7,
					mode: CryptoJS.mode.CBC,
				})

				return JSON.parse(cipher.toString(CryptoJS.enc.Utf8))
			} catch (error) {
				console.error('Encryption Cryptos error:', error)

				return ''
			}
		}
	} catch (error) {
		return ''
	}
}

export const decryptData = ({ encryptKey, type, avcJson }: CryptDataProps) => {
	if (type === 'encrypt') {
		/* 암호화 */
		if (!avcJson) return ''

		return CryptoJS.AES.encrypt(avcJson, encryptKey).toString()
	} else {
		/* 복호화 */
		if (!avcJson) return ''

		try {
			const cipher = CryptoJS.AES.decrypt(
				avcJson,
				CryptoJS.enc.Utf8.parse(encryptKey.substring(0, 16)),
				{
					iv: CryptoJS.enc.Utf8.parse(encryptKey.substring(0, 16)), // [Enter IV (Optional) 지정 방식]
					padding: CryptoJS.pad.Pkcs7,
					mode: CryptoJS.mode.CBC, // [cbc 모드 선택]
				},
			)

			return JSON.parse(cipher.toString(CryptoJS.enc.Utf8))
		} catch (error) {
			console.error('Decryption Cryptos error:', error)
			alert(error)

			return ''
		}
	}
}

export const resourceReclassify = (resource: AvcJsonResource) => {
	const { patient_info, avc_data } = resource

	if (!avc_data) return null

	// Check Point - 코드 분류
	const isIncludedCode = (code: string) => {
		// 0. 코드 분리
		const letters = code.match(/[A-Za-z]+/g)?.join('') || ''
		const numbers = code.match(/\d+(\.\d+)?/g)?.join('') || ''

		// 1. 약물 알레르기(Drug Allergy) 범주
		const allerygyCodeArr = [
			'L23.3',
			'L24.4',
			'L25.1',
			'L27.0',
			'L27.1',
			'L43.2',
			'L56.0',
			'L56.1',
			'T78.2',
			'T78.4',
		]

		// 1-1. (T88.0 ~ T88.9) 숫자 범위 포함 여부
		const isAllergyIncluded =
			allerygyCodeArr.includes(code) ||
			(letters === 'T' && Number(numbers) >= 88.0 && Number(numbers) <= 88.9)

		if (isAllergyIncluded) return true

		// 2. 신장(Kidney) 범주
		// 2-1. (N17.0 ~ N19) 숫자 범위 포함 여부
		const isKidneyIncluded = letters === 'N' && Number(numbers) >= 17.0 && Number(numbers) <= 19.0

		if (isKidneyIncluded) return true

		return false
	}

	// Check Point - 해부학코드 분류
	const isIncludedAnatomyCode = (code: string) => {
		// display_code
		// 심장(XA6H07),  뇌(XA9738), 고혈압(VT_220822_00000053), 당뇨(VT_220822_00000011), 악성종양(VT_220822_00000007), 유전질환(VT_220822_00000046)
		const keyInfoAnatomyArr = [
			'XA6H07',
			'XA9738',
			'VT_220822_00000053',
			'VT_220822_00000011',
			'VT_220822_00000007',
			'VT_220822_00000046',
		]
		const isCheckAnatomy = keyInfoAnatomyArr.includes(code)

		if (isCheckAnatomy) return true

		return false
	}

	/**
	 * 선택한 연도에 따른 날짜 범위 계산
	 * @param value 선택한 연도의 value
	 * @param minDate 최소 날짜(시작일)
	 * @param maxDate 최대 날짜(종료일))
	 * @returns
	 */
	const getDateRange = (minDate: string | null, maxDate: string | null) => {
		if (!minDate || !maxDate) {
			const now = DateTime.now()

			return {
				min_date: now.toFormat('yyyy-MM-dd').toString(),
				max_date: now.toFormat('yyyy-MM-dd').toString(),
			}
		}

		return {
			min_date: DateTime.fromFormat(minDate, 'yyyy-MM-dd').toString(),
			max_date: DateTime.fromFormat(maxDate, 'yyyy-MM-dd').toString(),
		}
	}

	/**
	 * OriginInfo과 선택한 연도로 날짜 범위 유효한지 검증
	 * @param originInfo 원본 정보 배열
	 * @param year 선택한 연도
	 * @param latestDate 최근 날짜
	 * @returns
	 */
	const isCheckIncludeDate = (originInfo: AvcDataOriginInfo[], latestDate: string) => {
		// 기준 날짜 (선택한 연도만큼 이전)
		const beforeDate = DateTime.now().minus({ year: 5 })

		// 배열 필터링
		return !!originInfo.filter(item => {
			const targetDate = DateTime.fromFormat(item.date, 'yyyy-MM-dd')
			const now = latestDate
				? DateTime.fromFormat(latestDate, 'yyyy-MM-dd')
				: DateTime.now().toFormat('yyyy-MM-dd')

			return targetDate > beforeDate && targetDate <= now
		}).length
	}

	// 수술 데이터
	const surgeries: Record<string, unknown> = {}
	// 기타 절차 데이터
	const otherProcedures: Record<string, unknown> = {}
	const anatomyCodes: Record<string, AvcDataBodyCoordinate[]> = {}
	const displayCodes: Record<string, AvcDataBodyCoordinate[]> = {}
	const checkPoints: AvcData[] = []
	const assetDatas: AssetData = {
		asset: [],
		asset_background: [],
	}
	const assetDisplayText: AvcDataBodyCoordinate[] = []
	const assetDisplayIcon: AvcDataBodyCoordinate[] = []
	const resourceDatetimes = []
	const trashData: AvcData[] = []

	// 가장 오래된 날짜
	let earliestDate: AvcDataOriginInfo | null = null

	// 가장 최신 날짜
	const latestDate = avc_data.reduce((latest: AvcDataOriginInfo | null, item: AvcData) => {
		const infoDate = item.origin_info.map(current => current.date)

		item.body_coordinate.map(_item => {
			_item.info_date = [...infoDate]
		})

		item.origin_info.map(current => {
			// 1️⃣ arr_resource_datetimes에 추가
			resourceDatetimes.push(current)

			const currentDate = DateTime.fromFormat(current.date, 'yyyy-MM-dd')

			// 2️⃣ 최신 날짜 갱신
			if (!latest || currentDate > DateTime.fromFormat(latest.date, 'yyyy-MM-dd')) {
				latest = current
			}

			// 3️⃣ 가장 오래된 날짜 갱신
			if (!earliestDate || currentDate < DateTime.fromFormat(earliestDate.date, 'yyyy-MM-dd')) {
				earliestDate = current
			}
		})

		return latest
	}, null)

	// 진단/수술 데이터 추출
	const newAvcData = avc_data.reduce((acc: Record<string, unknown>, cur: AvcData) => {
		const { source, origin_info } = cur

		if (!latestDate) return acc

		const isIncludeDate = isCheckIncludeDate(origin_info, latestDate.date)

		const key = source.resource_type.toLowerCase()

		if (isIncludeDate) {
			if (!acc[key]) acc[key] = {}

			if (!source.vt_code) {
				trashData.push({ ...cur })
			} else {
				;(acc[key] as Record<string, unknown>)[source.vt_code] = { ...cur }
			}
		}

		return acc
	}, {})

	const dashboardData: Record<string, Record<string, unknown>> = {
		condition: { ...(newAvcData.condition || {}) },
		procedure: { ...(newAvcData.procedure || {}) },
	}

	const mergeDashboardData = [
		...Object.values(newAvcData.condition || {}),
		...Object.values(newAvcData.procedure || {}),
	] as AvcData[]

	// 1. code를 Key로 맵핑 분류 (중복제거)
	mergeDashboardData.map(item => {
		const { resource_type, code, opt_disease } = item.source

		const isSelectedCode = [] as boolean[]
		const isSelectedAnatomyCode = [] as boolean[]

		item.body_coordinate.map((bc: AvcDataBodyCoordinate) => {
			const { anatomy_code, display_code } = bc

			// map_anatomy_code
			if (!anatomyCodes[anatomy_code]) anatomyCodes[anatomy_code] = []

			anatomyCodes[anatomy_code].push({ ...bc, resource_type, code, opt_disease })

			// map_display_code
			if (!displayCodes[display_code]) displayCodes[display_code] = []

			displayCodes[display_code].push({ ...bc, resource_type, code, opt_disease })

			// map_check_point
			isSelectedCode.push(isIncludedCode(code))
			isSelectedAnatomyCode.push(isIncludedAnatomyCode(display_code))
		})

		if (isSelectedCode.includes(true) || isSelectedAnatomyCode.includes(true)) {
			checkPoints.push({ ...item })
		}
	})

	Object.entries(dashboardData.procedure).forEach(([key, value]) => {
		const newValue = value as AvcData

		if (newValue.source.opt_disease === 25) {
			surgeries[key] = value
		} else {
			otherProcedures[key] = value
		}
	})

	const bodyRegion = Object.entries(anatomyCodes)
		.map(([anatomyCode, dataList]) => {
			const newDataList = dataList as AvcDataBodyCoordinate[]
			// const sortedList = newDataList.sort((a, b) => b.opt_disease - a.opt_disease)
			const genderApproach =
				newDataList[0].gender_div === 'Y' ? (patient_info.gender === 'male' ? '_M' : '_F') : ''

			const isAsset = dataList[0].opt_display === '1' || dataList[0].opt_display === '2'
			const isAssetIcon = dataList[0].opt_display === '3'
			const isAssetText = dataList[0].opt_display === '4'

			if (isAsset) {
				assetDatas.asset.push({
					assetKey: {
						anatomy_code: anatomyCode,
						asset_code: `${dataList[0].display_code}${genderApproach}`,
						body_system_code: dataList[0].body_system_code,
						color_rgb: '',
						opt_display: dataList[0].opt_display,
						opt_disease: [...newDataList.map(d => d.opt_disease)],
					},
				})
			}

			if (isAssetIcon) {
				assetDisplayIcon.push({ ...dataList[0] })
			}

			if (isAssetText) {
				assetDisplayText.push({ ...dataList[0] })
			}

			return {
				anatomy_code: anatomyCode,
				anatomy_name: dataList[0].anatom_name,
				display_code: dataList[0].display_code,
				data_list: dataList.sort((a, b) => b.opt_disease - a.opt_disease),
			}
		})
		.sort((a, b) => b.data_list[0].opt_disease - a.data_list[0].opt_disease)

	const responseData = {
		patient: patient_info,
		key_info: checkPoints,
		conditions: newAvcData.condition,
		surgeries,
		other_procedures: otherProcedures,
		body_region: bodyRegion,
		assets: assetDatas,
		asset_display_text: assetDisplayText,
		asset_display_icon: assetDisplayIcon,
		list: { ...(newAvcData.condition || {}), ...surgeries },
		trash: trashData,
		date_range: getDateRange(
			earliestDate && (earliestDate as AvcDataOriginInfo).date
				? (earliestDate as AvcDataOriginInfo).date
				: null,
			latestDate && (latestDate as AvcDataOriginInfo).date
				? (latestDate as AvcDataOriginInfo).date
				: null,
		),
	}

	return { ...responseData }
}

export const severityColors = (selectedDisease: number) => {
	switch (selectedDisease) {
		case 0:
			return {
				rgb: '183,183,183',
				hex: '#B7B7B7',
			}
		case 10:
			return {
				rgb: '29,219,22',
				hex: '#1DDB16',
			}
		case 20:
			return {
				rgb: '245,186,65',
				hex: '#F5BA41',
			}
		case 25:
			return {
				rgb: '0,123,255',
				hex: '#007BFF',
			}
		case 30:
			return {
				rgb: '243,134,70',
				hex: '#F38646',
			}
		case 40:
			return {
				rgb: '202,96,162',
				hex: '#CA60A2',
			}
		case 50:
			return {
				rgb: '244,36,36',
				hex: '#FF2424',
			}
		default:
			return {
				rgb: '255,255,255',
				hex: '#FFFFFF',
			}
	}
}
