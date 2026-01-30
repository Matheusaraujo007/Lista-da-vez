
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Seller, SellerStatus, CustomStatus, StoreGoals } from '../types';
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
  const val = typeof ticket === 'string' ? parseFloat(ticket.replace(/\./g, '').replace(',', '.')) : ticket;
  if (val === 0) return '⚪';
  if (val < 150) return '😟';
  if (val < 400) return '😐';
  if (val < 800) return '😊';
  return '💰';
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ sellers, reportDataProp, onNavigateToSeller, onRefresh, onSelectSeller, onFinalizeService }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [storeGoals, setStoreGoals] = useState<StoreGoals>({ faturamento: 5000, pa: 2, ticket_medio: 350, conversao: 40 });
  const [selectedReportSeller, setSelectedReportSeller] = useState<string>('all');
  const [reportData, setReportData] = useState<any[]>(reportDataProp || []);
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    avatar: '', 
    status: 'AVAILABLE',
    meta_faturamento: '' as string | number,
    meta_pa: '' as string | number,
    meta_ticket: '' as string | number,
    meta_conversao: '' as string | number
  });

  const [statusFormData, setStatusFormData] = useState({ label: '', icon: 'info', color: '#6c757d', behavior: 'INACTIVE' as 'ACTIVE' | 'INACTIVE' });
  const [goalsFormData, setGoalsFormData] = useState<StoreGoals>({ faturamento: 0, pa: 0, ticket_medio: 0, conversao: 0 });
  
  const [dbStatus, setDbStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, history, statuses, goals] = await Promise.all([
        dbService.getAdvancedStats(selectedReportSeller === 'all' ? undefined : selectedReportSeller),
        dbService.getServiceHistory(selectedReportSeller === 'all' ? undefined : selectedReportSeller),
        dbService.getCustomStatuses(),
        dbService.getStoreGoals()
      ]);
      setReportData(statsRes);
      setServiceHistory(history);
      setCustomStatuses(statuses);
      setStoreGoals(goals);
      setGoalsFormData(goals);
    } catch (e) {
      console.error("Erro ao carregar dados do Admin:", e);
    }
  };

  useEffect(() => {
    if (!reportDataProp) loadData();
    else {
      setReportData(reportDataProp);
      dbService.getStoreGoals().then(g => { setStoreGoals(g); setGoalsFormData(g); });
      dbService.getCustomStatuses().then(setCustomStatuses);
    }
  }, [selectedReportSeller, sellers, reportDataProp]);

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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbStatus('LOADING');
    try {
      const sellerData = {
        nome: formData.name,
        avatar_url: formData.avatar,
        status: formData.status,
        meta_faturamento: formData.meta_faturamento === '' ? undefined : Number(formData.meta_faturamento),
        meta_pa: formData.meta_pa === '' ? undefined : Number(formData.meta_pa),
        meta_ticket: formData.meta_ticket === '' ? undefined : Number(formData.meta_ticket),
        meta_conversao: formData.meta_conversao === '' ? undefined : Number(formData.meta_conversao)
      };

      if (editingSeller) {
        await dbService.updateSeller(editingSeller.id, sellerData);
      } else {
        await dbService.createSeller(formData.name, formData.avatar);
        // Atribui metas após criar se for o caso
        if (sellerData.meta_faturamento) {
           const newSellers = await dbService.getSellers();
           const lastCreated = newSellers.find(s => s.name === formData.name);
           if (lastCreated) await dbService.updateSeller(lastCreated.id, sellerData);
        }
      }
      setDbStatus('SUCCESS');
      setTimeout(() => { 
        setIsSellerModalOpen(false); 
        onRefresh(); 
        setDbStatus('IDLE'); 
      }, 500);
    } catch (err) { 
      setDbStatus('ERROR'); 
    }
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

  const handleGoalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbStatus('LOADING');
    try {
      await dbService.updateStoreGoals(goalsFormData);
      setDbStatus('SUCCESS');
      setTimeout(() => { loadData(); setDbStatus('IDLE'); }, 500);
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
          onClick={() => { 
            if (activeTab === 'status') {
              setIsStatusModalOpen(true);
            } else {
              setEditingSeller(null); 
              setFormData({
                name: '', 
                avatar: '', 
                status: 'AVAILABLE',
                meta_faturamento: '',
                meta_pa: '',
                meta_ticket: '',
                meta_conversao: ''
              }); 
              setIsSellerModalOpen(true); 
            }
          }}
          className="size-12 flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg active:scale-90 transition-all"
        >
          <span className="material-symbols-outlined">{activeTab === 'status' ? 'add_circle' : 'person_add'}</span>
        </button>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                 <h3 className="font-black text-xl">Monitor de Metas do Dia</h3>
                 <span className="text-[10px] font-black uppercase text-gray-400">Loja</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <GoalProgressBar label="Faturamento Loja" current={stats.revenue} target={storeGoals.faturamento} prefix="R$ " isCurrency />
                <GoalProgressBar label="P.A. Loja" current={parseFloat(stats.pa)} target={storeGoals.pa} suffix="" />
                <GoalProgressBar label="Ticket Médio" current={parseFloat(stats.avgTicket)} target={storeGoals.ticket_medio} prefix="R$ " isCurrency />
                <GoalProgressBar label="Conversão" current={parseFloat(stats.conversion.toString())} target={storeGoals.conversao} suffix="%" />
              </div>
            </div>

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
                              <img src={s.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} className="size-16 rounded-2xl object-cover" alt="" />
                              <span className={`absolute -bottom-1 -right-1 size-5 border-4 border-white dark:border-gray-900 rounded-full ${s.status === 'AVAILABLE' ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-orange-400'}`}></span>
                            </div>
                            <div className="flex-1">
                               <p className="font-black text-lg leading-tight">{s.name}</p>
                               <div className="flex flex-wrap gap-1 mt-1">
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-500">{(s.status)}</span>
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-green-500/10 rounded-md text-green-600">{sellerStats.sales} Vendas</span>
                               </div>
                            </div>
                          </div>
                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                             <MetricBox label="P.A. Indiv." value={sellerStats.pa} emoji={getPAEmoji(sellerStats.pa)} sub={`${sellerStats.items} pçs`} color="text-pink-500" icon="inventory_2" />
                             <MetricBox label="Ticket Médio" value={`R$ ${sellerStats.ticket}`} emoji={getTicketEmoji(sellerStats.ticket)} sub={`Média`} color="text-primary" icon="payments" />
                             <div className="flex items-center justify-center gap-2">
                               <button 
                                 onClick={() => { 
                                   setEditingSeller(s); 
                                   setFormData({
                                     name: s.name, 
                                     avatar: s.avatar, 
                                     status: s.status as string,
                                     meta_faturamento: s.meta_faturamento || '',
                                     meta_pa: s.meta_pa || '',
                                     meta_ticket: s.meta_ticket || '',
                                     meta_conversao: s.meta_conversao || ''
                                   }); 
                                   setIsSellerModalOpen(true); 
                                 }} 
                                 className="size-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary transition-colors"
                               >
                                 <span className="material-symbols-outlined">settings</span>
                               </button>
                               {isActive && activeClient && (
                                  <button onClick={() => onFinalizeService({ id: activeClient.id, sellerId: s.id, clientName: activeClient.cliente_nome })} className="size-12 flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg"><span className="material-symbols-outlined">check_circle</span></button>
                               )}
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-300">
             <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[3rem] p-10 shadow-sm">
                <h3 className="text-2xl font-black mb-8 text-center">Configuração de Metas da Loja</h3>
                <form onSubmit={handleGoalsSubmit} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Faturamento Alvo (R$)</label>
                        <input type="number" step="0.01" className="w-full h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 px-6 font-black text-xl" value={goalsFormData.faturamento} onChange={e => setGoalsFormData({...goalsFormData, faturamento: parseFloat(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-4">P.A. Alvo</label>
                        <input type="number" step="0.1" className="w-full h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 px-6 font-black text-xl" value={goalsFormData.pa} onChange={e => setGoalsFormData({...goalsFormData, pa: parseFloat(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Ticket Médio Alvo (R$)</label>
                        <input type="number" step="0.01" className="w-full h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 px-6 font-black text-xl" value={goalsFormData.ticket_medio} onChange={e => setGoalsFormData({...goalsFormData, ticket_medio: parseFloat(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Conversão Alvo (%)</label>
                        <input type="number" step="0.1" className="w-full h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 px-6 font-black text-xl" value={goalsFormData.conversao} onChange={e => setGoalsFormData({...goalsFormData, conversao: parseFloat(e.target.value)})} />
                      </div>
                   </div>
                   <button type="submit" className="w-full h-18 bg-primary text-white rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all">Salvar Todas as Metas da Loja</button>
                </form>
             </div>
          </div>
        )}

        {/* RH / Status */}
        {activeTab === 'status' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-300">
            <h3 className="font-black text-2xl px-2">Gestão de Status RH</h3>
            <div className="grid gap-3">
              {customStatuses.map(status => (
                <div key={status.id} className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: status.color }}><span className="material-symbols-outlined">{status.icon}</span></div>
                    <div><p className="font-black text-base">{status.label}</p></div>
                  </div>
                  <button onClick={() => handleDeleteStatus(status.id)} className="size-10 flex items-center justify-center rounded-xl bg-red-50 text-red-400"><span className="material-symbols-outlined">delete</span></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border border-gray-100 dark:border-gray-800 shadow-2xl rounded-[3rem] flex justify-around p-3 z-[150]">
        <TabItem icon="home" label="Início" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <TabItem icon="category" label="RH" active={activeTab === 'status'} onClick={() => setActiveTab('status')} />
        <TabItem icon="target" label="Metas" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        <TabItem icon="logout" label="Sair" onClick={onNavigateToSeller} />
      </nav>

      {/* MODAL DE CADASTRO/EDIÇÃO DE VENDEDOR COM METAS INDIVIDUAIS */}
      {isSellerModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[3rem] p-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black mb-6">{editingSeller ? 'Configurar Vendedor' : 'Novo Vendedor'}</h3>
            <form onSubmit={handleSellerSubmit} className="space-y-6 pb-10">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nome Completo</label>
                 <input required className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 px-6 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               
               <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-2 block">Foto do Perfil</label>
                 <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="size-20 rounded-2xl bg-gray-50 dark:bg-gray-800 overflow-hidden border-2 border-primary/20">
                            <img src={formData.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                        <div className="flex-1">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><span className="material-symbols-outlined">photo_camera</span> Foto Local</button>
                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                        </div>
                    </div>
                    <input className="w-full h-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-0 px-4 font-medium text-xs" value={formData.avatar} onChange={e => setFormData({...formData, avatar: e.target.value})} placeholder="Link da imagem (opcional)" />
                 </div>
               </div>

               {/* SEÇÃO DE METAS INDIVIDUAIS */}
               <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-black uppercase text-primary mb-4">Metas Individuais</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Faturamento (R$)</label>
                      <input type="number" className="w-full h-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-0 px-4 font-bold" value={formData.meta_faturamento} onChange={e => setFormData({...formData, meta_faturamento: e.target.value})} placeholder="Ex: 5000" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Meta P.A.</label>
                      <input type="number" step="0.1" className="w-full h-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-0 px-4 font-bold" value={formData.meta_pa} onChange={e => setFormData({...formData, meta_pa: e.target.value})} placeholder="Ex: 2.5" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Ticket Médio (R$)</label>
                      <input type="number" className="w-full h-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-0 px-4 font-bold" value={formData.meta_ticket} onChange={e => setFormData({...formData, meta_ticket: e.target.value})} placeholder="Ex: 350" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Conversão (%)</label>
                      <input type="number" className="w-full h-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-0 px-4 font-bold" value={formData.meta_conversao} onChange={e => setFormData({...formData, meta_conversao: e.target.value})} placeholder="Ex: 40" />
                    </div>
                  </div>
                  <p className="text-[8px] text-gray-400 mt-2 italic">* Se vazio, usará a meta global da loja.</p>
               </div>

               <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsSellerModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-gray-400">Cancelar</button>
                 <button type="submit" className="flex-2 px-8 h-14 bg-primary text-white rounded-2xl font-black shadow-lg">{editingSeller ? 'Salvar Config' : 'Cadastrar'}</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const GoalProgressBar: React.FC<{ label: string; current: number; target: number; prefix?: string; suffix?: string; isCurrency?: boolean }> = ({ label, current, target, prefix = "", suffix = "", isCurrency = false }) => {
  const percent = Math.min(Math.round((current / (target || 1)) * 100), 100);
  const isComplete = current >= target && target > 0;
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{label}</p>
          <div className="flex items-center gap-2">
            <p className={`text-lg font-black ${isComplete ? 'text-green-500' : 'text-gray-900 dark:text-white'}`}>{isCurrency ? Number(current).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : current}{suffix}</p>
            {isComplete && <span className="text-lg animate-bounce">🏆</span>}
          </div>
        </div>
        <p className="text-[10px] font-black text-gray-400">Alvo: {prefix}{target}{suffix}</p>
      </div>
      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative border border-gray-50 dark:border-gray-700">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-2 ${isComplete ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-md' : 'bg-primary'}`} style={{ width: `${percent}%` }}>
          <span className="text-[7px] font-black text-white">{percent}%</span>
        </div>
      </div>
    </div>
  );
};

const MetricBox: React.FC<{ label: string; value: string; emoji: string; sub: string; color: string; icon: string }> = ({ label, value, emoji, sub, color, icon }) => (
  <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
    <p className="text-[7px] font-black uppercase tracking-widest opacity-60">{label}</p>
    <div className="flex items-center gap-1"><p className={`text-sm font-black ${color}`}>{value}</p><span>{emoji}</span></div>
    <p className="text-[7px] font-bold text-gray-400 mt-1 leading-tight">{sub}</p>
  </div>
);

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex flex-col gap-4 shadow-sm">
    <div className={`size-12 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center ${color}`}><span className="material-symbols-outlined text-2xl">{icon}</span></div>
    <div><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{title}</p><p className="text-xl font-black leading-none mt-1">{value}</p></div>
  </div>
);

const TabItem: React.FC<{ icon: string; label: string; active?: boolean; onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 py-4 px-6 rounded-[2.5rem] transition-all active:scale-95 ${active ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600'}`}>
    <span className={`material-symbols-outlined text-2xl ${active ? 'fill-1' : ''}`}>{icon}</span><span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default AdminDashboard;
