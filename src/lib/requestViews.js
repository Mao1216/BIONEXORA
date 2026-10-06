export function requestStatus(status) { return status === 'Pendiente' ? 'En revisión' : status; }

export function requestGroups(requests, history) {
  return requests.filter(request => history ? ['Aprobado', 'Rechazado'].includes(request.status) : request.status === 'Pendiente');
}
