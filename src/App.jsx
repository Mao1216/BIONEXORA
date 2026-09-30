import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Target, FolderKanban, Settings, User, Plus, 
  ChevronRight, AlertCircle, CheckCircle2, Clock, ArrowRight, ArrowLeft, BarChart3, Calendar, Users, Activity, LogOut
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import biomontLogo from './assets/biomont-logo.png';
import { supabase } from './lib/supabase';

const ROLE_LABELS = {
  gerente_general: 'Gerente general',
  gerente_responsable: 'Gerente responsable',
  gcg: 'GCG',
  super_admin: 'Super admin',
};

const toObjective = (row) => ({ ...row, ownerId: row.owner_email, createdDate: row.created_date, targetDate: row.target_date, validityStartYear: row.validity_start_year, validityEndYear: row.validity_end_year });
const toProject = (row) => ({ ...row, objectiveId: row.objective_id, ownerId: row.owner_email });
const toAction = (row) => ({ ...row, objectiveId: row.objective_id, projectId: row.project_id, dueDate: row.due_date, ownerId: row.owner_email });
const toIndicator = (row) => ({ ...row, objectiveId: row.objective_id, ownerId: row.owner_email, approvalStatus: row.approval_status, reviewFrequency: row.review_frequency, target: Number(row.target) });
const toReport = (row) => ({ ...row, indicatorId: row.indicator_id, date: row.registered_date, result: Number(row.result), obs: row.observations });

// La aplicación inicia sin datos operativos. Los usuarios registrados crean los
// objetivos, acciones, indicadores y reportes reales desde Bionexora.
const INITIAL_OBJECTIVES = [];
const INITIAL_PROJECTS = [];
const INITIAL_TASKS = [];
const INITIAL_INDICATORS = [];
const INITIAL_REPORTS = [];

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
  return isSuccess ? 'En meta' : 'Fuera de meta'; 
};

