import { parseReportPeriod } from './reporting.js';

export function reportedProgress(indicators, reports) {
  const reportedIds = new Set(reports.map(report => String(report.indicatorId)));
  const reported = indicators.filter(indicator => reportedIds.has(String(indicator.id))).length;
  return { reported, total: indicators.length, progress: indicators.length ? Math.round(reported * 100 / indicators.length) : 0 };
}

export function measurementSeries(reports) {
  return [...reports].sort((a, b) => (parseReportPeriod(a.period)?.order || 0) - (parseReportPeriod(b.period)?.order || 0) || String(a.created_at || '').localeCompare(String(b.created_at || '')) || Number(a.id) - Number(b.id))
    .map(report => ({ period: report.period.replace(',', ' '), resultado: Number(report.result), meta: report.measurement_target == null ? null : Number(report.measurement_target) }));
}

export function measurementTicks(data, target) {
  const values = [Number(target), ...data.flatMap(row => [row.resultado, row.meta])].filter(value => value !== null && Number.isFinite(value));
  const low = Math.min(0, ...values);
  const high = Math.max(1, ...values);
  const span = high - low;
  return [...new Set([low, low + span / 4, low + span / 2, low + span * 3 / 4, high, ...data.map(row => row.meta), Number(target)].filter(value => value !== null && Number.isFinite(value)).map(value => Number(value.toFixed(4))))].sort((a, b) => a - b);
}

const MONTH_ABBREVIATIONS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function weightedMeasurementValue(reports, year, referenceYear = new Date().getFullYear()) {
  const rows = reports
    .map(report => ({ report, period: parseReportPeriod(report.period) }))
    .filter(item => item.period && (!year || item.period.year === String(year)) && Number.isFinite(Number(item.report.result)))
    .sort((a, b) => a.period.order - b.period.order);
  if (!rows.length) return { value: null, label: 'Valor ponderado', count: 0 };

  const value = rows.reduce((sum, item) => sum + Number(item.report.result), 0) / rows.length;
  const firstMonth = rows[0].period.order % 12;
  const lastMonth = rows.at(-1).period.order % 12;
  const measuredYear = Number(rows[0].period.year);
  const completeYear = new Set(rows.map(item => item.period.order % 12)).size === 12;
  const label = completeYear && measuredYear < referenceYear
    ? `Valor del año ${measuredYear}`
    : `Valor ponderado ${MONTH_ABBREVIATIONS[firstMonth]} - ${MONTH_ABBREVIATIONS[lastMonth]} ${measuredYear}`;
  return { value, label, count: rows.length };
}

const normalizeSearch = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function filterIndicators(indicators, { search = '', objectiveId = '', responsibleId = '' }) {
  const query = normalizeSearch(search);
  return indicators.filter(indicator => {
    const searchable = normalizeSearch(`${indicator.code || ''} ${indicator.name || ''}`);
    const responsible = indicator.ownerId || indicator.owner_email || indicator.reporter_email || '';
    return searchable.includes(query)
      && (!objectiveId || String(indicator.objectiveId) === String(objectiveId))
      && (!responsibleId || String(responsible) === String(responsibleId));
  });
}

export function creationYear(entity) {
  return entity.created_at ? new Intl.DateTimeFormat('en', { timeZone: 'America/Lima', year: 'numeric' }).format(new Date(entity.created_at)) : '';
}
