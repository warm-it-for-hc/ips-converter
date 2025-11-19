import { useMemo } from 'react'
import type { ReactNode } from 'react'

import type { ConvertResponse } from '@/lib/response'
import { formatDate } from '@/lib/utils'

type ResourceSummaryTableProps = {
	title: string
	columns: string[]
	rows: Array<Array<ReactNode>>
	emptyMessage?: string
}

type FhirResource = Record<string, any>
type FhirResourceType = string | string[]

const ResourceSummaryTable = ({
	title,
	columns,
	rows,
	emptyMessage = 'No data available',
}: ResourceSummaryTableProps) => (
	<div className="bg-white border border-slate-200 rounded-lg shadow-sm">
		<div className="px-4 py-2 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
			{title}
		</div>
		{rows.length > 0 ? (
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-slate-200 text-sm">
					<thead className="bg-slate-100">
						<tr>
							{columns.map(column => (
								<th
									key={column}
									className="px-4 py-2 text-left font-semibold text-slate-600 uppercase tracking-wide text-xs"
								>
									{column}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{rows.map((row, rowIndex) => (
							<tr key={`${title}-${rowIndex}`}>
								{row.map((value, colIndex) => (
									<td key={`${title}-${rowIndex}-${colIndex}`} className="px-4 py-2 text-slate-800 align-top">
										{value ?? '-'}
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

const formatDosage = (dosages?: Array<Record<string, any>>) =>
	dosages
		?.map(dosage =>
			dosage?.text ||
				[
					dosage?.route?.text,
					dosage?.doseAndRate?.[0]?.doseQuantity?.value,
					dosage?.doseAndRate?.[0]?.doseQuantity?.unit,
				]
					.filter(Boolean)
					.join(' '),
		)
		.filter(Boolean)
		.join('; ') ?? ''

type FhirResourceTablesProps = {
	data?: ConvertResponse['data'] | null
}

export const FhirResourceTables = ({ data }: FhirResourceTablesProps) => {
	const patientRows = useMemo(() => {
		const patients = getResourcesByType(data ?? undefined, 'patient')
		return patients.map(patient => {
			const identifiers = formatIdentifiers(patient.identifier)
			const telecom = formatTelecom(patient.telecom)
			const address = formatAddress(patient.address)
			return [
				formatNames(patient.name) || patient.id || '-',
				patient.gender || '-',
				patient.birthDate || '-',
				identifiers || '-',
				telecom || '-',
				address || '-',
			]
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
			const dosage = formatDosage(medication.dosageInstruction || medication.dosage)
			const period =
				formatPeriod(medication.effectivePeriod) ||
				(medication.authoredOn ? formatDate(medication.authoredOn) : '')
			return [
				codingValues.display || textValue || '-',
				codingValues.code || '-',
				codingValues.system || '-',
				codingValues.text || textValue || '-',
				formatSubject(medication.subject),
				medication.status || '-',
				dosage || '-',
				period || '-',
			]
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
			return [
				codingValues.display || condition.code?.text || '-',
				codingValues.code || '-',
				codingValues.system || '-',
				codingValues.text || condition.code?.text || '-',
				category,
				status,
				recordedDate,
				formatSubject(condition.subject),
			]
		})
	}, [data])

	if (!data) return null

	return (
		<div className="space-y-6 my-8">
			<ResourceSummaryTable
				title="Patient"
				columns={['Name', 'Gender', 'Birth Date', 'Identifiers', 'Telecom', 'Address']}
				rows={patientRows}
			/>
			<ResourceSummaryTable
				title="MedicationRequest"
				columns={['Display', 'Code', 'System', 'Text', 'Subject', 'Status', 'Dosage', 'Period']}
				rows={medicationRows}
			/>
			<ResourceSummaryTable
				title="Condition"
				columns={['Display', 'Code', 'System', 'Text', 'Category', 'Status', 'Recorded Date', 'Subject']}
				rows={conditionRows}
			/>
		</div>
	)
}

export default FhirResourceTables
