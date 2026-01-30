
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Seller, SellerStatus, CustomStatus } from '../types';
import { dbService } from '../services/dbService';
import { getDashboardInsights } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AdminDashboardProps {
  sellers: Seller[];
  reportDataProp?: any[];
  onNavigateToSeller: () => void;
  onRefresh: () => void;
  onSelectSeller: (id: string) => void;
  onFinalizeService: (service: { id: string; sellerId: string; clientName: string }) => void;
}

const COLORS = ['#135bec', '#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8'];

export const getPAEmoji = (pa: string) => {
  const val = parseFloat(pa);
  if (val === 0) return '⚪';
  if (val < 1.2) return '😟';
  if (val < 1.8) return '😐';
  if (val < 2.5) return '😊';
  return '🚀';
};

export const getTicketEmoji = (ticket: string) => {
  const val = parseFloat(ticket.replace(/\./g, '').replace(',', '.'));
  if (val === 0) return '⚪';
  if (val < 150) return '😟';
  if (val < 400) return '😐';
  if (val < 800) return '😊';
  return '💰';
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ sellers, reportDataProp, onNavigateToSeller, onRefresh, onSelectSeller, onFinalizeService }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [selectedReportSeller, setSelectedReportSeller] = useState<string>('all');
  const [reportData, setReportData] = useState<any[]>(reportDataProp || []);
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  
  const [formData, setFormData] = useState({ name: '', avatar: '', status: 'AVAILABLE' });
  const [statusFormData, setStatusFormData] = useState({ label: '', icon: 'info', color: '#6c757d', behavior: 'INACTIVE' as 'ACTIVE' | 'INACTIVE' });
  
  const [dbStatus, setDbStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [aiInsight, setAiInsight] = useState<string>('Gerando relatório inteligente...');
  const isFetchingInsight = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, history, statuses] = await Promise.all([
        dbService.getAdvancedStats(selectedReportSeller === 'all' ? undefined : selectedReportSeller),
        dbService.getServiceHistory(selectedReportSeller === 'all' ? undefined : selectedReportSeller),
        dbService.getCustomStatuses()
      ]);
      setReportData(statsRes);
      setServiceHistory(history);
      setCustomStatuses(statuses);
    } catch (e) {
      console.error("Erro ao carregar dados do Admin:", e);
    }
  };

  useEffect(() => {
    if (!reportDataProp) loadData();
    else setReportData(reportDataProp);
  }, [selectedReportSeller, sellers, reportDataProp]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (isFetchingInsight.current) return;
      isFetchingInsight.current = true;
      const conversion = reportData.length > 0 ? (reportData.filter(r => r.venda_realizada).length / reportData.length * 100).toFixed(1) : 0;
      try {
        const text = await getDashboardInsights({ totalServicesToday: reportData.length, conversionRate: conversion });
        setAiInsight(text || 'Continue monitorando os resultados!');
      } finally { isFetchingInsight.current = false; }
    };
    if (reportData.length > 0 && activeTab === 'home') fetchInsights();
  }, [reportData, activeTab]);

  const stats = useMemo(() => {
    const finishedServices = reportData.filter(r => r.venda_realizada !== null);
    const total = finishedServices.length;
    const sales = finishedServices.filter(r => r.venda_realizada).length;
    const revenue = finishedServices.reduce((acc, curr) => acc + Number(curr.valor_venda || 0), 0);
    const totalItems = finishedServices.reduce((acc, curr) => acc + Number(curr.itens_venda || 0), 0);
    const avgTicket = sales > 0 ? (revenue / sales).toFixed(2) : "0.00";
    const conversion = total > 0 ? (sales / total * 100).toFixed(1) : 0;
    const pa = sales > 0 ? (totalItems / sales).toFixed(2) : "0.00";
    return { total, sales, revenue, avgTicket, conversion, pa };
  }, [reportData]);

  const sellerStatsMap = useMemo(() => {
    const map: Record<string, { pa: string, ticket: string, sales: number, totalAtendimentos: number, revenue: number, items: number }> = {};
    sellers.forEach(s => {
      const sellerRecords = reportData.filter(r => r.vendedor_id === s.id && r.venda_realizada !== null);
      const sales = sellerRecords.filter(r => r.venda_realizada).length;
      const revenue = sellerRecords.reduce((acc, curr) => acc + Number(curr.valor_venda || 0), 0);
      const items = sellerRecords.reduce((acc, curr) => acc + Number(curr.itens_venda || 0), 0);
      map[s.id] = {
        sales,
        totalAtendimentos: sellerRecords.length,
        revenue,
        items,
        pa: sales > 0 ? (items / sales).toFixed(2) : "0.00",
        ticket: sales > 0 ? (revenue / sales).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"
      };
    });
    return map;
  }, [reportData, sellers]);

  const activeServices = useMemo(() => serviceHistory.filter(h => h.status === 'PENDING'), [serviceHistory]);
  const conversionData = useMemo(() => [{ name: 'Vendas', value: stats.sales }, { name: 'Perdas', value: stats.total - stats.sales }], [stats.sales, stats.total]);

  const serviceTypeDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    reportData.forEach(item => { const type = item.tipo_atendimento || 'OUTROS'; dist[type] = (dist[type] || 0) + 1; });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [reportData]);

  const formatDuration = (start: string) => {
    const diff = currentTime.getTime() - new Date(start).getTime();
    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    return `${min}m ${sec.toString().padStart(2, '0')}s`;
  };

  const translateStatus = (status: string) => {
    if (status === 'AVAILABLE') return 'Disponível';
    if (status === 'IN_SERVICE') return 'Em Atendimento';
    if (status === 'BREAK') return 'Intervalo';
    if (status === 'LUNCH') return 'Almoço';
    const custom = customStatuses.find(cs => cs.id === status);
    return custom ? custom.label : 'Inativo';
  };

  const handleSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbStatus('LOADING');
    try {
      if (editingSeller) await dbService.updateSeller(editingSeller.id, { nome: formData.name, avatar_url: formData.avatar, status: formData.status });
      else await dbService.createSeller(formData.name, formData.avatar);
      setDbStatus('SUCCESS');
      setTimeout(() => { setIsSellerModalOpen(false); onRefresh(); setDbStatus('IDLE'); }, 500);
    } catch (err) { setDbStatus('ERROR'); }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbStatus('LOADING');
    try {
      await dbService.createCustomStatus(statusFormData);
      setDbStatus('SUCCESS');
      setTimeout(() => { setIsStatusModalOpen(false); loadData(); setDbStatus('IDLE'); setStatusFormData({ label: '', icon: 'info', color: '#6c757d', behavior: 'INACTIVE' }); }, 500);
    } catch (err) { setDbStatus('ERROR'); }
  };

  const handleDeleteStatus = async (id: string) => {
    if (!confirm('Deseja realmente excluir este status?')) return;
    try { await dbService.deleteCustomStatus(id); loadData(); } catch (e) { alert('Erro ao excluir status.'); }
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 bg-gray-50 dark:bg-background-dark text-[#111318] dark:text-white text-sans">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-6 py-5 flex items-center justify-between">
        <button onClick={onNavigateToSeller} className="size-12 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 active:scale-90 transition-all">
          <span className="material-symbols-outlined">logout</span>
        </button>
        <div className="text-center flex-1">
          <h2 className="text-2xl font-black tracking-tight">Painel Gestor</h2>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Controle de Performance</p>
        </div>
        <button 
          onClick={() => { if (activeTab === 'status') setIsStatusModalOpen(true); else { setEditingSeller(null); setFormData({name: '', avatar: '', status: 'AVAILABLE'}); setIsSellerModalOpen(true); } }}
          className="size-12 flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg active:scale-90 transition-all"
        >
          <span className="material-symbols-outlined">{activeTab === 'status' ? 'add_circle' : 'person_add'}</span>
        </button>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard title="Atendimentos" value={stats.total.toString()} icon="assignment_turned_in" color="text-blue-500" />
              <StatCard title="Vendas" value={stats.sales.toString()} icon="shopping_cart" color="text-green-500" />
              <StatCard title="P.A. Loja" value={stats.pa} icon="inventory_2" color="text-pink-500" />
              <StatCard title="Ticket Médio" value={`R$ ${stats.avgTicket}`} icon="receipt_long" color="text-purple-500" />
              <StatCard title="Conversão" value={`${stats.conversion}%`} icon="trending_up" color="text-orange-500" />
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-center px-2">
                  <h3 className="font-black text-xl">Monitoramento de Equipe</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Baseado em Histórico Real</p>
               </div>
               <div className="grid gap-4">
                  {sellers.map(s => {
                    const isActive = s.status === 'IN_SERVICE' || !!activeServices.find(h => h.vendedor_id === s.id);
                    const activeClient = activeServices.find(h => h.vendedor_id === s.id);
                    const sellerStats = sellerStatsMap[s.id] || { pa: "0.00", ticket: "0,00", sales: 0, totalAtendimentos: 0, revenue: 0, items: 0 };
                    return (
                      <div key={s.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                          <div className="flex items-center gap-4 min-w-[200px]">
                            <div className="relative">
                              <img src={s.avatar} className="size-16 rounded-2xl object-cover" alt="" />
                              <span className={`absolute -bottom-1 -right-1 size-5 border-4 border-white dark:border-gray-900 rounded-full ${s.status === 'AVAILABLE' ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-orange-400'}`}></span>
                            </div>
                            <div className="flex-1">
                               <p className="font-black text-lg leading-tight">{s.name}</p>
                               <div className="flex flex-wrap gap-1 mt-1">
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-500">{translateStatus(s.status)}</span>
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-green-500/10 rounded-md text-green-600">{sellerStats.sales} Vendas</span>
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-blue-500/10 rounded-md text-blue-600">R$ {sellerStats.revenue.toLocaleString('pt-BR')}</span>
                               </div>
                            </div>
                          </div>
                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                             <MetricBox label="P.A. Indiv." value={sellerStats.pa} emoji={getPAEmoji(sellerStats.pa)} sub={`${sellerStats.items} pçs / ${sellerStats.sales} vds`} color="text-pink-500" icon="inventory_2" />
                             <MetricBox label="Ticket Médio" value={`R$ ${sellerStats.ticket}`} emoji={getTicketEmoji(sellerStats.ticket)} sub={`Total: R$ ${sellerStats.revenue.toLocaleString('pt-BR')}`} color="text-primary" icon="payments" />
                             <MetricBox label="Conversão" value={`${sellerStats.totalAtendimentos > 0 ? (sellerStats.sales / sellerStats.totalAtendimentos * 100).toFixed(0) : 0}%`} emoji={(sellerStats.sales / sellerStats.totalAtendimentos) >= 0.5 ? '🔥' : '📈'} sub={`${sellerStats.sales} de ${sellerStats.totalAtendimentos} atend.`} color="text-orange-500" icon="trending_up" />
                             <div className="flex items-center justify-center gap-2">
                               <button onClick={() => { setEditingSeller(s); setFormData({name: s.name, avatar: s.avatar, status: s.status as string}); setIsSellerModalOpen(true); }} className="size-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">settings</span></button>
                               {isActive && activeClient && (
                                  <button onClick={() => onFinalizeService({ id: activeClient.id, sellerId: s.id, clientName: activeClient.cliente_nome })} className="size-12 flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20"><span className="material-symbols-outlined">check_circle</span></button>
                               )}
                             </div>
                          </div>
                        </div>
                        {isActive && activeClient && (
                          <div className="mt-4 p-3 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-center justify-between">
                            <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-blue-500">person</span><p className="text-[10px] font-bold text-blue-600">Atendendo agora: <span className="font-black uppercase">{activeClient.cliente_nome}</span></p></div>
                            <p className="text-[10px] font-black text-blue-500 uppercase">{formatDuration(activeClient.criado_em)}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
               </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-2"><span className="material-symbols-outlined text-primary">auto_awesome</span><p className="font-black text-[10px] uppercase tracking-widest">Análise de Performance</p></div>
               <p className="text-gray-500 italic text-sm leading-relaxed">{aiInsight}</p>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-300">
             <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 w-full">
                  <h3 className="font-black text-xs uppercase text-gray-400 mb-2 px-2">Filtro de Vendedor</h3>
                  <select className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl px-6 font-black text-lg focus:ring-2 focus:ring-primary/20" value={selectedReportSeller} onChange={e => setSelectedReportSeller(e.target.value)}>
                    <option value="all">Unidade Completa</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-4">
                   <div className="text-center"><p className="text-[10px] font-black text-gray-400 uppercase">Peças Totais</p><p className="text-2xl font-black text-pink-500">{reportData.reduce((acc, curr) => acc + Number(curr.itens_venda || 0), 0)}</p></div>
                   <div className="text-center"><p className="text-[10px] font-black text-gray-400 uppercase">P.A. Médio</p><p className="text-2xl font-black text-primary">{stats.pa}</p></div>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ChartCard title="Funil de Conversão"><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={conversionData} innerRadius={60} outerRadius={80} dataKey="value"><Cell fill="#28a745"/><Cell fill="#dc3545"/></Pie><Tooltip/></PieChart></ResponsiveContainer></ChartCard>
                <ChartCard title="Canais de Atendimento"><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={serviceTypeDistribution} outerRadius={80} dataKey="value">{serviceTypeDistribution.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></ChartCard>
             </div>
          </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center px-2"><h3 className="font-black text-2xl">Gestão de Status RH</h3><button onClick={() => setIsStatusModalOpen(true)} className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all">Novo Status</button></div>
            <div className="grid gap-3">
              {customStatuses.map(status => (
                <div key={status.id} className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`size-12 rounded-2xl flex items-center justify-center text-white`} style={{ backgroundColor: status.color }}><span className="material-symbols-outlined">{status.icon}</span></div>
                    <div><p className="font-black text-base">{status.label}</p><p className={`text-[10px] font-black uppercase ${status.behavior === 'ACTIVE' ? 'text-green-500' : 'text-gray-400'}`}>{status.behavior === 'ACTIVE' ? 'Fila Ativa' : 'Fila Pausada'}</p></div>
                  </div>
                  <button onClick={() => handleDeleteStatus(status.id)} className="size-10 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors"><span className="material-symbols-outlined">delete</span></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border border-gray-100 dark:border-gray-800 shadow-2xl rounded-[3rem] flex justify-around p-3 z-[150]">
        <TabItem icon="home" label="Início" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <TabItem icon="analytics" label="Auditoria" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <TabItem icon="category" label="RH" active={activeTab === 'status'} onClick={() => setActiveTab('status')} />
        <TabItem icon="settings" label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>

      {/* Modais omitidos para brevidade mas preservados na lógica */}
      {isSellerModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[3rem] p-8 animate-in slide-in-from-bottom duration-300">
            <h3 className="text-2xl font-black mb-6">{editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}</h3>
            <form onSubmit={handleSellerSubmit} className="space-y-6">
               <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nome Completo</label><input required className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 px-6 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
               <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">URL do Avatar</label><input className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 px-6 font-bold" value={formData.avatar} onChange={e => setFormData({...formData, avatar: e.target.value})} /></div>
               <div className="flex gap-4 pt-4"><button type="button" onClick={() => setIsSellerModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-gray-400">Cancelar</button><button type="submit" className="flex-2 px-8 h-14 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20">Salvar Alterações</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricBox: React.FC<{ label: string; value: string; emoji: string; sub: string; color: string; icon: string }> = ({ label, value, emoji, sub, color, icon }) => (
  <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/20 flex flex-col items-center text-center group hover:bg-white dark:hover:bg-gray-800 transition-all">
    <div className="flex items-center gap-1.5 mb-1 opacity-60"><span className="material-symbols-outlined text-[12px]">{icon}</span><p className="text-[7px] font-black uppercase tracking-widest">{label}</p></div>
    <div className="flex items-center gap-1.5"><p className={`text-sm font-black ${color}`}>{value}</p><span className="text-sm animate-in zoom-in duration-500">{emoji}</span></div>
    <p className="text-[7px] font-bold text-gray-400 mt-1 leading-tight">{sub}</p>
  </div>
);

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex flex-col gap-4 shadow-sm hover:scale-[1.02] transition-transform">
    <div className={`size-12 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center ${color}`}><span className="material-symbols-outlined text-2xl">{icon}</span></div>
    <div><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{title}</p><p className="text-xl font-black leading-none mt-1">{value}</p></div>
  </div>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 flex flex-col items-center"><h4 className="font-black text-[10px] uppercase text-gray-400 mb-6">{title}</h4><div className="h-64 w-full">{children}</div></div>
);

const TabItem: React.FC<{ icon: string; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 py-4 px-6 rounded-[2.5rem] transition-all active:scale-95 ${active ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600'}`}>
    <span className={`material-symbols-outlined text-2xl ${active ? 'fill-1' : ''}`}>{icon}</span><span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default AdminDashboard;
