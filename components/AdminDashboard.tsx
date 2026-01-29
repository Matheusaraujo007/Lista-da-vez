
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Seller, SellerStatus, CustomStatus } from '../types';
import { dbService } from '../services/dbService';
import { getDashboardInsights } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AdminDashboardProps {
  sellers: Seller[];
  onNavigateToSeller: () => void;
  onRefresh: () => void;
  onSelectSeller: (id: string) => void;
  onFinalizeService: (service: { id: string; sellerId: string; clientName: string }) => void;
}

const COLORS = ['#135bec', '#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ sellers, onNavigateToSeller, onRefresh, onSelectSeller, onFinalizeService }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [selectedReportSeller, setSelectedReportSeller] = useState<string>('all');
  const [reportData, setReportData] = useState<any[]>([]);
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [formData, setFormData] = useState({ name: '', avatar: '', status: 'AVAILABLE' });
  
  const [dbStatus, setDbStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [aiInsight, setAiInsight] = useState<string>('Gerando relatório inteligente...');

  // Atualiza o relógio interno para os timers de "tempo em mesa"
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
    loadData();
  }, [selectedReportSeller, sellers]);

  useEffect(() => {
    const fetchInsights = async () => {
      const conversion = reportData.length > 0 ? (reportData.filter(r => r.venda_realizada).length / reportData.length * 100).toFixed(1) : 0;
      const text = await getDashboardInsights({ 
        totalServicesToday: reportData.length, 
        conversionRate: conversion 
      });
      setAiInsight(text || '');
    };
    if (reportData.length > 0) fetchInsights();
  }, [reportData]);

  const stats = useMemo(() => {
    const finishedServices = reportData.filter(r => r.venda_realizada !== null);
    const total = finishedServices.length;
    const sales = finishedServices.filter(r => r.venda_realizada).length;
    const revenue = finishedServices.reduce((acc, curr) => acc + Number(curr.valor_venda || 0), 0);
    const avgTicket = sales > 0 ? (revenue / sales).toFixed(2) : "0.00";
    const conversion = total > 0 ? (sales / total * 100).toFixed(1) : 0;
    
    return { total, sales, revenue, avgTicket, conversion };
  }, [reportData]);

  const activeServices = useMemo(() => {
    return serviceHistory.filter(h => h.status === 'PENDING');
  }, [serviceHistory]);

  const conversionData = useMemo(() => [
    { name: 'Vendas', value: stats.sales },
    { name: 'Perdas', value: stats.total - stats.sales }
  ], [stats.sales, stats.total]);

  const serviceTypeDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    reportData.forEach(item => {
      const type = item.tipo_atendimento || 'OUTROS';
      dist[type] = (dist[type] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [reportData]);

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : currentTime.getTime();
    const diff = endTime - startTime;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
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
      if (editingSeller) {
        await dbService.updateSeller(editingSeller.id, { 
          nome: formData.name, 
          avatar_url: formData.avatar, 
          status: formData.status 
        });
      } else {
        await dbService.createSeller(formData.name, formData.avatar);
      }
      setDbStatus('SUCCESS');
      setTimeout(() => { setIsSellerModalOpen(false); onRefresh(); setDbStatus('IDLE'); }, 500);
    } catch (err) { setDbStatus('ERROR'); }
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 bg-gray-50 dark:bg-background-dark">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-6 py-5 flex items-center justify-between">
        <button onClick={onNavigateToSeller} className="size-12 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 active:scale-90 transition-all">
          <span className="material-symbols-outlined">logout</span>
        </button>
        <div className="text-center flex-1">
          <h2 className="text-2xl font-black tracking-tight">Administração</h2>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Dashboards & Auditoria</p>
        </div>
        <button 
          onClick={() => { setEditingSeller(null); setFormData({name: '', avatar: '', status: 'AVAILABLE'}); setIsSellerModalOpen(true); }}
          className="size-12 flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg active:scale-90 transition-all"
        >
          <span className="material-symbols-outlined">person_add</span>
        </button>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Cards de Métricas Rápidas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Concluídos" value={stats.total.toString()} icon="assignment_turned_in" color="text-blue-500" />
              <StatCard title="Faturamento" value={`R$ ${stats.revenue.toFixed(0)}`} icon="payments" color="text-green-500" />
              <StatCard title="Ticket Médio" value={`R$ ${stats.avgTicket}`} icon="receipt_long" color="text-purple-500" />
              <StatCard title="Conversão" value={`${stats.conversion}%`} icon="trending_up" color="text-orange-500" />
            </div>

            {/* Atendimentos Pendentes (Em Andamento) */}
            <div className="space-y-4">
               <div className="flex justify-between items-center px-2">
                  <h3 className="font-black text-xl">Atendimentos em Andamento</h3>
                  <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    <span className="size-1.5 bg-blue-500 rounded-full animate-ping"></span>
                    {activeServices.length} Ativos
                  </span>
               </div>
               <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {activeServices.length === 0 ? (
                    <div className="w-full bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 p-8 rounded-[2rem] text-center opacity-40">
                       <p className="text-xs font-black uppercase tracking-widest">Nenhum cliente em mesa no momento</p>
                    </div>
                  ) : (
                    activeServices.map(service => (
                      <div key={service.id} className="min-w-[300px] bg-white dark:bg-gray-900 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                           <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                              <span className="material-symbols-outlined text-xl">person</span>
                           </div>
                           <div className="flex-1">
                              <p className="text-[9px] font-black uppercase text-gray-400">Cliente</p>
                              <p className="font-black text-base leading-tight truncate">{service.cliente_nome}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-blue-500">{formatDuration(service.criado_em)}</p>
                           </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-800">
                           <div className="flex items-center gap-2">
                             <img src={service.vendedor_avatar} className="size-6 rounded-full object-cover" />
                             <p className="text-[10px] font-bold text-gray-500">{service.vendedor_nome.split(' ')[0]}</p>
                           </div>
                           <button 
                             onClick={() => onFinalizeService({ id: service.id, sellerId: service.vendedor_id, clientName: service.cliente_nome })}
                             className="bg-primary/5 hover:bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all active:scale-90"
                           >
                             Finalizar
                           </button>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>

            {/* Insight de IA */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  <p className="font-black text-[10px] uppercase tracking-widest">Análise de Performance</p>
               </div>
               <p className="text-gray-500 italic text-sm leading-relaxed">{aiInsight}</p>
            </div>

            {/* Monitoramento de Equipe */}
            <div className="space-y-4">
               <h3 className="font-black text-xl px-2">Monitoramento de Equipe</h3>
               <div className="grid gap-3">
                  {sellers.map(s => {
                    const isActive = s.status === 'IN_SERVICE';
                    const activeClient = serviceHistory.find(h => h.vendedor_id === s.id && h.status === 'PENDING');
                    
                    return (
                      <div key={s.id} className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className="relative">
                          <img src={s.avatar} className="size-14 rounded-2xl object-cover" alt="" />
                          <span className={`absolute -bottom-1 -right-1 size-4 border-2 border-white dark:border-gray-900 rounded-full ${s.status === 'AVAILABLE' ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-orange-400'}`}></span>
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-base">{s.name}</p>
                          <div className="flex items-center gap-2">
                             <p className={`text-[10px] font-black uppercase ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                                {translateStatus(s.status)}
                             </p>
                             {isActive && activeClient && (
                               <span className="flex items-center gap-1 bg-blue-500/5 px-2 py-0.5 rounded-lg border border-blue-500/10">
                                 <span className="material-symbols-outlined text-[10px] text-blue-500">person</span>
                                 <p className="text-[10px] font-bold text-blue-600 truncate max-w-[80px]">
                                   {activeClient.cliente_nome}
                                 </p>
                               </span>
                             )}
                          </div>
                        </div>
                        
                        {isActive && activeClient ? (
                          <button 
                            onClick={() => onFinalizeService({ id: activeClient.id, sellerId: s.id, clientName: activeClient.cliente_nome })}
                            className="h-10 px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-primary/20 active:scale-95 transition-all"
                          >
                            Finalizar
                          </button>
                        ) : (
                          <button 
                            onClick={() => { setEditingSeller(s); setFormData({name: s.name, avatar: s.avatar, status: s.status}); setIsSellerModalOpen(true); }}
                            className="size-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary transition-colors active:scale-95"
                          >
                            <span className="material-symbols-outlined text-xl">settings</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-300">
             {/* Conteúdo de Auditoria (Mantido conforme versão anterior) */}
             <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 w-full">
                  <h3 className="font-black text-xs uppercase text-gray-400 mb-2 px-2">Filtro de Vendedor</h3>
                  <select 
                    className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl px-6 font-black text-lg focus:ring-2 focus:ring-primary/20" 
                    value={selectedReportSeller} 
                    onChange={e => setSelectedReportSeller(e.target.value)}
                  >
                    <option value="all">Unidade Completa</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-4">
                   <div className="text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Vendas</p>
                      <p className="text-2xl font-black text-green-500">{stats.sales}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Perdas</p>
                      <p className="text-2xl font-black text-red-500">{stats.total - stats.sales}</p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ChartCard title="Funil de Conversão">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={conversionData} innerRadius={60} outerRadius={80} dataKey="value">
                        <Cell fill="#28a745"/><Cell fill="#dc3545"/>
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Canais de Atendimento">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={serviceTypeDistribution} outerRadius={80} dataKey="value">
                        {serviceTypeDistribution.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
             </div>

             <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-black text-2xl">Log de Auditoria</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{serviceHistory.length} Registros</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Data/Hora</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Cliente</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Vendedor</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Duração</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Resultado</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {serviceHistory.map(item => {
                            const isPending = item.status === 'PENDING';
                            return (
                              <tr key={item.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group ${isPending ? 'bg-blue-500/[0.02]' : ''}`}>
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <p className="text-sm font-black text-gray-600 dark:text-gray-300">
                                    {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                                  </p>
                                  <p className="text-[10px] font-bold text-gray-400">
                                    {new Date(item.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </td>
                                <td className="px-6 py-5">
                                  <p className="font-black text-sm">{item.cliente_nome}</p>
                                  <p className="text-[10px] text-primary font-bold uppercase">{item.tipo_atendimento}</p>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-3">
                                    <img src={item.vendedor_avatar} className="size-8 rounded-lg object-cover" />
                                    <p className="text-xs font-bold text-gray-500">{item.vendedor_nome.split(' ')[0]}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-xs font-bold text-gray-400">
                                  {isPending ? (
                                    <span className="text-blue-500 animate-pulse">{formatDuration(item.criado_em)}</span>
                                  ) : (
                                    formatDuration(item.criado_em, item.finalizado_em)
                                  )}
                                </td>
                                <td className="px-6 py-5">
                                  <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full ${
                                    isPending ? 'bg-blue-100 text-blue-600' : 
                                    item.venda_realizada ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                  }`}>
                                    {isPending ? 'Em Andamento' : item.venda_realizada ? 'Venda' : item.motivo_perda || 'Sem Venda'}
                                  </span>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <p className={`text-sm font-black ${isPending ? 'text-gray-400 italic' : item.venda_realizada ? 'text-green-500' : 'text-gray-300'}`}>
                                    {isPending ? '---' : `R$ ${Number(item.valor_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                  </p>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Outras tabs mantidas conforme anterior */}
        {activeTab === 'status' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-300">
            <h3 className="font-black text-2xl px-2">Gestão de Status RH</h3>
            <div className="grid gap-3">
              {customStatuses.map(status => (
                <div key={status.id} className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`size-12 rounded-2xl flex items-center justify-center text-white`} style={{ backgroundColor: status.color }}>
                      <span className="material-symbols-outlined">{status.icon}</span>
                    </div>
                    <div>
                      <p className="font-black text-base">{status.label}</p>
                      <p className={`text-[10px] font-black uppercase ${status.behavior === 'ACTIVE' ? 'text-green-500' : 'text-gray-400'}`}>
                        {status.behavior === 'ACTIVE' ? 'Fila Ativa' : 'Fila Pausada'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-300">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm">
               <h3 className="text-xl font-black mb-6">Configurações Gerais</h3>
               <p className="text-gray-400 text-sm italic">O painel administrativo permite o controle total da jornada de venda.</p>
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

      {/* Modal de Gestão de Vendedor */}
      {isSellerModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[3rem] p-8 animate-in slide-in-from-bottom duration-300">
            <h3 className="text-2xl font-black mb-6">{editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}</h3>
            <form onSubmit={handleSellerSubmit} className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nome Completo</label>
                 <input 
                   required
                   className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 px-6 font-bold"
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-2">URL do Avatar</label>
                 <input 
                   className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 px-6 font-bold"
                   value={formData.avatar}
                   onChange={e => setFormData({...formData, avatar: e.target.value})}
                 />
               </div>
               <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsSellerModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-gray-400">Cancelar</button>
                 <button type="submit" className="flex-2 px-8 h-14 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20">Salvar Alterações</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex flex-col gap-4 shadow-sm">
    <div className={`size-12 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center ${color}`}><span className="material-symbols-outlined text-2xl">{icon}</span></div>
    <div>
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{title}</p>
      <p className="text-xl font-black leading-none">{value}</p>
    </div>
  </div>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 flex flex-col items-center">
    <h4 className="font-black text-[10px] uppercase text-gray-400 mb-6">{title}</h4>
    <div className="h-64 w-full">{children}</div>
  </div>
);

const TabItem: React.FC<{ icon: string; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 py-4 px-6 rounded-[2.5rem] transition-all ${active ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600'}`}>
    <span className={`material-symbols-outlined text-2xl ${active ? 'fill-1' : ''}`}>{icon}</span>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default AdminDashboard;
