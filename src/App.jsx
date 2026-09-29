import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Target, FolderKanban, TrendingUp, FileText, Settings, User, Plus, 
  ChevronRight, AlertCircle, CheckCircle2, Clock, ArrowRight, BarChart3, Calendar, Users, Briefcase, Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const MOCK_USERS = [
  { id: 1, name: 'Carlos Mendoza', role: 'Gerente General', avatar: 'CM' },
  { id: 2, name: 'Ana Silva', role: 'Gerente de Operaciones', avatar: 'AS' },
  { id: 3, name: 'Luis Rojas', role: 'Jefe de Producción', avatar: 'LR' },
];

const INITIAL_OBJECTIVES = [
  { id: 1, name: 'Incrementar la eficiencia operativa', description: 'Mejorar el desempeño operacional mediante reducción de tiempos improductivos y optimización de recursos.', category: 'Procesos Internos', ownerId: 2, progress: 78, status: 'En progreso', targetDate: '2026-12-31' },
  { id: 2, name: 'Mejorar la satisfacción del cliente', description: 'Aumentar el NPS y reducir el tiempo de respuesta a incidencias en un 30%.', category: 'Clientes', ownerId: 1, progress: 92, status: 'Cumplido', targetDate: '2026-10-15' },
  { id: 3, name: 'Fortalecer la transformación digital', description: 'Implementar el nuevo ERP y migrar el 80% de los procesos manuales a la nube.', category: 'Innovación', ownerId: 2, progress: 45, status: 'En riesgo', targetDate: '2027-03-30' }
];

const INITIAL_PROJECTS = [
  { id: 1, objectiveId: 1, name: 'Optimización de línea ensamblaje', status: 'En progreso', progress: 60, ownerId: 3, source: 'Creado en aplicación' },
  { id: 2, objectiveId: 1, name: 'Mantenimiento preventivo 2.0', status: 'Completado', progress: 100, ownerId: 3, source: 'Jira' },
  { id: 3, objectiveId: 2, name: 'Nuevo portal de soporte', status: 'En riesgo', progress: 30, ownerId: 1, source: 'Microsoft Planner' },
];

const INITIAL_TASKS = [
  { id: 1, projectId: 1, name: 'Auditoría de tiempos', status: 'Completado', dueDate: '2026-08-15' },
  { id: 2, projectId: 1, name: 'Compra de sensores IoT', status: 'En progreso', dueDate: '2026-10-01' },
];

const INITIAL_INDICATORS = [
  { id: 1, objectiveId: 1, name: 'Cumplimiento del plan de producción', resource: 'Reportes diarios del sistema MES', formula: '(Unidades producidas / Unidades planificadas) × 100', target: 95, unit: '%', comparator: '>=', frequency: 'Mensual', ownerId: 3, status: 'En riesgo' },
  { id: 2, objectiveId: 1, name: 'Reducción de merma', resource: 'Reporte de calidad', formula: '(Kg merma / Kg total procesado) × 100', target: 5, unit: '%', comparator: '<=', frequency: 'Semanal', ownerId: 3, status: 'Cumplido' }
];

const INITIAL_REPORTS = [
  { id: 1, indicatorId: 1, period: 'Julio 2026', result: 94, status: 'En riesgo', date: '2026-07-31', obs: 'Retraso de materia prima.' },
  { id: 2, indicatorId: 1, period: 'Agosto 2026', result: 97, status: 'Cumplido', date: '2026-08-31', obs: 'Operación normal.' },
  { id: 3, indicatorId: 1, period: 'Septiembre 2026', result: 92, status: 'En riesgo', date: '2026-09-30', obs: 'Paradas no programadas en semana 2.' },
  { id: 4, indicatorId: 2, period: 'Agosto 2026', result: 4.2, status: 'Cumplido', date: '2026-08-31', obs: '' },
  { id: 5, indicatorId: 2, period: 'Septiembre 2026', result: 4.8, status: 'Cumplido', date: '2026-09-30', obs: '' },
];