const getStatusColor = (status) => {
  switch(status?.toLowerCase()) {
    case 'cumplido':
    case 'completado': return 'bg-green-100 text-green-700 border-green-200';
    case 'en meta': return 'bg-green-100 text-green-700 border-green-200';
    case 'en riesgo': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'fuera de meta': return 'bg-red-100 text-red-700 border-red-200';
    case 'no cumplido': 
    case 'retrasado': return 'bg-red-100 text-red-700 border-red-200';
    case 'en progreso': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getStatusIcon = (status, className="w-4 h-4") => {
  switch(status?.toLowerCase()) {
    case 'cumplido': return <CheckCircle2 className={`${className} text-green-600`} />;
    case 'en meta': return <CheckCircle2 className={`${className} text-green-600`} />;
    case 'en riesgo': return <AlertCircle className={`${className} text-yellow-600`} />;
    case 'fuera de meta': return <AlertCircle className={`${className} text-red-600`} />;
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

const SearchablePeopleSelect = ({ label, options, value, onChange, multiple = false, required = false }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedIds = multiple ? value : (value ? [value] : []);
  const selected = options.filter(person => selectedIds.includes(person.id));
  const filtered = options.filter(person => person.name.toLowerCase().includes(query.toLowerCase()));
  const toggle = (id) => {
    if (multiple) onChange(selectedIds.includes(id) ? selectedIds.filter(item => item !== id) : [...selectedIds, id]);
    else { onChange(id); setOpen(false); setQuery(''); }
  };
  return <div className="flex flex-col gap-1.5 relative"><label className="text-sm font-medium text-slate-700">{label}{required ? ' *' : ''}</label><button type="button" onClick={() => setOpen(!open)} className="min-h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-left flex items-center justify-between gap-3"><span className={selected.length ? 'text-slate-900' : 'text-slate-400'}>{multiple ? (selected.length ? `${selected.length} persona${selected.length > 1 ? 's' : ''} seleccionada${selected.length > 1 ? 's' : ''}` : 'Seleccionar personas...') : (selected[0]?.name || 'Seleccionar...')}</span><ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} /></button>{multiple && selected.length > 0 && <div className="flex flex-wrap gap-1.5 mt-1">{selected.map(person => <span key={person.id} className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">{person.name}</span>)}</div>}{open && <div className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-2"><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona..." className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" /><div className="max-h-48 overflow-y-auto mt-2">{filtered.length ? filtered.map(person => <button type="button" key={person.id} onClick={() => toggle(person.id)} className="w-full px-3 py-2 text-left rounded-md hover:bg-slate-50 flex items-center justify-between gap-3"><span><span className="block text-sm font-medium text-slate-800">{person.name}</span><span className="block text-xs text-slate-500">{ROLE_LABELS[person.role] || person.role}</span></span>{selectedIds.includes(person.id) && <CheckCircle2 className="w-4 h-4 text-[#1D4ED8]" />}</button>) : <p className="px-3 py-4 text-sm text-slate-500">No se encontraron personas.</p>}</div></div>}</div>;
};

const ProgressBar = ({ progress, status }) => {
  let color = 'bg-[#3B82F6]';
  if (status === 'Cumplido' || status === 'En meta') color = 'bg-green-500';
  if (status === 'Fuera de meta') color = 'bg-red-500';
  if (status === 'En riesgo') color = 'bg-yellow-500';
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${progress}%` }}></div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [navHistory, setNavHistory] = useState([{ id: 'dashboard', name: 'Monitor' }]);
  
  const [objectives, setObjectives] = useState(INITIAL_OBJECTIVES);
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [indicators, setIndicators] = useState(INITIAL_INDICATORS);
  const [reports, setReports] = useState(INITIAL_REPORTS);
  const [profiles, setProfiles] = useState([]);
  const [organizationPeople, setOrganizationPeople] = useState([]);
  
  const [selectedObjectiveId, setSelectedObjectiveId] = useState(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState(null);
  const [selectedActionId, setSelectedActionId] = useState(null);
  const [portfolioFilter, setPortfolioFilter] = useState(null);
  const [generalObjectiveFilter, setGeneralObjectiveFilter] = useState('Todos');
  const [selectedRole, setSelectedRole] = useState(null);
  const [session, setSession] = useState(null);
  const [assignedRole, setAssignedRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [dataError, setDataError] = useState('');
  const isGeneralManager = selectedRole?.name === 'Gerente general';
  const isResponsibleManager = selectedRole?.name === 'Gerente responsable';
  const isGcg = selectedRole?.name === 'GCG';
  const isSuperAdmin = assignedRole === 'super_admin';
  const availableUsers = [
    ...organizationPeople.map(person => ({ id: person.id, name: person.full_name, role: person.role, avatar: person.full_name.slice(0, 2).toUpperCase() })),
    ...profiles.filter(profile => !organizationPeople.some(person => person.email && person.email === profile.email)).map(profile => ({
    id: profile.email,
    name: profile.email,
    role: profile.role,
    avatar: profile.email.slice(0, 2).toUpperCase(),
    })),
  ];
  const MOCK_USERS = availableUsers;

  const loadOperationalData = async () => {
    if (!supabase) return;
    const [profilesResult, peopleResult, objectivesResult, projectsResult, actionsResult, indicatorsResult, reportsResult] = await Promise.all([
      supabase.from('profiles').select('email, role').order('email'),
      supabase.from('organization_people').select('id, full_name, email, role').eq('active', true).order('full_name'),
      supabase.from('objectives').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('strategic_actions').select('*').order('created_at', { ascending: false }),
      supabase.from('indicators').select('*').order('created_at', { ascending: false }),
      supabase.from('indicator_reports').select('*').order('registered_date', { ascending: true }),
    ]);
    const firstError = [profilesResult, peopleResult, objectivesResult, projectsResult, actionsResult, indicatorsResult, reportsResult].find(result => result.error)?.error;
    if (firstError) {
      setDataError('La estructura de datos de Supabase aún no está disponible. Ejecuta la migración 002_operational_data.sql.');
      return;
    }
    setProfiles(profilesResult.data || []);
    setOrganizationPeople(peopleResult.data || []);
    setObjectives((objectivesResult.data || []).map(toObjective));
    setProjects((projectsResult.data || []).map(toProject));
    setTasks((actionsResult.data || []).map(toAction));
    setIndicators((indicatorsResult.data || []).map(toIndicator));
    setReports((reportsResult.data || []).map(toReport));
    setDataError('');
  };

  useEffect(() => {
    if (!supabase) {
      setAuthError('Falta configurar la conexión con Supabase.');
      setAuthLoading(false);
      return undefined;
    }

    let isActive = true;
    const resetAuthentication = () => {
      if (!isActive) return;
      setSession(null);
      setAssignedRole(null);
      setSelectedRole(null);
      setAuthLoading(false);
    };

    const loadAssignedRole = async (activeSession) => {
      if (!activeSession?.user) {
        resetAuthentication();
        return;
      }

      const email = activeSession.user.email?.trim().toLowerCase();
      if (!email) {
        if (isActive) {
          setSession(activeSession);
          setAuthError('Microsoft no devolvió un correo para esta cuenta.');
          setAuthLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('role_assignments')
        .select('role')
        .eq('email', email)
        .maybeSingle();

      if (!isActive) return;
      setSession(activeSession);
      if (error || !data?.role) {
        setAssignedRole(null);
        setSelectedRole(null);
        setAuthError('Tu correo corporativo no tiene un rol asignado en Bionexora. Contacta al administrador.');
      } else {
        setAuthError('');
        setAssignedRole(data.role);
        setSelectedRole(data.role === 'super_admin' ? null : { key: data.role, name: ROLE_LABELS[data.role] });
        await loadOperationalData();
      }
      setAuthLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: activeSession } }) => loadAssignedRole(activeSession));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      loadAssignedRole(activeSession);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithMicrosoft = async () => {
    if (!supabase) return;
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo: window.location.origin, scopes: 'email' },
    });
    if (error) setAuthError(error.message);
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setCurrentView('dashboard');
    setNavHistory([{ id: 'dashboard', name: 'Monitor' }]);
  };

  const navigateTo = (view, name, params = {}) => {
    if ((view === 'new-objective' && !isGeneralManager) || (['new-project', 'edit-action', 'edit-target', 'new-indicator', 'report-indicator'].includes(view) && !isResponsibleManager) || (view === 'gcg-review' && !isGcg)) return;
    setCurrentView(view);
    if (params.objectiveId) setSelectedObjectiveId(params.objectiveId);
    if (params.indicatorId) setSelectedIndicatorId(params.indicatorId);
    if (params.actionId) setSelectedActionId(params.actionId);
    if (['dashboard', 'objectives', 'gcg-review', 'settings'].includes(view)) {
      setNavHistory([{ id: view, name }]);
    } else {
      let newHistory = [...navHistory];
      if (newHistory.length > 3) newHistory = [newHistory[0]];
      newHistory.push({ id: view, name, ...params });
      setNavHistory(newHistory);
    }
  };

  const restoreHistory = (index) => {
    const destination = navHistory[index];
    setCurrentView(destination.id);
    if (destination.objectiveId) setSelectedObjectiveId(destination.objectiveId);
    if (destination.indicatorId) setSelectedIndicatorId(destination.indicatorId);
    if (destination.actionId) setSelectedActionId(destination.actionId);
    setNavHistory(navHistory.slice(0, index + 1));
  };

  const goBack = () => {
    if (navHistory.length > 1) restoreHistory(navHistory.length - 2);
  };

  const MonitorView = () => {
    const fulfilled = objectives.filter(o => o.status === 'Cumplido').length;
    const atRisk = objectives.filter(o => o.status === 'En riesgo').length;
    const indicatorsInTarget = indicators.filter(indicator => indicator.status === 'En meta').length;
    const indicatorsOutOfTarget = indicators.filter(indicator => indicator.status === 'Fuera de meta').length;
    const overdueIndicators = indicators.filter(indicator => !reports.some(report => report.indicatorId === indicator.id)).length;
    const averageProgress = objectives.length ? Math.round(objectives.reduce((total, objective) => total + objective.progress, 0) / objectives.length) : 0;
    const indicatorProgress = indicators.length
      ? Math.round(indicators.reduce((total, indicator) => total + (indicator.status === 'En meta' ? 100 : 0), 0) / indicators.length)
      : 0;
    const projectsProgress = projects.length
      ? Math.round(projects.reduce((total, project) => total + Number(project.progress || 0), 0) / projects.length)
      : 0;
    const criticalIndicators = indicators
      .map(indicator => {
        const hasReport = reports.some(report => report.indicatorId === indicator.id);
        const status = hasReport ? indicator.status : 'Vencido';
        return { ...indicator, criticalStatus: status };
      })
      .filter(indicator => indicator.criticalStatus === 'Vencido' || indicator.criticalStatus === 'Fuera de meta');
    const chartData = objectives.map(objective => ({ name: objective.name, avance: objective.progress }));
    const distribution = [
      { name: 'Cumplidos', value: fulfilled, color: '#16a34a' },
      { name: 'En progreso', value: objectives.filter(o => o.status === 'En progreso').length, color: '#2563eb' },
      { name: 'En riesgo', value: atRisk, color: '#f59e0b' }
    ].filter(item => item.value > 0);
    const isBehindSchedule = (objective) => {
      const start = new Date(objective.createdDate || new Date().toISOString().split('T')[0]);
      const end = new Date(objective.targetDate);
      const now = new Date();
      const expected = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
      return objective.status === 'En riesgo' || objective.progress + 10 < expected;
    };
    const alerts = objectives.filter(isBehindSchedule).filter(objective => !portfolioFilter || objective.status === portfolioFilter);
    const perspectives = ['Todos', ...new Set(objectives.map(objective => objective.category))];
    const generalObjectives = objectives.filter(objective => generalObjectiveFilter === 'Todos' || objective.category === generalObjectiveFilter);

    return (
      <div className="space-y-6 fade-in">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#D71920] uppercase tracking-[0.16em]">Bionexora</p>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-1">Monitor estratégico</h1>
            <p className="text-slate-500 mt-1">Vista ejecutiva del avance de los objetivos de Biomont.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-2 text-sm font-medium text-slate-600 shadow-sm"><Calendar className="w-4 h-4 text-[#D71920]" /> Periodo: 2026</div>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isGeneralManager ? 'xl:grid-cols-2' : 'xl:grid-cols-4'} gap-4`}>
          {isResponsibleManager ? <>
            <Card className="p-5 border-l-4 border-l-[#D71920]"><p className="text-sm font-medium text-slate-500">Avance de indicadores</p><div className="flex items-end justify-between mt-2"><h3 className="text-3xl font-bold text-slate-900">{indicatorProgress}%</h3><Activity className="w-6 h-6 text-[#D71920]" /></div><p className="text-xs text-slate-500 mt-3">Indicadores reportados en meta</p></Card>
            <Card className="p-5 border-l-4 border-l-blue-600"><p className="text-sm font-medium text-slate-500">Indicadores activos</p><div className="flex items-end justify-between mt-2"><h3 className="text-3xl font-bold text-slate-900">{indicators.length}</h3><BarChart3 className="w-6 h-6 text-blue-600" /></div><p className="text-xs text-slate-500 mt-3">Registrados para medición</p></Card>
            <Card className="p-5 border-l-4 border-l-green-500"><p className="text-sm font-medium text-slate-500">Número de acciones</p><div className="flex items-end justify-between mt-2"><h3 className="text-3xl font-bold text-slate-900">{tasks.length}</h3><CheckCircle2 className="w-6 h-6 text-green-600" /></div><p className="text-xs text-green-700 mt-3">Acciones estratégicas registradas</p></Card>
            <Card className="p-5 border-l-4 border-l-amber-500"><p className="text-sm font-medium text-slate-500">Avance de proyectos</p><div className="flex items-end justify-between mt-2"><h3 className="text-3xl font-bold text-slate-900">{projectsProgress}%</h3><FolderKanban className="w-6 h-6 text-amber-500" /></div><p className="text-xs text-amber-700 mt-3">Promedio de proyectos registrados</p></Card>
          </> : <>
            <Card className="p-5 border-l-4 border-l-[#D71920]"><p className="text-sm font-medium text-slate-500">Avance estratégico</p><div className="flex items-end justify-between mt-2"><h3 className="text-3xl font-bold text-slate-900">{averageProgress}%</h3><Activity className="w-6 h-6 text-[#D71920]" /></div><p className="text-xs text-slate-500 mt-3">Promedio de objetivos activos</p></Card>
            <Card className="p-5 border-l-4 border-l-blue-600"><p className="text-sm font-medium text-slate-500">Objetivos activos</p><div className="flex items-end justify-between mt-2"><h3 className="text-3xl font-bold text-slate-900">{objectives.length}</h3><Target className="w-6 h-6 text-blue-600" /></div><p className="text-xs text-slate-500 mt-3">En seguimiento este periodo</p></Card>
            {!isGeneralManager && <Card className="p-5 border-l-4 border-l-green-500"><p className="text-sm font-medium text-slate-500">Objetivos cumplidos</p><div className="flex items-end justify-between mt-2"><h3 className="text-3xl font-bold text-slate-900">{fulfilled}</h3><CheckCircle2 className="w-6 h-6 text-green-600" /></div><p className="text-xs text-green-700 mt-3">Resultados logrados</p></Card>}
            {!isGeneralManager && <Card className="p-5 border-l-4 border-l-amber-500"><p className="text-sm font-medium text-slate-500">Alertas de riesgo</p><div className="flex items-end justify-between mt-2"><h3 className="text-3xl font-bold text-slate-900">{atRisk}</h3><AlertCircle className="w-6 h-6 text-amber-500" /></div><p className="text-xs text-amber-700 mt-3">Requieren atención</p></Card>}
          </>}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 p-6"><div className="flex items-center justify-between mb-6"><div><h2 className="text-lg font-bold text-slate-900">Avance por objetivo</h2><p className="text-sm text-slate-500">Progreso acumulado del plan estratégico</p></div>{!isGeneralManager && <button onClick={() => navigateTo('objectives', 'Objetivos')} className="text-sm font-semibold text-[#D71920] hover:underline">Ver objetivos</button>}</div><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 18, left: 12, bottom: 42 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={72} tick={{ fill: '#475569', fontSize: 11 }} /><YAxis unit="%" width={48} domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} /><Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value) => [`${value}%`, 'Avance']} /><Bar dataKey="avance" fill="#D71920" radius={[6, 6, 0, 0]} barSize={42} /></BarChart></ResponsiveContainer></div></Card>
          {isResponsibleManager ? <Card className="p-6"><div><h2 className="text-lg font-bold text-slate-900">Estado de indicadores</h2><p className="text-sm text-slate-500">Resumen de la última medición registrada.</p></div><div className="grid grid-cols-1 gap-3 mt-5"><div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-green-800">En meta</p><p className="text-xs text-green-700 mt-0.5">Reportados dentro de la meta</p></div><span className="text-2xl font-bold text-green-700">{indicatorsInTarget}</span></div><div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-red-800">Fuera de meta</p><p className="text-xs text-red-700 mt-0.5">Reportados fuera de la meta</p></div><span className="text-2xl font-bold text-red-700">{indicatorsOutOfTarget}</span></div><div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-amber-800">Vencido</p><p className="text-xs text-amber-700 mt-0.5">Aún no tienen reporte</p></div><span className="text-2xl font-bold text-amber-700">{overdueIndicators}</span></div></div></Card> : <Card className="p-6"><div className="flex items-start justify-between gap-2"><div><h2 className="text-lg font-bold text-slate-900">Estado del portafolio</h2><p className="text-sm text-slate-500">Haz clic en una categoría para filtrar las alertas.</p></div>{portfolioFilter && <button onClick={() => setPortfolioFilter(null)} className="text-xs font-semibold text-[#D71920]">Limpiar</button>}</div><div className="h-56 mt-2"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={4} cursor="pointer" onClick={(entry) => setPortfolioFilter(portfolioFilter === entry.name ? null : entry.name)}>{distribution.map(item => <Cell key={item.name} fill={item.color} opacity={!portfolioFilter || portfolioFilter === item.name ? 1 : .35} />)}</Pie><Tooltip /><Legend iconType="circle" /></PieChart></ResponsiveContainer></div></Card>}
        </div>

        {isGeneralManager ? <Card className="overflow-hidden"><div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Objetivos</h2><p className="text-sm text-slate-500">Consulta el avance de los objetivos estratégicos.</p></div><select value={generalObjectiveFilter} onChange={event => setGeneralObjectiveFilter(event.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"><option value="Todos">Todas las perspectivas</option>{perspectives.slice(1).map(item => <option key={item} value={item}>{item}</option>)}</select></div><div className="divide-y divide-slate-100">{generalObjectives.map(objective => <button key={objective.id} onClick={() => navigateTo('objective-detail', objective.name, { objectiveId: objective.id })} className="w-full p-5 text-left hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-3"><div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 break-words">{objective.name}</p><p className="text-sm text-slate-500 mt-0.5">{objective.category} · Meta: {objective.targetDate}</p></div><div className="w-full sm:w-48 shrink-0"><div className="flex justify-between text-xs text-slate-500 mb-1"><span>Avance</span><span>{objective.progress}%</span></div><ProgressBar progress={objective.progress} status={objective.status} /></div></button>)}</div></Card> : isResponsibleManager ? <Card className="overflow-hidden"><div className="p-5 border-b border-slate-200 flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Alertas</h2><p className="text-sm text-slate-500">Indicadores críticos: vencidos o fuera de meta.</p></div><Badge status={criticalIndicators.length ? 'Fuera de meta' : 'Cumplido'}>{criticalIndicators.length ? `${criticalIndicators.length} alertas` : 'Sin alertas'}</Badge></div><div className="divide-y divide-slate-100">{criticalIndicators.length ? criticalIndicators.map(indicator => { const objective = objectives.find(item => item.id === indicator.objectiveId); return <button key={indicator.id} onClick={() => navigateTo('indicator-detail', indicator.name, { indicatorId: indicator.id })} className="w-full p-5 text-left hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-3"><div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 break-words">{indicator.name}</p><p className="text-sm text-slate-500 mt-0.5">Objetivo: {objective?.name || 'Sin objetivo asignado'}</p></div><div className="text-sm text-slate-500">Meta: {indicator.comparator} {indicator.target} {indicator.unit}</div><Badge status={indicator.criticalStatus === 'Vencido' ? 'En riesgo' : 'Fuera de meta'}>{indicator.criticalStatus}</Badge></button>}) : <p className="p-8 text-center text-sm text-slate-500">No hay indicadores vencidos ni fuera de meta.</p>}</div></Card> : <Card className="overflow-hidden"><div className="p-5 border-b border-slate-200 flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Alertas</h2><p className="text-sm text-slate-500">Objetivos con avance menor al esperado según el tiempo transcurrido.</p></div><Badge status={alerts.length ? 'En riesgo' : 'Cumplido'}>{alerts.length ? `${alerts.length} alertas` : 'Sin alertas'}</Badge></div><div className="divide-y divide-slate-100">{alerts.length ? alerts.map(objective => <button key={objective.id} onClick={() => navigateTo('objective-detail', objective.name, { objectiveId: objective.id })} className="w-full p-5 text-left hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-3"><div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 break-words">{objective.name}</p><p className="text-sm text-slate-500 mt-0.5">Responsable: {MOCK_USERS.find(user => user.id === objective.ownerId)?.name}</p></div><div className="w-full sm:w-48 shrink-0"><div className="flex justify-between text-xs text-slate-500 mb-1"><span>Avance</span><span>{objective.progress}%</span></div><ProgressBar progress={objective.progress} status={objective.status} /></div><Badge status={objective.status}>{objective.status}</Badge></button>) : <p className="p-8 text-center text-sm text-slate-500">No hay objetivos con retraso respecto al tiempo registrado.</p>}</div></Card>}
      </div>
    );
  };

  const reviewIndicator = async (indicatorId, decision) => {
    const approvalStatus = decision === 'approve' ? 'Aprobado' : 'Reformular';
    const { error } = await supabase.from('indicators').update({ approval_status: approvalStatus, updated_at: new Date().toISOString() }).eq('id', indicatorId);
    if (error) {
      setDataError('No se pudo actualizar la revisión del indicador. Inténtalo nuevamente.');
      return;
    }
    setIndicators(items => items.map(item => item.id === indicatorId ? { ...item, approvalStatus } : item));
  };

  const ObjectivesView = () => {
    const activeObs = objectives.filter(o => o.status === 'En progreso').length;
    const riskObs = objectives.filter(o => o.status === 'En riesgo').length;
    const doneObs = objectives.filter(o => o.status === 'Cumplido').length;
    const riskInds = indicators.filter(i => i.status === 'En riesgo');

    return (
      <div className="space-y-8 fade-in">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Buenos días, {session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'usuario'}</h1>
            <p className="text-slate-500 mt-1">Aquí está el resumen estratégico de tu organización.</p>
          </div>
          {isGeneralManager && <Button onClick={() => navigateTo('new-objective', 'Nuevo Objetivo')} className="hidden sm:flex">
            <Plus className="w-4 h-4" /> Nuevo Objetivo
          </Button>}
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
                const owner = availableUsers.find(u => u.id === obj.ownerId);
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
    const [formData, setFormData] = useState({ name: '', description: '', ownerId: '', validityStartYear: '', validityEndYear: '', stakeholders: [] });

    const handleSubmit = async (e) => {
      e.preventDefault();
      const { data, error } = await supabase.from('objectives').insert({
        name: formData.name,
        description: formData.description,
        owner_email: formData.ownerId || null,
        target_date: `${formData.validityEndYear}-12-31`,
        validity_start_year: Number(formData.validityStartYear),
        validity_end_year: Number(formData.validityEndYear),
        stakeholders: formData.stakeholders,
        created_by: session.user.id,
      }).select().single();
      if (error) {
        setDataError('No se pudo crear el objetivo. Inténtalo nuevamente.');
        return;
      }
      setObjectives([toObjective(data), ...objectives]);
      navigateTo(isGeneralManager ? 'dashboard' : 'objectives', isGeneralManager ? 'Monitor' : 'Objetivos');
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
            <SearchablePeopleSelect label="Responsable principal" required options={availableUsers.filter(user => user.role === 'gerente_responsable')} value={formData.ownerId} onChange={ownerId => setFormData({ ...formData, ownerId })} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               <Input label="Inicio de vigencia *" type="number" min="2020" max="2100" placeholder="2026" required value={formData.validityStartYear} onChange={e => setFormData({...formData, validityStartYear: e.target.value})} />
               <Input label="Fin de vigencia *" type="number" min="2020" max="2100" placeholder="2027" required value={formData.validityEndYear} onChange={e => setFormData({...formData, validityEndYear: e.target.value})} />
            </div>
            <SearchablePeopleSelect label="Personas interesadas" multiple options={availableUsers} value={formData.stakeholders} onChange={stakeholders => setFormData({ ...formData, stakeholders })} />
            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigateTo(isGeneralManager ? 'dashboard' : 'objectives', isGeneralManager ? 'Monitor' : 'Objetivos')}>Cancelar</Button>
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
    const owner = availableUsers.find(u => u.id === obj.ownerId);
    const objProjects = projects.filter(p => p.objectiveId === obj.id);
    const objActions = tasks.filter(task => task.objectiveId === obj.id);
    const objIndicators = indicators.filter(i => i.objectiveId === obj.id);
    const [activeTab, setActiveTab] = useState('summary');

    return (
      <div className="fade-in space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f0f9ff] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none opacity-60"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2"><Badge status={obj.status}>{obj.status}</Badge></div>
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
              <div><p className="text-xs text-slate-400 mb-1">Periodo de vigencia</p><p className="text-sm font-medium text-slate-900 flex items-center gap-1"><Calendar className="w-4 h-4 text-slate-400" /> {obj.validityStartYear} - {obj.validityEndYear}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Proyectos activos</p><p className="text-sm font-medium text-slate-900">{objProjects.length}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Indicadores medidos</p><p className="text-sm font-medium text-slate-900">{objIndicators.length}</p></div>
            </div>
            <div className="pt-4 border-t border-slate-100"><p className="text-xs text-slate-400 mb-2">Personas interesadas</p>{obj.stakeholders?.length ? <div className="flex flex-wrap gap-2">{obj.stakeholders.map(personId => { const person = availableUsers.find(user => user.id === personId); return <span key={personId} className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{person?.name || 'Persona registrada'}</span> })}</div> : <p className="text-sm text-slate-500">Aún no se han agregado personas interesadas.</p>}</div>
          </div>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex gap-6 overflow-x-auto whitespace-nowrap pr-2">
            {[ { id: 'summary', label: 'Resumen', icon: Activity }, { id: 'projects', label: 'Proyectos y Tareas', icon: FolderKanban, responsibleOnly: true }, { id: 'indicators', label: 'Indicadores', icon: BarChart3, responsibleOnly: true }].filter(tab => !tab.responsibleOnly || isResponsibleManager).map(tab => (
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
                {isResponsibleManager && <div className="flex gap-2"><Button variant="secondary" className="text-xs py-1.5"><FolderKanban className="w-4 h-4"/> Vincular proyecto</Button><Button onClick={() => navigateTo('new-project', 'Añadir acción estratégica', { objectiveId: obj.id })} className="text-xs py-1.5"><Plus className="w-4 h-4"/> Añadir acción estratégica</Button></div>}
              </div>
              {objProjects.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-300 rounded-xl"><FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-600 font-medium">Este objetivo no tiene proyectos vinculados.</p>{isResponsibleManager && <Button onClick={() => navigateTo('new-project', 'Añadir acción estratégica', { objectiveId: obj.id })} variant="secondary" className="mt-4 mx-auto"><Plus className="w-4 h-4"/> Añadir acción estratégica</Button>}</div>
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
              <Card className="p-5"><h4 className="font-semibold text-slate-900 mb-3">Acciones estratégicas</h4>{objActions.length ? <div className="space-y-3">{objActions.map(action => <div key={action.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-slate-900 break-words">{action.name}</p>{action.description && <p className="text-xs text-slate-500 mt-1">{action.description}</p>}<p className="text-xs text-slate-500 mt-1">Responsable: {availableUsers.find(user => user.id === action.ownerId)?.name || 'Sin asignar'}</p></div><div className="flex items-center gap-3 shrink-0"><div className="text-xs text-slate-500">Ejecución: {action.dueDate || 'Sin fecha'}</div>{isResponsibleManager && <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => navigateTo('edit-action', 'Editar acción estratégica', { objectiveId: obj.id, actionId: action.id })}>Editar</Button>}</div></div>)}</div> : <p className="text-sm text-slate-500">Aún no hay acciones estratégicas registradas.</p>}</Card>
            </div>
          )}

          {activeTab === 'indicators' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-900">Indicadores Estratégicos</h3>
                {isResponsibleManager && <Button onClick={() => navigateTo('new-indicator', 'Nuevo Indicador', { objectiveId: obj.id })} className="text-xs py-1.5"><Plus className="w-4 h-4"/> Crear Indicador</Button>}
              </div>
              {objIndicators.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-300 rounded-xl"><BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-600 font-medium">Aún no hay indicadores para medir este objetivo.</p>{isResponsibleManager && <Button onClick={() => navigateTo('new-indicator', 'Nuevo Indicador', { objectiveId: obj.id })} variant="secondary" className="mt-4 mx-auto"><Plus className="w-4 h-4"/> Definir primer indicador</Button>}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {objIndicators.map(ind => {
                    const latest = reports.filter(r => r.indicatorId === ind.id).sort((a,b) => new Date(b.date) - new Date(a.date))[0];
                    return (
                      <Card key={ind.id} className="p-5 flex flex-col h-full" onClick={() => navigateTo('indicator-detail', ind.name, { indicatorId: ind.id, objectiveId: obj.id })}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="pr-4"><h4 className="font-semibold text-slate-900 hover:text-[#1D4ED8] transition-colors">{ind.name}</h4><p className="text-xs text-slate-500 mt-1">Frecuencia: {ind.frequency}</p></div>
                          <div className="flex flex-col items-end gap-2"><Badge status={ind.status}>{ind.status}</Badge><span className={`text-[11px] font-semibold ${ind.approvalStatus === 'Aprobado' ? 'text-green-700' : ind.approvalStatus === 'Reformular' ? 'text-red-600' : 'text-amber-600'}`}>{ind.approvalStatus || 'Pendiente de aprobación GCG'}</span></div>
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

  const ProjectFormView = () => {
    const obj = objectives.find(item => item.id === selectedObjectiveId);
    const [formData, setFormData] = useState({ name: '', description: '', dueDate: '', ownerId: '' });
    const handleSubmit = async (e) => {
      e.preventDefault();
      const { data, error } = await supabase.from('strategic_actions').insert({
        objective_id: selectedObjectiveId,
        name: formData.name,
        description: formData.description,
        due_date: formData.dueDate || null,
        owner_email: formData.ownerId || null,
      }).select().single();
      if (error) {
        setDataError('No se pudo registrar la acción estratégica. Inténtalo nuevamente.');
        return;
      }
      setTasks(items => [...items, toAction(data)]);
      navigateTo('objective-detail', obj?.name || 'Objetivo', { objectiveId: selectedObjectiveId });
    };
    return <div className="max-w-2xl mx-auto fade-in"><div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Añadir acción estratégica</h1><p className="text-slate-500">Gerencia responsable · {obj?.name}</p></div><Card className="p-6"><form onSubmit={handleSubmit} className="space-y-5"><Input label="Nombre de la acción estratégica *" required placeholder="Ej.: Implementar tablero de producción" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /><div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-slate-700">Descripción</label><textarea rows={3} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div><Select label="Responsable *" required options={availableUsers.map(user => ({ value: user.id, label: user.name }))} value={formData.ownerId} onChange={e => setFormData({...formData, ownerId: e.target.value})} /><Input label="Fecha programada de ejecución" type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} /><div className="pt-4 border-t border-slate-100 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => navigateTo('objective-detail', obj?.name, { objectiveId: selectedObjectiveId })}>Cancelar</Button><Button type="submit">Registrar acción</Button></div></form></Card></div>;
  };

  const GcgReviewView = () => {
    const pending = indicators.filter(indicator => indicator.approvalStatus === 'Pendiente de aprobación' || indicator.approvalStatus === 'Reformular');
    return <div className="fade-in space-y-6"><div><p className="text-sm font-semibold text-[#D71920] uppercase tracking-wider">GCG · Control de gestión</p><h1 className="text-2xl font-bold text-slate-900 mt-1">Revisión de indicadores</h1><p className="text-slate-500 mt-1">Aprueba indicadores listos para medición o devuélvelos a la gerencia responsable para reformulación.</p></div><Card className="overflow-hidden"><div className="p-5 border-b border-slate-200 flex justify-between items-center"><h2 className="font-semibold text-slate-900">Bandeja de revisión</h2><span className="text-sm text-slate-500">{pending.length} pendientes</span></div>{pending.length === 0 ? <div className="p-10 text-center text-slate-500">No hay indicadores pendientes de revisión.</div> : <div className="divide-y divide-slate-100">{pending.map(indicator => { const objective = objectives.find(item => item.id === indicator.objectiveId); return <div key={indicator.id} className="p-5"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="font-semibold text-slate-900">{indicator.name}</p><p className="text-sm text-slate-500 mt-1">Objetivo: {objective?.name} · Meta: {indicator.comparator} {indicator.target} {indicator.unit}</p><p className="text-xs text-slate-500 mt-2">Frecuencia: {indicator.frequency} · Responsable: {MOCK_USERS.find(user => user.id === Number(indicator.ownerId))?.name || 'Sin asignar'}</p></div><div className="flex gap-2 shrink-0"><Button variant="secondary" onClick={() => reviewIndicator(indicator.id, 'reject')}>Rechazar y reformular</Button><Button onClick={() => reviewIndicator(indicator.id, 'approve')}><CheckCircle2 className="w-4 h-4" /> Aprobar</Button></div></div></div>})}</div>}</Card></div>;
  };

  const EditActionView = () => {
    const action = tasks.find(item => item.id === selectedActionId);
    const objective = objectives.find(item => item.id === action?.objectiveId);
    const [formData, setFormData] = useState({ name: action?.name || '', description: action?.description || '', dueDate: action?.dueDate || '', ownerId: action?.ownerId || '' });
    if (!action) return <div className="text-center text-slate-500 py-12">No se encontró la acción estratégica.</div>;
    const handleSubmit = async (event) => {
      event.preventDefault();
      const { data, error } = await supabase.from('strategic_actions').update({ name: formData.name, description: formData.description, due_date: formData.dueDate || null, owner_email: formData.ownerId || null, updated_at: new Date().toISOString() }).eq('id', action.id).select().single();
      if (error) { setDataError('No se pudo actualizar la acción estratégica. Inténtalo nuevamente.'); return; }
      setTasks(items => items.map(item => item.id === action.id ? toAction(data) : item));
      navigateTo('objective-detail', objective?.name || 'Objetivo', { objectiveId: action.objectiveId });
    };
    return <div className="max-w-2xl mx-auto fade-in"><div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Editar acción estratégica</h1><p className="text-slate-500">{objective?.name}</p></div><Card className="p-6"><form onSubmit={handleSubmit} className="space-y-5"><Input label="Nombre de la acción estratégica *" required value={formData.name} onChange={event => setFormData({ ...formData, name: event.target.value })} /><div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-slate-700">Descripción</label><textarea rows={3} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={formData.description} onChange={event => setFormData({ ...formData, description: event.target.value })} /></div><Select label="Responsable *" required options={availableUsers.map(user => ({ value: user.id, label: user.name }))} value={formData.ownerId} onChange={event => setFormData({ ...formData, ownerId: event.target.value })} /><Input label="Fecha programada de ejecución" type="date" value={formData.dueDate} onChange={event => setFormData({ ...formData, dueDate: event.target.value })} /><div className="pt-4 border-t border-slate-100 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => navigateTo('objective-detail', objective?.name || 'Objetivo', { objectiveId: action.objectiveId })}>Cancelar</Button><Button type="submit">Guardar cambios</Button></div></form></Card></div>;
  };

  const EditTargetView = () => {
    const indicator = indicators.find(item => item.id === selectedIndicatorId);
    const [target, setTarget] = useState(indicator?.target ?? '');
    const [comparator, setComparator] = useState(indicator?.comparator ?? '>=');
    if (!indicator) return <div className="text-center text-slate-500 py-12">No se encontró el indicador.</div>;
    const handleSubmit = async (event) => {
      event.preventDefault();
      const { error: historyError } = await supabase.from('indicator_target_history').insert({ indicator_id: indicator.id, target: indicator.target, comparator: indicator.comparator, changed_by: session.user.id });
      if (historyError) { setDataError('No se pudo registrar el historial de la meta.'); return; }
      const { data, error } = await supabase.from('indicators').update({ target: Number(target), comparator, approval_status: 'Pendiente de aprobación', updated_at: new Date().toISOString() }).eq('id', indicator.id).select().single();
      if (error) { setDataError('No se pudo actualizar la meta del indicador.'); return; }
      setIndicators(items => items.map(item => item.id === indicator.id ? toIndicator(data) : item));
      navigateTo('indicator-detail', indicator.name, { indicatorId: indicator.id });
    };
    return <div className="max-w-xl mx-auto fade-in"><div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Editar meta del indicador</h1><p className="text-slate-500">Al guardar, el indicador volverá a la aprobación de GCG.</p></div><Card className="p-6"><form onSubmit={handleSubmit} className="space-y-5"><Select label="Comparador *" required options={[{ value: '>=', label: 'Mayor o igual (>=)' }, { value: '>', label: 'Mayor (>)' }, { value: '<=', label: 'Menor o igual (<=)' }, { value: '<', label: 'Menor (<)' }, { value: '=', label: 'Igual (=)' }]} value={comparator} onChange={event => setComparator(event.target.value)} /><Input label={`Nueva meta (${indicator.unit}) *`} type="number" step="0.01" required value={target} onChange={event => setTarget(event.target.value)} /><div className="flex justify-end gap-3 pt-3"><Button type="button" variant="ghost" onClick={() => navigateTo('indicator-detail', indicator.name, { indicatorId: indicator.id })}>Cancelar</Button><Button type="submit">Enviar a aprobación</Button></div></form></Card></div>;
  };

  const IndicatorFormView = () => {
    const obj = objectives.find(o => o.id === selectedObjectiveId);
    const [formData, setFormData] = useState({ name: '', resource: '', formula: '', target: '', unit: '%', comparator: '>=', frequency: 'Mensual', reviewFrequency: 'Mensual', ownerId: '' });

    const handleSubmit = async (e) => {
      e.preventDefault();
      const { data, error } = await supabase.from('indicators').insert({
        objective_id: selectedObjectiveId,
        name: formData.name,
        resource: formData.resource,
        formula: formData.formula,
        target: parseFloat(formData.target),
        unit: formData.unit,
        comparator: formData.comparator,
        frequency: formData.frequency,
        review_frequency: formData.reviewFrequency,
        owner_email: formData.ownerId || null,
      }).select().single();
      if (error) {
        setDataError('No se pudo guardar el indicador. Inténtalo nuevamente.');
        return;
      }
      setIndicators([...indicators, toIndicator(data)]);
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
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-slate-700">Recursos</label><textarea className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-sm" rows={2} value={formData.resource} onChange={e => setFormData({...formData, resource: e.target.value})} /></div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-bold text-[#1D4ED8] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">2. Medición</h3>
            <div className="space-y-4">
              <Input label="Fórmula" value={formData.formula} onChange={e => setFormData({...formData, formula: e.target.value})} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <Select label="Comparador *" required options={[ {value: '>=', label: 'Mayor o igual (>=)'}, {value: '>', label: 'Mayor (>)'}, {value: '<=', label: 'Menor o igual (<=)'}, {value: '<', label: 'Menor (<)'}, {value: '=', label: 'Igual (=)'} ]} value={formData.comparator} onChange={e => setFormData({...formData, comparator: e.target.value})} />
                <Input label="Meta *" type="number" step="0.01" required value={formData.target} onChange={e => setFormData({...formData, target: e.target.value})} />
                <Select label="Unidad *" required options={['%', 'Número', 'Soles', 'Dólares', 'Horas', 'Días', 'Ratio']} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-bold text-[#1D4ED8] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">3. Gestión</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Select label="Plazo *" required options={['Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual']} value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} />
              <Select label="Frecuencia de revisión *" required options={['Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual']} value={formData.reviewFrequency} onChange={e => setFormData({...formData, reviewFrequency: e.target.value})} />
              <Select label="Responsable del reporte *" required options={availableUsers.map(u => ({ value: u.id, label: u.name }))} value={formData.ownerId} onChange={e => setFormData({...formData, ownerId: e.target.value})} />
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
    const isApproved = ind.approvalStatus === 'Aprobado';

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
            {isResponsibleManager && <div className="flex gap-2"><Button onClick={() => navigateTo('edit-target', 'Editar meta', { indicatorId: ind.id })} variant="secondary" className="text-sm">Editar meta</Button><Button disabled={!isApproved} onClick={() => navigateTo('report-indicator', 'Registrar Resultado', { indicatorId: ind.id })} variant="secondary" className="text-sm"><Plus className="w-4 h-4"/> Registrar Resultado</Button></div>}
          </div>
          {!isApproved && <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">Este indicador está <strong>{ind.approvalStatus || 'pendiente de aprobación GCG'}</strong>. La gerencia responsable podrá reportar resultados cuando GCG lo apruebe.</div>}
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
                    <td className="px-6 py-4 text-slate-500">{r.registeredDate || r.date}</td>
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
    const [formData, setFormData] = useState({ period: '', result: '', obs: '' });
    const registrationDate = new Date().toLocaleDateString('en-CA');
    const registrationDateLabel = registrationDate.split('-').reverse().join('-');
    const formatPeriod = (value) => { const [year, month] = value.split('-'); const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']; return value ? `${months[Number(month) - 1]},${year}` : ''; };

    const handleSubmit = async (e) => {
      e.preventDefault();
      const calcStatus = calculateIndicatorStatus(formData.result, ind.target, ind.comparator);
      const { data, error } = await supabase.from('indicator_reports').insert({
        indicator_id: ind.id,
        period: formatPeriod(formData.period),
        result: parseFloat(formData.result),
        status: calcStatus,
        registered_date: registrationDate,
        observations: formData.obs,
        created_by: session.user.id,
      }).select().single();
      if (error) {
        setDataError('No se pudo registrar el resultado. Inténtalo nuevamente.');
        return;
      }
      const { error: indicatorError } = await supabase.from('indicators').update({ status: calcStatus, updated_at: new Date().toISOString() }).eq('id', ind.id);
      if (indicatorError) {
        setDataError('El resultado fue guardado, pero no se pudo actualizar el estado del indicador.');
        await loadOperationalData();
        return;
      }
      setReports([...reports, toReport(data)]);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Periodo de Registro *" type="month" required value={formData.period} onChange={e => setFormData({...formData, period: e.target.value})} /><div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-slate-700">Fecha de registro</label><div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">{registrationDateLabel}</div></div></div>
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

  const SettingsView = () => <div className="max-w-3xl fade-in space-y-6"><div><h1 className="text-2xl font-bold text-slate-900">Configuración</h1><p className="text-slate-500 mt-1">Administra las preferencias generales de Bionexora.</p></div><Card className="p-6"><h2 className="font-semibold text-slate-900">Preferencias de visualización</h2><div className="mt-5 space-y-4"><label className="flex items-center justify-between gap-4 py-3 border-b border-slate-100"><span><span className="block text-sm font-medium text-slate-800">Alertas estratégicas</span><span className="block text-xs text-slate-500 mt-1">Muestra objetivos retrasados en el Monitor.</span></span><input type="checkbox" defaultChecked className="w-4 h-4 accent-[#D71920]" /></label><label className="flex items-center justify-between gap-4 py-3"><span><span className="block text-sm font-medium text-slate-800">Vista compacta</span><span className="block text-xs text-slate-500 mt-1">Reduce el espacio entre elementos del dashboard.</span></span><input type="checkbox" className="w-4 h-4 accent-[#D71920]" /></label></div></Card><Card className="p-6"><h2 className="font-semibold text-slate-900">Sesión</h2><p className="text-sm text-slate-500 mt-2">Correo: {session?.user?.email}</p><p className="text-sm text-slate-500 mt-1">Rol actual: {selectedRole?.name || ROLE_LABELS[assignedRole]}</p><div className="mt-4 flex flex-wrap gap-3">{isSuperAdmin && <Button variant="secondary" onClick={() => { setSelectedRole(null); setCurrentView('dashboard'); }}>Cambiar rol</Button>}<Button variant="secondary" onClick={signOut}><LogOut className="w-4 h-4" />Cerrar sesión</Button></div></Card><Card className="p-6"><h2 className="font-semibold text-slate-900">Información de la plataforma</h2><p className="text-sm text-slate-500 mt-2">Bionexora · Plataforma estratégica de Biomont</p></Card></div>;

  const AuthShell = ({ children }) => <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-5 relative overflow-hidden"><div className="absolute -top-32 -right-28 w-96 h-96 rounded-full bg-red-100/60 blur-3xl" /><div className="w-full max-w-5xl relative">{children}</div></main>;

  if (authLoading) return <AuthShell><div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm"><img src={biomontLogo} alt="Biomont" className="h-16 w-auto object-contain mx-auto mb-5" /><p className="text-slate-600">Verificando tu acceso…</p></div></AuthShell>;

  if (!session) return <AuthShell><div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm"><img src={biomontLogo} alt="Biomont" className="h-16 w-auto object-contain mx-auto mb-6" /><p className="text-sm font-bold text-[#D71920] uppercase tracking-[0.2em]">Plataforma estratégica</p><h1 className="text-3xl font-bold text-slate-900 mt-3">Bienvenido a Bionexora</h1><p className="text-slate-500 mt-3">Ingresa con tu cuenta corporativa de Microsoft. Tu rol será asignado según tu correo.</p>{authError && <p className="mt-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{authError}</p>}<Button className="mt-7 w-full" onClick={signInWithMicrosoft}>Iniciar sesión con Microsoft <ArrowRight className="w-4 h-4" /></Button><p className="text-center text-xs text-slate-400 mt-6">Biomont · Bionexora</p></div></AuthShell>;

  if (!selectedRole) {
    const roles = [
      { key: 'gerente_general', name: 'Gerente general', description: 'Consulta el avance estratégico global de los objetivos.', icon: LayoutDashboard, color: 'bg-red-50 text-[#D71920] border-red-100' },
      { key: 'gerente_responsable', name: 'Gerente responsable', description: 'Gestiona objetivos, acciones estratégicas, indicadores y resultados.', icon: Target, color: 'bg-blue-50 text-blue-600 border-blue-100' },
      { key: 'gcg', name: 'GCG', description: 'Revisa, aprueba o devuelve indicadores para su reformulación.', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
    ];
    return <AuthShell><div className="text-center mb-9"><img src={biomontLogo} alt="Biomont" className="h-20 w-auto object-contain mx-auto mb-6" /><p className="text-sm font-bold text-[#D71920] uppercase tracking-[0.2em]">Super administrador</p><h1 className="text-4xl font-bold text-slate-900 mt-2">Selecciona una vista</h1><p className="text-slate-500 mt-3 max-w-xl mx-auto">Elige el rol con el que deseas ingresar a Bionexora.</p></div><div className="grid grid-cols-1 md:grid-cols-3 gap-5">{roles.map(role => { const Icon = role.icon; return <button key={role.name} onClick={() => setSelectedRole(role)} className="bg-white border border-slate-200 rounded-2xl p-6 text-left shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-[#D71920]/40 transition-all group"><div className={`w-12 h-12 border rounded-xl flex items-center justify-center ${role.color}`}><Icon className="w-6 h-6" /></div><h2 className="text-lg font-bold text-slate-900 mt-5">{role.name}</h2><p className="text-sm text-slate-500 leading-6 mt-2">{role.description}</p><div className="flex items-center gap-2 text-sm font-semibold text-[#D71920] mt-6">Ingresar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div></button>})}</div><div className="text-center mt-7"><button onClick={signOut} className="text-sm text-slate-500 hover:text-slate-800">Cerrar sesión de {session.user.email}</button></div></AuthShell>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      <aside className="w-64 bg-[#0F172A] text-slate-300 flex-col hidden md:flex fixed h-full z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-2"><img src={biomontLogo} alt="Biomont" className="w-12 h-8 object-contain" /><span className="text-white font-bold text-lg tracking-tight">Bionexora</span></div>
        </div>
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="px-4 space-y-1">
            <button onClick={() => navigateTo('dashboard', 'Monitor')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-[#1e293b] text-white' : 'hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard className="w-5 h-5" /> Monitor</button>
            <div className="pt-4 pb-1"><p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestión Estratégica</p></div>
            <button onClick={() => navigateTo(isGeneralManager ? 'new-objective' : 'objectives', isGeneralManager ? 'Crear objetivo' : 'Objetivos')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${(currentView.includes('objective') && currentView !== 'dashboard') ? 'bg-[#1e293b] text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Target className="w-5 h-5" /> {isGeneralManager ? 'Crear objetivo' : 'Objetivos'}</button>
            {isGcg && <button onClick={() => navigateTo('gcg-review', 'Revisión GCG')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'gcg-review' ? 'bg-[#1e293b] text-white' : 'hover:bg-slate-800 hover:text-white'}`}><CheckCircle2 className="w-5 h-5" /> Revisión GCG</button>}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2"><div className="w-9 h-9 shrink-0 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white">{(session?.user?.user_metadata?.full_name || session?.user?.email || 'U').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div><div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-white truncate">{session?.user?.user_metadata?.full_name || session?.user?.email}</p><p className="text-xs text-slate-500 truncate">{selectedRole.name}</p></div><button onClick={() => navigateTo('settings', 'Configuración')} aria-label="Abrir configuración" className="p-1 rounded hover:bg-slate-700"><Settings className="w-4 h-4 text-slate-400 hover:text-white" /></button></div>
        </div>
      </aside>
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 min-h-16 shrink-0 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 sticky top-0 z-50 isolate overflow-hidden shadow-sm gap-3">
           {navHistory.length > 1 && <button onClick={goBack} className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900" aria-label="Retroceder"><ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Atrás</span></button>}
           <div className="flex items-center text-sm text-slate-500 font-medium min-w-0 overflow-x-auto whitespace-nowrap">
             {navHistory.map((nav, idx) => (
               <React.Fragment key={idx}>
                 <button disabled={idx === navHistory.length - 1} className={`transition-colors ${idx === navHistory.length - 1 ? 'text-[#0F172A] font-semibold cursor-default' : 'hover:text-[#1D4ED8] cursor-pointer'}`} onClick={() => restoreHistory(idx)}>{nav.name}</button>
                 {idx < navHistory.length - 1 && <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />}
               </React.Fragment>
             ))}
           </div>
        </header>
        <div className="p-6 md:p-8 flex-1 relative z-0">
          {dataError && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3"><span>{dataError}</span><button onClick={() => setDataError('')} className="font-semibold shrink-0">Cerrar</button></div>}
          {currentView === 'dashboard' && <MonitorView />}
          {currentView === 'objectives' && <ObjectivesView />}
          {currentView === 'new-objective' && <ObjectiveFormView />}
          {currentView === 'objective-detail' && <ObjectiveDetailView />}
          {currentView === 'new-project' && <ProjectFormView />}
          {currentView === 'edit-action' && <EditActionView />}
          {currentView === 'new-indicator' && <IndicatorFormView />}
          {currentView === 'edit-target' && <EditTargetView />}
          {currentView === 'gcg-review' && <GcgReviewView />}
          {currentView === 'settings' && <SettingsView />}
          {currentView === 'indicator-detail' && <IndicatorDetailView />}
          {currentView === 'report-indicator' && <ReportFormView />}
        </div>
      </main>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 z-50">
        <button onClick={() => navigateTo('dashboard', 'Monitor')} className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-[#D71920]' : 'text-slate-500'}`}><LayoutDashboard className="w-5 h-5" /><span className="text-[10px] font-medium">Monitor</span></button>
        {isGeneralManager ? <button onClick={() => navigateTo('new-objective', 'Nuevo Objetivo')} className="flex flex-col items-center gap-1 text-[#1D4ED8]"><div className="bg-blue-50 p-2 rounded-full mb-[-10px] translate-y-[-10px] border shadow-sm"><Plus className="w-5 h-5" /></div><span className="text-[10px] font-medium">Objetivo</span></button> : <button onClick={() => navigateTo('objectives', 'Objetivos')} className="flex flex-col items-center gap-1 text-slate-500"><Target className="w-5 h-5" /><span className="text-[10px] font-medium">Objetivos</span></button>}
        <button className="flex flex-col items-center gap-1 text-slate-500 opacity-50"><User className="w-5 h-5" /><span className="text-[10px] font-medium">Perfil</span></button>
      </div>
    </div>
  );
}
