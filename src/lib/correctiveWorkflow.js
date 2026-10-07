import { parseReportPeriod } from './reporting.js';

export const EMPTY_CORRECTIVE_DATA = { analyses: [], actions: [], tasks: [], evidence: [], events: [] };
export const sameId = (a, b) => a != null && b != null && String(a) === String(b);
export function latestMeasurement(reports, indicatorId) {
  return reports.filter(report => sameId(report.indicatorId, indicatorId)).sort((a, b) => (parseReportPeriod(b.period)?.order ?? -1) - (parseReportPeriod(a.period)?.order ?? -1) || String(b.created_at || '').localeCompare(String(a.created_at || '')) || Number(b.id) - Number(a.id))[0];
}
export function attentionIndicators(indicators, reports, analyses) {
  return indicators.flatMap(indicator => {
    const report = latestMeasurement(reports, indicator.id);
    if (report?.status !== 'Fuera de meta') return [];
    const analysis = analyses.find(item => sameId(item.report_id, report.id));
    return [{ indicator, report, analysis, label: analysis ? 'Con análisis de causa' : 'Sin análisis de causa' }];
  });
}
export function taskEditable(task, analysis) {
  return analysis?.status === 'En proceso' && !analysis.approved_at && ['Borrador', 'Observado'].includes(task.review_status);
}
export function taskNotifiable(task, analysis) {
  return taskEditable(task, analysis) && Number(task.progress) === 100;
}
export function efficacyFromFollowup(analysis, origin, reports) {
  if (!analysis.approved_at || analysis.efficacy_decided_by) return { status: analysis.status, report: null };
  const originalOrder = parseReportPeriod(origin.period)?.order;
  const report = reports.filter(item => sameId(item.indicatorId, origin.indicatorId) && parseReportPeriod(item.period)?.order > originalOrder && new Date(item.created_at) >= new Date(analysis.approved_at)).sort((a, b) => parseReportPeriod(a.period).order - parseReportPeriod(b.period).order || Number(a.id) - Number(b.id))[0];
  return { report, status: report ? report.status === 'En meta' ? 'Eficaz' : 'Pendiente de verificación' : 'En proceso' };
}
export function validateEvidence(file) {
  if (!file || file.size < 1 || file.size > 20 * 1024 * 1024) throw new Error('Cada evidencia debe pesar entre 1 byte y 20 MB.');
  return file;
}
