import { useMemo } from 'react'
import type { ReactNode } from 'react'

import type { ConvertResponse } from '@/lib/response'
import { formatDate } from '@/lib/utils'

type ColumnDefinition = {
	key: string
	label: string
}

type ResourceSummaryTableProps = {
	title: string
	columns: ColumnDefinition[]
	rows: Array<Record<string, ReactNode>>
	emptyMessage?: string
	visibleKeys?: string[]
}

type FhirResource = Record<string, any>
type FhirResourceType = string | string[]

const ResourceSummaryTable = ({
	title,
	columns,
	rows,
	emptyMessage = 'No data available',
	visibleKeys,
}: ResourceSummaryTableProps) => {
	const renderColumns = useMemo(() => {
		if (!visibleKeys?.length) return columns
		return columns.filter(column => visibleKeys.includes(column.key))
	}, [columns, visibleKeys])

	return (
		<div className="bg-white border border-slate-200 rounded-lg shadow-sm">
			<div className="px-4 py-2 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
				{title}
			</div>
			{rows.length > 0 && renderColumns.length > 0 ? (
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-200 text-sm">
						<thead className="bg-slate-100">
							<tr>
								{renderColumns.map(column => (
									<th
										key={`${title}-${column.key}`}
										className="px-4 py-2 text-left font-semibold text-slate-600 uppercase tracking-wide text-xs whitespace-nowrap"
									>
										{column.label}
									</th>
								))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{rows.map((row, rowIndex) => (
							<tr key={`${title}-${rowIndex}`}>
								{renderColumns.map(column => (
									<td key={`${title}-${rowIndex}-${column.key}`} className="px-4 py-2 text-slate-800 align-top whitespace-nowrap">
										{row[column.key] ?? '-'}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		) : (
			<div className="px-4 py-6 text-sm text-slate-500">{emptyMessage}</div>
		)}
		</div>
	)
}

const getResourcesByType = (data: ConvertResponse['data'] | undefined, types: FhirResourceType): FhirResource[] => {
	const resourceTypes = (Array.isArray(types) ? types : [types]).map(type => type.toLowerCase())
	const entries = (data as any)?.entry
	if (!Array.isArray(entries)) return []

	return entries
		.map(entry => (entry?.resource ?? entry) as FhirResource)
		.filter(resource =>
			resource?.resourceType
				? resourceTypes.includes(String(resource.resourceType).toLowerCase())
				: false,
		)
}

const toArray = <T,>(value?: T[] | T) => (Array.isArray(value) ? value : value ? [value] : [])

const joinValues = (values: Array<string | undefined>) => values.filter(Boolean).join(', ')

const extractCodingValues = (concept?: Record<string, any>) => {
	const codings = toArray(concept?.coding)
	const displays = codings.map(coding => coding?.display).filter(Boolean)
	const codes = codings.map(coding => coding?.code).filter(Boolean)
	const systems = codings.map(coding => coding?.system).filter(Boolean)
	const texts = codings.map(coding => coding?.text).filter(Boolean)
	const conceptText = concept?.text ? [concept.text] : []

	return {
		display: joinValues(displays) || joinValues(conceptText) || joinValues(codes) || joinValues(systems),
		code: joinValues(codes),
		system: joinValues(systems),
		text: joinValues([...conceptText, ...texts]),
	}
}

const formatCoding = (coding?: Array<Record<string, any>> | Record<string, any>) =>
	joinValues(
		toArray(coding).map(item => {
			const display = item?.display || item?.text
			if (display && item?.code && display !== item.code) {
				return `${display} (${item.code})`
			}
			return display || item?.code || item?.system
		}),
	)

const formatIdentifiers = (identifiers?: Array<Record<string, any>>) =>
	identifiers
		?.map(identifier => {
			const label = formatCoding(identifier?.type?.coding)
			return [label, identifier?.value].filter(Boolean).join(': ')
		})
		.filter(Boolean)
		.join(', ') ?? ''

const formatTelecom = (telecom?: Array<Record<string, any>>) =>
	telecom
		?.map(contact => [contact?.system?.toUpperCase(), contact?.value].filter(Boolean).join(': '))
		.filter(Boolean)
		.join(', ') ?? ''

const joinLines = (value?: string[] | string) => (Array.isArray(value) ? value.join(' ') : value || '')

const formatAddress = (addresses?: Array<Record<string, any>>) =>
	addresses
		?.map(address =>
			address?.text ||
				[
					joinLines(address?.line),
					address?.city,
					address?.state,
					address?.postalCode,
				]
					.filter(Boolean)
					.join(', '),
		)
		.filter(Boolean)
		.join('; ') ?? ''

const formatPeriod = (period?: Record<string, any>) => {
	if (!period) return ''
	const start = period.start ? formatDate(period.start) : ''
	const end = period.end ? formatDate(period.end) : ''
	if (!start && !end) return ''
	return [start, end].filter(Boolean).join(' → ')
}

const formatSubject = (subject?: Record<string, any>) =>
	subject?.resource?.name?.[0]?.text || subject?.display || subject?.reference || '-'

const formatNames = (names?: Array<Record<string, any>>) =>
	names
		?.map(name => {
			if (name?.text) return name.text
			const given = joinLines(name?.given)
			return [given, name?.family].filter(Boolean).join(' ')
		})
		.filter(Boolean)
		.join(', ') ?? ''

const formatCategories = (categories?: Array<Record<string, any>>) =>
	categories
		?.map(category => formatCoding(category?.coding) || category?.text)
		.filter(Boolean)
		.join(', ') ?? ''

const formatTiming = (dosages?: Array<Record<string, any>>) =>
	dosages
		?.map(dosage => {
			const repeat = dosage?.timing?.repeat
			if (!repeat) return null
			const frequency = repeat.frequency ? `${repeat.frequency}x` : ''
			const period = repeat.period ? `${repeat.period}${repeat.periodUnit ?? ''}` : ''
			return [frequency, period].filter(Boolean).join(' / ')
		})
		.filter(Boolean)
		.join('; ') ?? ''

const formatRoute = (dosages?: Array<Record<string, any>>) =>
	dosages
		?.map(dosage => {
			const route = dosage?.route
			if (!route) return null
			const codingDisplay = formatCoding(route.coding)
			return route?.text || codingDisplay
		})
		.filter(Boolean)
		.join('; ') ?? ''

const formatDoseQuantity = (dosages?: Array<Record<string, any>>) =>
	dosages
		?.map(dosage => {
			const quantity = dosage?.doseAndRate?.[0]?.doseQuantity
			if (!quantity) return null
			return [quantity.value, quantity.unit].filter(Boolean).join(' ')
		})
		.filter(Boolean)
		.join('; ') ?? ''

type FhirResourceTablesProps = {
	data?: ConvertResponse['data'] | null
	columnConfig?: Partial<Record<'patient' | 'medication' | 'condition', string[]>>
}

const patientColumns: ColumnDefinition[] = [
	{ key: 'name', label: 'Name' },
	{ key: 'gender', label: 'Gender' },
	{ key: 'birthDate', label: 'Birth Date' },
	{ key: 'identifiers', label: 'Identifiers' },
	{ key: 'telecom', label: 'Telecom' },
	{ key: 'address', label: 'Address' },
]

const conditionColumns: ColumnDefinition[] = [
	{ key: 'text', label: 'Text' },
	{ key: 'display', label: 'Display' },
	{ key: 'code', label: 'Code' },
	{ key: 'system', label: 'System' },
	{ key: 'category', label: 'Category' },
	{ key: 'status', label: 'Status' },
	{ key: 'recordedDate', label: 'Recorded Date' },
	// { key: 'subject', label: 'Subject' },
]

const medicationColumns: ColumnDefinition[] = [
	{ key: 'text', label: 'Text' },
	{ key: 'display', label: 'Display' },
	{ key: 'code', label: 'Code' },
	{ key: 'system', label: 'System' },
	{ key: 'timing', label: 'Timing' },
	{ key: 'route', label: 'Route' },
	{ key: 'dose', label: 'Dose' },
	// { key: 'subject', label: 'Subject' },
	// { key: 'status', label: 'Status' },
	{ key: 'period', label: 'authoredOn' },
]


export const FhirResourceTables = ({ data, columnConfig }: FhirResourceTablesProps) => {
	const patientRows = useMemo(() => {
		const patients = getResourcesByType(data ?? undefined, 'patient')
		return patients.map(patient => {
			const identifiers = formatIdentifiers(patient.identifier)
			const telecom = formatTelecom(patient.telecom)
			const address = formatAddress(patient.address)
			return {
				name: formatNames(patient.name) || patient.id || '-',
				gender: patient.gender || '-',
				birthDate: patient.birthDate || '-',
				identifiers: identifiers || '-',
				telecom: telecom || '-',
				address: address || '-',
			}
		})
	}, [data])

	const medicationRows = useMemo(() => {
		const medicationTypes = ['medicationstatement', 'medicationrequest', 'medication']
		const medications = getResourcesByType(data ?? undefined, medicationTypes)
		return medications.map(medication => {
			const concept =
				medication.medicationCodeableConcept || medication.code || medication.medicationCodeableConcept
			const codingValues = extractCodingValues(concept)
			const textValue = concept?.text || medication.medicationReference?.display || medication.name || ''
			const dosageInstructions = medication.dosageInstruction || medication.dosage
			const timing = formatTiming(dosageInstructions)
			const route = formatRoute(dosageInstructions)
			const dose = formatDoseQuantity(dosageInstructions)
			const period =
				formatPeriod(medication.effectivePeriod) ||
				(medication.authoredOn ? formatDate(medication.authoredOn) : '')
			return {
				display: codingValues.display || textValue || '-',
				code: codingValues.code || '-',
				system: codingValues.system || '-',
				text: codingValues.text || textValue || '-',
				timing: timing || '-',
				route: route || '-',
				dose: dose || '-',
				subject: formatSubject(medication.subject),
				status: medication.status || '-',
				period: period || '-',
			}
		})
	}, [data])

	const conditionRows = useMemo(() => {
		const conditions = getResourcesByType(data ?? undefined, 'condition')
		return conditions.map(condition => {
			const codingValues = extractCodingValues(condition.code)
			const status =
				formatCoding(condition.clinicalStatus?.coding) || condition.clinicalStatus?.text || '-'
			const category = formatCategories(condition.category) || '-'
			const recordedDate = condition.recordedDate ? formatDate(condition.recordedDate) : '-'
			return {
				display: codingValues.display || condition.code?.text || '-',
				code: codingValues.code || '-',
				system: codingValues.system || '-',
				text: codingValues.text || condition.code?.text || '-',
				category,
				status,
				recordedDate,
				subject: formatSubject(condition.subject),
			}
		})
	}, [data])

	if (!data) return null

	return (
		<div className="space-y-6 my-8">
			<ResourceSummaryTable
				title="Patient"
				columns={patientColumns}
				rows={patientRows}
				visibleKeys={columnConfig?.patient}
			/>
			<ResourceSummaryTable
				title="MedicationRequest / Medication"
				columns={medicationColumns}
				rows={medicationRows}
				visibleKeys={columnConfig?.medication}
			/>
			<ResourceSummaryTable
				title="Condition"
				columns={conditionColumns}
				rows={conditionRows}
				visibleKeys={columnConfig?.condition}
			/>
		</div>
	)
}

export default FhirResourceTables
