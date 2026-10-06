export function activeObjectives(objectives, now = new Date()) {
  const year = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Lima', year: 'numeric' }).format(now));
  return objectives.filter(objective => {
    const start = Number(objective.validityStartYear ?? objective.validity_start_year) || Number(String(objective.createdDate || objective.created_date || objective.created_at || '').slice(0, 4)) || year;
    const end = Number(objective.validityEndYear ?? objective.validity_end_year) || Number(String(objective.targetDate || objective.target_date || '').slice(0, 4)) || year;
    return start <= year && end >= year;
  });
}
