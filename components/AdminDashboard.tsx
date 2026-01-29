
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
}

const COLORS = ['#135bec', '#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ sellers, onNavigateToSeller, onRefresh, onSelectSeller }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [selectedReportSeller, setSelectedReportSeller] = useState<string>('all');
  const [reportData, setReportData] = useState<any[]>([]);
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [formData, setFormData] = useState({ name: '', avatar: '', status: 'AVAILABLE' });
  const [statusFormData, setStatusFormData] = useState<{ label: string; icon: string; color: string; behavior: 'INACTIVE' | 'ACTIVE' }>({ 
    label: '', 
    icon: 'beach_access', 
    color: '#135bec', 
    behavior: 'INACTIVE' 
  });
  
  const [dbStatus, setDbStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [aiInsight, setAiInsight] = useState<string>('Gerando relatório inteligente...');

  const loadData = async () => {
    try {
      const [stats, history, statuses] = await Promise.all([
        dbService.getAdvancedStats(selectedReportSeller === 'all' ? undefined : selectedReportSeller),
        dbService.getServiceHistory(selectedReportSeller === 'all' ? undefined : selectedReportSeller),
        dbService.getCustomStatuses()
      ]);
      setReportData(stats);
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
    const total = reportData.length;
    const sales = reportData.filter(r => r.venda_realizada).length;
    const revenue = reportData.reduce((acc, curr) => acc + Number(curr.valor_venda || 0), 0);
    const avgTicket = sales > 0 ? (revenue / sales).toFixed(2) : "0.00";
    const conversion = total > 0 ? (sales / total * 100).toFixed(1) : 0;
    
    return { total, sales, revenue, avgTicket, conversion };
  }, [reportData]);

  const serviceTypeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    reportData.forEach(row => counts[row.tipo_atendimento] = (counts[row.tipo_atendimento] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reportData]);

  const conversionData = useMemo(() => {
    let sales = 0, noSales = 0;
    reportData.forEach(row => row.venda_realizada ? sales++ : noSales++);
    return [{ name: 'Vendas', value: sales }, { name: 'Sem Venda', value: noSales }];
  }, [reportData]);

  const formatDuration = (start: string, end?: string) => {
    if (!end) return "Em aberto";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = ((diff % 60000) / 1000).toFixed(0);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
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

  const translateStatus = (status: string) => {
    if (status === 'AVAILABLE') return 'Disponível';
    if (status === 'IN_SERVICE') return 'Em Atendimento';
    if (status === 'BREAK') return 'Intervalo';
    if (status === 'LUNCH') return 'Almoço';
    const custom = customStatuses.find(cs => cs.id === status);
    return custom ? custom.label : 'Inativo';
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Atendimentos" value={stats.total.toString()} icon="assignment" color="text-blue-500" />
              <StatCard title="Faturamento" value={`R$ ${stats.revenue.toFixed(0)}`} icon="payments" color="text-green-500" />
              <StatCard title="Ticket Médio" value={`R$ ${stats.avgTicket}`} icon="receipt_long" color="text-purple-500" />
              <StatCard title="Conversão" value={`${stats.conversion}%`} icon="trending_up" color="text-orange-500" />
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  <p className="font-black text-[10px] uppercase tracking-widest">Análise de Performance</p>
               </div>
               <p className="text-gray-500 italic text-sm leading-relaxed">{aiInsight}</p>
            </div>

            <div className="space-y-4">
               <h3 className="font-black text-xl px-2">Monitoramento de Equipe</h3>
               <div className="grid gap-3">
                  {sellers.map(s => (
                    <div key={s.id} className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <img src={s.avatar} className="size-12 rounded-2xl object-cover" alt="" />
                      <div className="flex-1">
                        <p className="font-black text-base">{s.name}</p>
                        <p className="text-[10px] font-black uppercase text-gray-400">{translateStatus(s.status)}</p>
                      </div>
                      <button 
                        onClick={() => { setEditingSeller(s); setFormData({name: s.name, avatar: s.avatar, status: s.status}); setIsSellerModalOpen(true); }}
                        className="text-primary font-black text-[10px] uppercase bg-primary/5 px-4 py-2 rounded-xl active:scale-95"
                      >
                        Gerir
                      </button>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-300">
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

             {/* Histórico Detalhado */}
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
                          {serviceHistory.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
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
                                {formatDuration(item.criado_em, item.finalizado_em)}
                              </td>
                              <td className="px-6 py-5">
                                <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full ${item.venda_realizada ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                  {item.venda_realizada ? 'Venda' : item.motivo_perda || 'Sem Venda'}
                                </span>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <p className={`text-sm font-black ${item.venda_realizada ? 'text-green-500' : 'text-gray-300'}`}>
                                  R$ {Number(item.valor_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {serviceHistory.length === 0 && (
                        <div className="py-20 text-center opacity-20">
                          <span className="material-symbols-outlined text-6xl">history</span>
                          <p className="text-xs font-black uppercase mt-2">Nenhum registro encontrado</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Outras abas permanecem iguais (Status e Settings) */}
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border border-gray-100 dark:border-gray-800 shadow-2xl rounded-[3rem] flex justify-around p-3 z-[150]">
        <TabItem icon="home" label="Início" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <TabItem icon="analytics" label="Auditoria" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <TabItem icon="category" label="RH" active={activeTab === 'status'} onClick={() => setActiveTab('status')} />
        <TabItem icon="settings" label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
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
