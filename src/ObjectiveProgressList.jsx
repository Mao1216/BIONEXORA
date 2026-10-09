import React from 'react';
import { rankedObjectives } from './lib/objectiveViews';

export default function ObjectiveProgressList({ objectives }) {
  const rows = rankedObjectives(objectives);
  if (!rows.length) return <p className="h-80 flex items-center justify-center text-sm text-slate-500">No hay objetivos registrados.</p>;
  return <div role="region" aria-label="Avance por objetivo, ordenado de mayor a menor" tabIndex={0} className="h-80 overflow-y-auto pr-3" style={{ scrollbarGutter: 'stable' }}>
    {rows.map(objective => <div key={objective.id} className="h-20 grid grid-cols-[6rem_minmax(0,1fr)_3rem] sm:grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-3" title={objective.name}>
      <span tabIndex={0} className="group relative cursor-help text-xs text-slate-600" title={objective.name}>{objective.code || 'Sin código'}<span role="tooltip" className="pointer-events-none absolute left-0 bottom-full z-20 mb-2 hidden w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium leading-5 text-white shadow-lg group-hover:block group-focus:block">{objective.name}</span></span>
      <div role="progressbar" aria-label={objective.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={objective.progress} className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-[#D71920]" style={{ width: `${objective.progress}%` }} /></div>
      <span className="text-xs text-slate-600 text-right tabular-nums">{objective.progress}%</span>
    </div>)}
  </div>;
}