const calculateIndicatorStatus = (result, target, comparator) => {
  const res = parseFloat(result);
  const tgt = parseFloat(target);
  let isSuccess = false;
  switch (comparator) {
    case '>': isSuccess = res > tgt; break;
    case '>=': isSuccess = res >= tgt; break;
    case '=': isSuccess = res === tgt; break;
    case '<=': isSuccess = res <= tgt; break;
    case '<': isSuccess = res < tgt; break;
    default: isSuccess = false;
  }
  return isSuccess ? 'Cumplido' : 'En riesgo'; 
};

const getStatusColor = (status) => {
  switch(status?.toLowerCase()) {
    case 'cumplido':
    case 'completado': return 'bg-green-100 text-green-700 border-green-200';
    case 'en riesgo': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'no cumplido': 
    case 'retrasado': return 'bg-red-100 text-red-700 border-red-200';
    case 'en progreso': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getStatusIcon = (status, className="w-4 h-4") => {
  switch(status?.toLowerCase()) {
    case 'cumplido': return <CheckCircle2 className={`${className} text-green-600`} />;
    case 'en riesgo': return <AlertCircle className={`${className} text-yellow-600`} />;
    case 'en progreso': return <Activity className={`${className} text-blue-600`} />;
    default: return <Clock className={`${className} text-slate-400`} />;
  }
};

const Card = ({ children, className = "", onClick = null }) => (
  <div onClick={onClick} className={`bg-white rounded-xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''} ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, status }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 w-fit ${getStatusColor(status)}`}>
    {getStatusIcon(status, "w-3 h-3")}
    {children}
  </span>
);

const Button = ({ children, variant = 'primary', className = "", ...props }) => {
  const variants = {
    primary: "bg-[#1D4ED8] hover:bg-[#1e40af] text-white shadow-sm",
    secondary: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600"
  };
  return (
    <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Input = ({ label, className = "", ...props }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <input className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-shadow text-sm text-slate-900" {...props} />
  </div>
);

const Select = ({ label, options, className = "", ...props }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <select className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-shadow text-sm text-slate-900" {...props}>
      <option value="">Seleccionar...</option>
      {options.map((opt, i) => (
        <option key={i} value={opt.value || opt}>{opt.label || opt}</option>
      ))}
    </select>
  </div>
);

const ProgressBar = ({ progress, status }) => {
  let color = 'bg-[#3B82F6]';
  if (status === 'Cumplido') color = 'bg-green-500';
  if (status === 'En riesgo') color = 'bg-yellow-500';
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${progress}%` }}></div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [navHistory, setNavHistory] = useState([{ id: 'dashboard', name: 'Inicio' }]);
  
  const [objectives, setObjectives] = useState(INITIAL_OBJECTIVES);
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [indicators, setIndicators] = useState(INITIAL_INDICATORS);
  const [reports, setReports] = useState(INITIAL_REPORTS);
  
  const [selectedObjectiveId, setSelectedObjectiveId] = useState(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState(null);

  const navigateTo = (view, name, params = {}) => {
    setCurrentView(view);
    if (params.objectiveId) setSelectedObjectiveId(params.objectiveId);
    if (params.indicatorId) setSelectedIndicatorId(params.indicatorId);
    if (view === 'dashboard') {
      setNavHistory([{ id: 'dashboard', name: 'Inicio' }]);
    } else {
      let newHistory = [...navHistory];
      if (newHistory.length > 3) newHistory = [newHistory[0]];
      newHistory.push({ id: view, name });
      setNavHistory(newHistory);
    }
  };

  const DashboardView = () => {
    const activeObs = objectives.filter(o => o.status === 'En progreso').length;
    const riskObs = objectives.filter(o => o.status === 'En riesgo').length;
    const doneObs = objectives.filter(o => o.status === 'Cumplido').length;
    const riskInds = indicators.filter(i => i.status === 'En riesgo');

    return (
      <div className="space-y-8 fade-in">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Buenos días, Carlos</h1>
            <p className="text-slate-500 mt-1">Aquí está el resumen estratégico de tu organización.</p>
          </div>
          <Button onClick={() => navigateTo('new-objective', 'Nuevo Objetivo')} className="hidden sm:flex">
            <Plus className="w-4 h-4" /> Nuevo Objetivo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-l-4 border-l-[#3B82F6]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Objetivos Activos</p>
                <h3 className="text-3xl font-bold text-slate-900">{activeObs}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg"><Target className="w-5 h-5 text-blue-600" /></div>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-yellow-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Obj. en Riesgo</p>
                <h3 className="text-3xl font-bold text-slate-900">{riskObs}</h3>
              </div>
              <div className="p-2 bg-yellow-50 rounded-lg"><AlertCircle className="w-5 h-5 text-yellow-600" /></div>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Obj. Cumplidos</p>
                <h3 className="text-3xl font-bold text-slate-900">{doneObs}</h3>
              </div>
              <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-[#14B8A6]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Proyectos Activos</p>
                <h3 className="text-3xl font-bold text-slate-900">{projects.length}</h3>
              </div>
              <div className="p-2 bg-teal-50 rounded-lg"><FolderKanban className="w-5 h-5 text-teal-600" /></div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[#0F172A]">Objetivos Estratégicos</h2>
              <button onClick={() => navigateTo('objectives', 'Objetivos')} className="text-sm text-[#1D4ED8] hover:underline font-medium flex items-center gap-1">
                Ver todos <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid gap-4">
              {objectives.map(obj => {
                const owner = MOCK_USERS.find(u => u.id === obj.ownerId);
                const objProjects = projects.filter(p => p.objectiveId === obj.id);
                const objIndicators = indicators.filter(i => i.objectiveId === obj.id);
                
                return (
                  <Card key={obj.id} className="p-5 hover:-translate-y-0.5 transition-transform duration-200 group" onClick={() => navigateTo('objective-detail', obj.name, { objectiveId: obj.id })}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge status={obj.status}>{obj.status}</Badge>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3"/> Meta: {obj.targetDate}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-[#1D4ED8] transition-colors">{obj.name}</h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">{obj.description}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-slate-700">Avance</span>
                        <span className="font-bold text-slate-900">{obj.progress}%</span>
                      </div>
                      <ProgressBar progress={obj.progress} status={obj.status} />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5" title="Proyectos"><FolderKanban className="w-4 h-4 text-slate-400" /> {objProjects.length}</div>
                        <div className="flex items-center gap-1.5" title="Indicadores"><BarChart3 className="w-4 h-4 text-slate-400" /> {objIndicators.length}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600" title={owner?.name}>{owner?.avatar}</div>
                        <span className="text-xs text-slate-500 hidden sm:inline">{owner?.name}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Requiere tu atención
            </h2>
            <Card className="p-0 border-yellow-200 shadow-sm">
              <div className="divide-y divide-slate-100">
                {riskInds.length > 0 ? (
                  riskInds.map(ind => {
                    const obj = objectives.find(o => o.id === ind.objectiveId);
                    const latestReport = reports.filter(r => r.indicatorId === ind.id).sort((a,b) => new Date(b.date) - new Date(a.date))[0];
                    return (
                      <div key={ind.id} className="p-4 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigateTo('indicator-detail', ind.name, { indicatorId: ind.id, objectiveId: obj.id })}>
                        <p className="text-xs text-slate-500 mb-1 truncate">{obj?.name}</p>
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">{ind.name}</h4>
                        <div className="flex justify-between items-center text-sm">
                          <div><span className="text-slate-500 block text-xs">Resultado</span><span className="font-bold text-red-600">{latestReport?.result || '-'} {ind.unit}</span></div>
                          <div className="text-right"><span className="text-slate-500 block text-xs">Meta</span><span className="font-medium text-slate-700">{ind.comparator} {ind.target} {ind.unit}</span></div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-8 text-center text-slate-500 text-sm">No hay indicadores en riesgo. ¡Buen trabajo!</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const ObjectiveFormView = () => {
    const [formData, setFormData] = useState({ name: '', description: '', category: '', ownerId: '', targetDate: '' });

    const handleSubmit = (e) => {
      e.preventDefault();
      const newObj = { id: Date.now(), ...formData, ownerId: parseInt(formData.ownerId), progress: 0, status: 'No iniciado' };
      setObjectives([...objectives, newObj]);
      navigateTo('dashboard', 'Inicio');
    };

    return (
      <div className="max-w-2xl mx-auto fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0F172A]">Nuevo objetivo estratégico</h1>
          <p className="text-slate-500">Define claramente la meta que la organización busca alcanzar.</p>
        </div>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Nombre del objetivo *" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Descripción</label>
              <textarea className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] min-h-[100px] text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Select label="Perspectiva / Categoría *" required options={['Financiera', 'Clientes', 'Procesos Internos', 'Aprendizaje y Crecimiento', 'Innovación']} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              <Select label="Responsable principal *" required options={MOCK_USERS.map(u => ({ value: u.id, label: u.name }))} value={formData.ownerId} onChange={e => setFormData({...formData, ownerId: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               <Input label="Fecha objetivo *" type="date" required value={formData.targetDate} onChange={e => setFormData({...formData, targetDate: e.target.value})} />
            </div>
            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => navigateTo('dashboard', 'Inicio')}>Cancelar</Button>
              <Button type="submit">Crear objetivo</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  };

  const ObjectiveDetailView = () => {
    const obj = objectives.find(o => o.id === selectedObjectiveId);
    if (!obj) return null;
    const owner = MOCK_USERS.find(u => u.id === obj.ownerId);
    const objProjects = projects.filter(p => p.objectiveId === obj.id);
    const objIndicators = indicators.filter(i => i.objectiveId === obj.id);
    const [activeTab, setActiveTab] = useState('summary');

    return (
      <div className="fade-in space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f0f9ff] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none opacity-60"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge status={obj.status}>{obj.status}</Badge>
                  <span className="text-sm font-medium text-[#14B8A6] uppercase tracking-wider">{obj.category}</span>
                </div>
                <h1 className="text-2xl font-bold text-[#0F172A]">{obj.name}</h1>
                <p className="text-slate-500 mt-1 max-w-3xl">{obj.description}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-bold text-[#1D4ED8]">{obj.progress}%</div>
                <p className="text-sm text-slate-500 font-medium">Avance general</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-slate-100">
              <div><p className="text-xs text-slate-400 mb-1">Responsable</p><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-600">{owner?.avatar}</div><span className="text-sm font-medium text-slate-900">{owner?.name}</span></div></div>
              <div><p className="text-xs text-slate-400 mb-1">Fecha objetivo</p><p className="text-sm font-medium text-slate-900 flex items-center gap-1"><Calendar className="w-4 h-4 text-slate-400" /> {obj.targetDate}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Proyectos activos</p><p className="text-sm font-medium text-slate-900">{objProjects.length}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Indicadores medidos</p><p className="text-sm font-medium text-slate-900">{objIndicators.length}</p></div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex space-x-8">
            {[ { id: 'summary', label: 'Resumen', icon: Activity }, { id: 'projects', label: 'Proyectos y Tareas', icon: FolderKanban }, { id: 'indicators', label: 'Indicadores', icon: BarChart3 }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#1D4ED8] text-[#1D4ED8]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="py-4">
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <Card className="p-5">
                 <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><FolderKanban className="w-5 h-5 text-slate-400"/> Estado de Proyectos</h3>
                 {objProjects.length === 0 ? <p className="text-sm text-slate-500 italic">No hay proyectos vinculados.</p> : (
                   <div className="space-y-4">
                     {objProjects.map(p => (
                       <div key={p.id}>
                         <div className="flex justify-between text-sm mb-1"><span className="font-medium text-slate-700 truncate">{p.name}</span><span className="text-slate-500">{p.progress}%</span></div>
                         <ProgressBar progress={p.progress} status={p.status} />
                       </div>
                     ))}
                   </div>
                 )}
               </Card>
               <Card className="p-5">
                 <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-slate-400"/> Indicadores Clave</h3>
                 {objIndicators.length === 0 ? <p className="text-sm text-slate-500 italic">No hay indicadores definidos.</p> : (
                   <div className="space-y-3">
                     {objIndicators.map(ind => {
                        const latest = reports.filter(r => r.indicatorId === ind.id).sort((a,b) => new Date(b.date) - new Date(a.date))[0];
                        return (
                          <div key={ind.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div><p className="text-sm font-medium text-slate-800">{ind.name}</p><p className="text-xs text-slate-500 mt-0.5">Meta: {ind.comparator} {ind.target} {ind.unit}</p></div>
                            <div className="text-right"><Badge status={ind.status}>{ind.status}</Badge><p className="text-xs font-bold mt-1 text-slate-700">Actual: {latest?.result || '-'} {ind.unit}</p></div>
                          </div> 
                        )
                     })}
                   </div>
                 )}
               </Card>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-900">Proyectos Vinculados</h3>
                <Button variant="secondary" className="text-xs py-1.5"><Plus className="w-4 h-4"/> Añadir Proyecto</Button>
              </div>
              {objProjects.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-300 rounded-xl"><FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-600 font-medium">Este objetivo no tiene proyectos.</p><Button variant="secondary" className="mt-4 mx-auto"><Plus className="w-4 h-4"/> Vincular Proyecto</Button></div>
              ) : (
                <div className="grid gap-4">
                  {objProjects.map(p => {
                    const pTasks = tasks.filter(t => t.projectId === p.id);
                    return (
                      <Card key={p.id} className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div><h4 className="font-semibold text-slate-900">{p.name}</h4><p className="text-xs text-slate-500 flex items-center gap-1 mt-1">Origen: <span className="font-medium">{p.source}</span></p></div>
                          <Badge status={p.status}>{p.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mt-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1"><span>Avance del proyecto</span><span className="font-medium">{p.progress}%</span></div>
                            <ProgressBar progress={p.progress} status={p.status} />
                          </div>
                          <div className="w-24 text-right pt-4"><span className="font-medium text-slate-900">{pTasks.length}</span> Tareas</div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'indicators' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-900">Indicadores Estratégicos</h3>
                <Button onClick={() => navigateTo('new-indicator', 'Nuevo Indicador', { objectiveId: obj.id })} className="text-xs py-1.5"><Plus className="w-4 h-4"/> Crear Indicador</Button>
              </div>
              {objIndicators.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-300 rounded-xl"><BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-600 font-medium">Aún no hay indicadores para medir este objetivo.</p><Button onClick={() => navigateTo('new-indicator', 'Nuevo Indicador', { objectiveId: obj.id })} variant="secondary" className="mt-4 mx-auto"><Plus className="w-4 h-4"/> Definir primer indicador</Button></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {objIndicators.map(ind => {
                    const latest = reports.filter(r => r.indicatorId === ind.id).sort((a,b) => new Date(b.date) - new Date(a.date))[0];
                    return (
                      <Card key={ind.id} className="p-5 flex flex-col h-full" onClick={() => navigateTo('indicator-detail', ind.name, { indicatorId: ind.id, objectiveId: obj.id })}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="pr-4"><h4 className="font-semibold text-slate-900 hover:text-[#1D4ED8] transition-colors">{ind.name}</h4><p className="text-xs text-slate-500 mt-1">Frecuencia: {ind.frequency}</p></div>
                          <Badge status={ind.status}>{ind.status}</Badge>
                        </div>
                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between">
                          <div><p className="text-xs text-slate-400 mb-1">Último resultado</p><p className="text-2xl font-bold text-slate-900">{latest?.result || '-'} <span className="text-sm font-medium text-slate-500">{ind.unit}</span></p></div>
                          <div className="text-right"><p className="text-xs text-slate-400 mb-1">Meta</p><p className="text-sm font-medium text-slate-700">{ind.comparator} {ind.target} {ind.unit}</p></div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const IndicatorFormView = () => {
    const obj = objectives.find(o => o.id === selectedObjectiveId);
    const [formData, setFormData] = useState({ name: '', resource: '', formula: '', target: '', unit: '%', comparator: '>=', frequency: 'Mensual', ownerId: '' });

    const handleSubmit = (e) => {
      e.preventDefault();
      const newInd = { id: Date.now(), objectiveId: selectedObjectiveId, ...formData, target: parseFloat(formData.target), status: 'Sin reporte' };
      setIndicators([...indicators, newInd]);
      navigateTo('objective-detail', obj?.name || 'Objetivo', { objectiveId: selectedObjectiveId });
    };

    return (
      <div className="max-w-3xl mx-auto fade-in">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2"><span>Objetivo</span> <ChevronRight className="w-3 h-3" /> <span className="font-medium text-slate-900 truncate max-w-[300px]">{obj?.name}</span></div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Nuevo indicador estratégico</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-[#1D4ED8] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">1. Información General</h3>
            <div className="space-y-4">
              <Input label="Nombre del indicador *" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-slate-700">Fuente de datos / Recurso</label><textarea className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-sm" rows={2} value={formData.resource} onChange={e => setFormData({...formData, resource: e.target.value})} /></div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-bold text-[#1D4ED8] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">2. Medición</h3>
            <div className="space-y-4">
              <Input label="Fórmula (Opcional)" value={formData.formula} onChange={e => setFormData({...formData, formula: e.target.value})} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <Select label="Comparador *" required options={[ {value: '>=', label: 'Mayor o igual (>=)'}, {value: '>', label: 'Mayor (>)'}, {value: '<=', label: 'Menor o igual (<=)'}, {value: '<', label: 'Menor (<)'}, {value: '=', label: 'Igual (=)'} ]} value={formData.comparator} onChange={e => setFormData({...formData, comparator: e.target.value})} />
                <Input label="Meta *" type="number" step="0.01" required value={formData.target} onChange={e => setFormData({...formData, target: e.target.value})} />
                <Select label="Unidad *" required options={['%', 'Número', 'Soles', 'Dólares', 'Horas', 'Días', 'Ratio']} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-bold text-[#1D4ED8] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">3. Gestión</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Select label="Frecuencia de revisión *" required options={['Diaria', 'Semanal', 'Mensual', 'Trimestral', 'Semestral', 'Anual']} value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} />
              <Select label="Responsable del reporte *" required options={MOCK_USERS.map(u => ({ value: u.id, label: u.name }))} value={formData.ownerId} onChange={e => setFormData({...formData, ownerId: e.target.value})} />
            </div>
          </Card>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigateTo('objective-detail', obj?.name, { objectiveId: selectedObjectiveId })}>Cancelar</Button>
            <Button type="submit">Guardar Indicador</Button>
          </div>
        </form>
      </div>
    );
  };

  const IndicatorDetailView = () => {
    const ind = indicators.find(i => i.id === selectedIndicatorId);
    const obj = objectives.find(o => o.id === ind?.objectiveId);
    if (!ind) return null;
    const indReports = reports.filter(r => r.indicatorId === ind.id).sort((a,b) => new Date(a.date) - new Date(b.date));
    const latestReport = indReports[indReports.length - 1];
    const chartData = indReports.map(r => ({ name: r.period.split(' ')[0], Resultado: parseFloat(r.result), Meta: ind.target }));

    return (
      <div className="fade-in space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span className="cursor-pointer hover:text-[#1D4ED8]" onClick={() => navigateTo('objective-detail', obj?.name, { objectiveId: obj?.id })}>Objetivo</span> <ChevronRight className="w-3 h-3" /> <span className="font-medium text-slate-900">Indicador</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-2">
            <h1 className="text-2xl font-bold text-[#0F172A]">{ind.name}</h1>
            <p className="text-sm text-slate-500">Mide el avance del objetivo: <span className="font-medium text-slate-700">{obj?.name}</span></p>
            <div className="flex gap-4 mt-4 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200 inline-flex">
              <div><span className="font-medium">Fórmula:</span> {ind.formula || 'N/A'}</div>
              <div className="w-px bg-slate-200"></div>
              <div><span className="font-medium">Frecuencia:</span> {ind.frequency}</div>
            </div>
          </div>
          <Card className={`p-6 flex flex-col justify-center items-center text-center border-t-4 ${latestReport?.status === 'Cumplido' ? 'border-t-green-500' : latestReport?.status === 'En riesgo' ? 'border-t-yellow-500' : 'border-t-slate-300'}`}>
             <p className="text-sm font-medium text-slate-500 mb-2">Resultado Actual</p>
             <div className="text-4xl font-bold text-slate-900 mb-2">{latestReport?.result || '-'} <span className="text-xl text-slate-500 font-normal">{ind.unit}</span></div>
             <Badge status={latestReport?.status || 'Sin reporte'}>{latestReport?.status || 'Sin reporte'}</Badge>
             <p className="text-xs text-slate-400 mt-3">Meta esperada: {ind.comparator} {ind.target}</p>
          </Card>
        </div>
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-slate-900">Tendencia Histórica</h3>
            <Button onClick={() => navigateTo('report-indicator', 'Registrar Resultado', { indicatorId: ind.id })} variant="secondary" className="text-sm"><Plus className="w-4 h-4"/> Registrar Resultado</Button>
          </div>
          {chartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <ReferenceLine y={ind.target} label={{ position: 'top', value: 'Meta', fill: '#94a3b8', fontSize: 12 }} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="Resultado" stroke="#1D4ED8" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic bg-slate-50 rounded-lg">No hay suficientes datos para generar el gráfico.</div>
          )}
        </Card>
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-slate-200"><h3 className="font-semibold text-slate-900">Historial de Mediciones</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr><th className="px-6 py-3">Periodo</th><th className="px-6 py-3">Fecha Reporte</th><th className="px-6 py-3">Resultado</th><th className="px-6 py-3">Estado</th><th className="px-6 py-3">Observaciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {indReports.length === 0 && <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Aún no existen resultados registrados para este indicador.</td></tr>}
                {[...indReports].reverse().map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{r.period}</td>
                    <td className="px-6 py-4 text-slate-500">{r.date}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{r.result} {ind.unit}</td>
                    <td className="px-6 py-4"><Badge status={r.status}>{r.status}</Badge></td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={r.obs}>{r.obs || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const ReportFormView = () => {
    const ind = indicators.find(i => i.id === selectedIndicatorId);
    const [formData, setFormData] = useState({ period: '', date: new Date().toISOString().split('T')[0], result: '', obs: '' });

    const handleSubmit = (e) => {
      e.preventDefault();
      const calcStatus = calculateIndicatorStatus(formData.result, ind.target, ind.comparator);
      const newReport = { id: Date.now(), indicatorId: ind.id, period: formData.period, date: formData.date, result: parseFloat(formData.result), obs: formData.obs, status: calcStatus };
      setReports([...reports, newReport]);
      setIndicators(indicators.map(i => i.id === ind.id ? { ...i, status: calcStatus } : i));
      navigateTo('indicator-detail', ind.name, { indicatorId: ind.id });
    };

    return (
      <div className="max-w-xl mx-auto fade-in">
         <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#0F172A]">Registrar Resultado</h1>
          <p className="text-slate-500 mt-1">{ind?.name}</p>
        </div>
        <Card className="p-6">
          <div className="bg-slate-50 p-4 rounded-lg mb-6 flex justify-between items-center border border-slate-200">
             <div><p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Meta a cumplir</p><p className="text-lg font-bold text-[#1D4ED8]">{ind?.comparator} {ind?.target} {ind?.unit}</p></div>
             <div className="text-right"><p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Frecuencia</p><p className="text-sm font-medium text-slate-700">{ind?.frequency}</p></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Periodo *" placeholder="Ej. Septiembre 2026" required value={formData.period} onChange={e => setFormData({...formData, period: e.target.value})} />
              <Input label="Fecha de medición *" type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="relative">
              <Input label={`Resultado obtenido (${ind?.unit}) *`} type="number" step="0.01" required className="text-lg" value={formData.result} onChange={e => setFormData({...formData, result: e.target.value})} />
              {formData.result && <div className="absolute right-3 top-9"><Badge status={calculateIndicatorStatus(formData.result, ind.target, ind.comparator)}>{calculateIndicatorStatus(formData.result, ind.target, ind.comparator)}</Badge></div>}
            </div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-slate-700">Observaciones (Opcional)</label><textarea className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-sm" rows={3} value={formData.obs} onChange={e => setFormData({...formData, obs: e.target.value})} /></div>
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => navigateTo('indicator-detail', ind.name, { indicatorId: ind.id })}>Cancelar</Button>
              <Button type="submit">Guardar Registro</Button>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      <aside className="w-64 bg-[#0F172A] text-slate-300 flex-col hidden md:flex fixed h-full z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight"><div className="w-8 h-8 bg-gradient-to-br from-[#1D4ED8] to-[#14B8A6] rounded-lg flex items-center justify-center shadow-lg"><span className="text-white">S</span></div>STRATEGIA</div>
        </div>
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="px-4 space-y-1">
            <button onClick={() => navigateTo('dashboard', 'Inicio')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-[#1e293b] text-white' : 'hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard className="w-5 h-5" /> Inicio</button>
            <div className="pt-4 pb-1"><p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestión Estratégica</p></div>
            <button onClick={() => navigateTo('objectives', 'Objetivos')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${(currentView.includes('objective') && currentView !== 'dashboard') ? 'bg-[#1e293b] text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Target className="w-5 h-5" /> Objetivos</button>
            <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white opacity-50 cursor-not-allowed`}><FolderKanban className="w-5 h-5" /> Proyectos y Tareas</button>
            <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white opacity-50 cursor-not-allowed`}><TrendingUp className="w-5 h-5" /> Indicadores</button>
            <div className="pt-4 pb-1"><p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Análisis</p></div>
            <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white opacity-50 cursor-not-allowed`}><FileText className="w-5 h-5" /> Reportes</button>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2"><div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white">CM</div><div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-white truncate">Carlos Mendoza</p><p className="text-xs text-slate-500 truncate">Gerente General</p></div><Settings className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" /></div>
        </div>
      </aside>
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-10 shadow-sm">
           <div className="flex items-center text-sm text-slate-500 font-medium">
             {navHistory.map((nav, idx) => (
               <React.Fragment key={idx}>
                 <span className={`cursor-pointer transition-colors ${idx === navHistory.length - 1 ? 'text-[#0F172A] font-semibold pointer-events-none' : 'hover:text-[#1D4ED8]'}`} onClick={() => { if(nav.id === 'dashboard') navigateTo('dashboard', 'Inicio'); }}>{nav.name}</span>
                 {idx < navHistory.length - 1 && <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />}
               </React.Fragment>
             ))}
           </div>
        </header>
        <div className="p-6 md:p-8 flex-1">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'objectives' && <DashboardView />}
          {currentView === 'new-objective' && <ObjectiveFormView />}
          {currentView === 'objective-detail' && <ObjectiveDetailView />}
          {currentView === 'new-indicator' && <IndicatorFormView />}
          {currentView === 'indicator-detail' && <IndicatorDetailView />}
          {currentView === 'report-indicator' && <ReportFormView />}
        </div>
      </main>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 z-50">
        <button onClick={() => navigateTo('dashboard', 'Inicio')} className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-[#1D4ED8]' : 'text-slate-500'}`}><LayoutDashboard className="w-5 h-5" /><span className="text-[10px] font-medium">Inicio</span></button>
        <button onClick={() => navigateTo('new-objective', 'Nuevo Objetivo')} className="flex flex-col items-center gap-1 text-[#1D4ED8]"><div className="bg-blue-50 p-2 rounded-full mb-[-10px] translate-y-[-10px] border shadow-sm"><Plus className="w-5 h-5" /></div><span className="text-[10px] font-medium">Nuevo</span></button>
        <button className="flex flex-col items-center gap-1 text-slate-500 opacity-50"><User className="w-5 h-5" /><span className="text-[10px] font-medium">Perfil</span></button>
      </div>
    </div>
  );
}
