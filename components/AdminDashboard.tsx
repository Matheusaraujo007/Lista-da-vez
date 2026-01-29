
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Seller, SellerStatus, CustomStatus } from '../types';
import { dbService } from '../services/dbService';
import { getDashboardInsights } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const [stats, statuses] = await Promise.all([
        dbService.getAdvancedStats(selectedReportSeller === 'all' ? undefined : selectedReportSeller),
        dbService.getCustomStatuses()
      ]);
      setReportData(stats);
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
      const text = await getDashboardInsights({ 
        totalServicesToday: sellers.length * 2.5, 
        conversionRate: 42 
      });
      setAiInsight(text || '');
    };
    fetchInsights();
  }, [sellers.length]);

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
      setTimeout(() => { 
        setIsStatusModalOpen(false); 
        setStatusFormData({ label: '', icon: 'beach_access', color: '#135bec', behavior: 'INACTIVE' }); 
        loadData(); 
        setDbStatus('IDLE'); 
      }, 500);
    } catch (err) {
      setDbStatus('ERROR');
    }
  };

  const translateStatus = (status: string) => {
    if (status === 'AVAILABLE') return 'Disponível';
    if (status === 'IN_SERVICE') return 'Em Atendimento';
    if (status === 'BREAK') return 'Intervalo';
    if (status === 'LUNCH') return 'Almoço';
    const custom = customStatuses.find(cs => cs.id === status);
    return custom ? custom.label : 'Inativo';
  };

  const getStatusColor = (status: string) => {
    if (status === 'AVAILABLE') return 'bg-green-500';
    if (status === 'IN_SERVICE') return 'bg-blue-500';
    const custom = customStatuses.find(cs => cs.id === status);
    return custom ? `bg-[${custom.color}]` : 'bg-gray-400';
  };

  // Funções de Configuração
  const handleResetQueue = async () => {
    if (confirm('Zerar toda a fila? Todos ficarão como "Disponível".')) {
      for (const s of sellers) {
        await dbService.updateSeller(s.id, { status: 'AVAILABLE' });
      }
      onRefresh();
    }
  };

  const handleChangePassword = () => {
    const p = prompt('Nova senha master (4 dígitos):');
    if (p && p.length === 4) {
      localStorage.setItem('adminPassword', p);
      alert('Senha alterada!');
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 bg-gray-50 dark:bg-background-dark">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-6 py-5 flex items-center justify-between">
        <button onClick={onNavigateToSeller} className="size-12 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 active:scale-90 transition-all">
          <span className="material-symbols-outlined">logout</span>
        </button>
        <div className="text-center flex-1">
          <h2 className="text-2xl font-black tracking-tight">Painel Administrativo</h2>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Gestão de Unidade</p>
        </div>
        <button 
          onClick={() => { setEditingSeller(null); setFormData({name: '', avatar: '', status: 'AVAILABLE'}); setIsSellerModalOpen(true); }}
          className="size-12 flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 active:scale-90 transition-all"
        >
          <span className="material-symbols-outlined">person_add</span>
        </button>
      </header>

      <main className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-8">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <StatCard title="Total Equipe" value={sellers.length.toString()} icon="groups" color="text-blue-500" />
              <StatCard title="Status RH" value={customStatuses.length.toString()} icon="category" color="text-purple-500" />
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  <p className="font-black text-[10px] uppercase tracking-widest">Insight do Dia</p>
               </div>
               <p className="text-gray-500 italic text-sm leading-relaxed">{aiInsight}</p>
            </div>

            <div className="space-y-4">
               <h3 className="font-black text-xl px-2">Quadro de Disponibilidade (RH)</h3>
               <div className="grid gap-3">
                  {sellers.map(s => (
                    <div key={s.id} className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <img src={s.avatar} className="size-12 rounded-2xl object-cover shadow-sm" alt="" />
                      <div className="flex-1">
                        <p className="font-black text-base">{s.name}</p>
                        <div className="flex items-center gap-2">
                           <span className={`size-2 rounded-full ${getStatusColor(s.status)}`}></span>
                           <p className="text-[10px] font-black uppercase text-gray-400">{translateStatus(s.status)}</p>
                        </div>
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

        {activeTab === 'status' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-black text-3xl">Tipos de Status</h3>
              <button onClick={() => setIsStatusModalOpen(true)} className="bg-primary text-white h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">add</span>
                Novo Status
              </button>
            </div>
            <div className="grid gap-4">
               {customStatuses.map(st => (
                 <div key={st.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex items-center gap-6 group">
                   <div className="size-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: st.color }}>
                     <span className="material-symbols-outlined text-3xl">{st.icon}</span>
                   </div>
                   <div className="flex-1">
                     <p className="font-black text-xl">{st.label}</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                       {st.behavior === 'INACTIVE' ? 'Remove da Fila' : 'Mantém na Fila'}
                     </p>
                   </div>
                   <button 
                    onClick={async () => { if(confirm('Excluir este status?')) { await dbService.deleteCustomStatus(st.id); loadData(); } }} 
                    className="size-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                   >
                     <span className="material-symbols-outlined">delete</span>
                   </button>
                 </div>
               ))}
               {customStatuses.length === 0 && (
                 <div className="py-20 text-center opacity-30 border-2 border-dashed rounded-[3rem]">
                    <span className="material-symbols-outlined text-5xl">inventory_2</span>
                    <p className="font-black uppercase text-xs mt-2">Nenhum status RH cadastrado</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-300">
             <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <h3 className="font-black text-base mb-4 px-2">Filtrar por Vendedor</h3>
                <select 
                  className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl px-6 font-black text-lg focus:ring-2 focus:ring-primary/20" 
                  value={selectedReportSeller} 
                  onChange={e => setSelectedReportSeller(e.target.value)}
                >
                  <option value="all">Unidade Completa</option>
                  {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ChartCard title="Funil de Vendas">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={conversionData} innerRadius={60} outerRadius={80} dataKey="value">
                        <Cell fill="#28a745"/><Cell fill="#dc3545"/>
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Tipos de Atendimento">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={serviceTypeDistribution} outerRadius={80} dataKey="value">
                        {serviceTypeDistribution.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
            <h3 className="font-black text-3xl px-2">Configurações</h3>
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-800">
               <ConfigItem icon="lock" title="Senha Master" desc="Alterar senha de acesso Admin/Fiscal" onClick={handleChangePassword} />
               <ConfigItem icon="restart_alt" title="Zerar Fila" desc="Reiniciar posições de todos os vendedores" onClick={handleResetQueue} />
               <ConfigItem icon="cloud_sync" title="Forçar Sincronização" desc="Atualizar dados com o banco Neon" onClick={() => { onRefresh(); loadData(); }} />
               <ConfigItem icon="description" title="Exportar Relatório" desc="Baixar histórico em formato CSV" onClick={() => alert('Recurso em desenvolvimento')} />
            </div>
          </div>
        )}
      </main>

      {/* Modal Vendedor - RESTAURADO AO ESTILO ORIGINAL RH */}
      {isSellerModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black">{editingSeller ? 'Perfil Vendedor' : 'Novo Colaborador'}</h3>
              <button onClick={() => setIsSellerModalOpen(false)} className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <form onSubmit={handleSellerSubmit} className="space-y-8">
              <div onClick={() => fileInputRef.current?.click()} className="size-32 rounded-[2.5rem] bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 mx-auto flex flex-col items-center justify-center cursor-pointer hover:border-primary group overflow-hidden relative">
                {formData.avatar ? <img src={formData.avatar} alt="Preview" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-4xl text-gray-300">add_a_photo</span>}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setFormData({...formData, avatar: reader.result as string});
                    reader.readAsDataURL(file);
                  }
                }} />
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Nome do Vendedor</label>
                  <input required className="w-full h-18 bg-gray-50 dark:bg-gray-800 rounded-[2rem] px-8 font-black border-0 focus:ring-2 focus:ring-primary/20" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                {editingSeller && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-primary ml-4">Status de RH (Disponibilidade)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <StatusSelectButton 
                        label="Livre" 
                        icon="check_circle" 
                        active={formData.status === 'AVAILABLE'} 
                        onClick={()=>setFormData({...formData, status: 'AVAILABLE'})} 
                        color="text-green-500"
                      />
                      {customStatuses.map(cs => (
                        <StatusSelectButton 
                          key={cs.id}
                          label={cs.label} 
                          icon={cs.icon} 
                          active={formData.status === cs.id} 
                          onClick={()=>setFormData({...formData, status: cs.id})} 
                          color="text-primary"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <button type="submit" disabled={dbStatus === 'LOADING'} className="w-full h-20 bg-primary text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-primary/30 active:scale-95 transition-all">
                {dbStatus === 'LOADING' ? <div className="size-6 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : 'Salvar Colaborador'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Status RH */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl">
            <h3 className="text-3xl font-black mb-8">Novo Status RH</h3>
            <form onSubmit={handleStatusSubmit} className="space-y-6">
              <input required className="w-full h-18 bg-gray-50 rounded-[2rem] px-8 font-black border-0" placeholder="Nome (Ex: Férias, Folga)" value={statusFormData.label} onChange={e => setStatusFormData({...statusFormData, label: e.target.value})} />
              <div className="flex gap-4">
                <input className="flex-1 h-18 bg-gray-50 rounded-[2rem] px-8 font-black border-0" placeholder="Ícone (Material Icon)" value={statusFormData.icon} onChange={e => setStatusFormData({...statusFormData, icon: e.target.value})} />
                <input type="color" className="size-18 bg-transparent border-0" value={statusFormData.color} onChange={e => setStatusFormData({...statusFormData, color: e.target.value})} />
              </div>
              <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-black">Remove da Fila?</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Inativar vendedor do dia</p>
                </div>
                <input type="checkbox" className="size-8 rounded-xl text-primary border-0 bg-gray-200" checked={statusFormData.behavior === 'INACTIVE'} onChange={e => setStatusFormData({...statusFormData, behavior: e.target.checked ? 'INACTIVE' : 'ACTIVE'})} />
              </div>
              <button type="submit" className="w-full h-18 bg-primary text-white rounded-[2rem] font-black text-xl active:scale-95 transition-all">Criar Status</button>
              <button type="button" onClick={() => setIsStatusModalOpen(false)} className="w-full text-gray-400 font-black uppercase text-xs">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border border-gray-100 dark:border-gray-800 shadow-2xl rounded-[3rem] flex justify-around p-3 z-[150]">
        <TabItem icon="home" label="Início" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <TabItem icon="category" label="Status" active={activeTab === 'status'} onClick={() => setActiveTab('status')} />
        <TabItem icon="analytics" label="Stats" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <TabItem icon="settings" label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
};

const StatusSelectButton: React.FC<{ label: string; icon: string; active: boolean; onClick: () => void; color: string }> = ({ label, icon, active, onClick, color }) => (
  <button type="button" onClick={onClick} className={`flex items-center gap-3 p-4 rounded-3xl border-2 transition-all ${active ? `bg-primary/5 border-primary ${color}` : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400'}`}>
    <span className="material-symbols-outlined text-xl">{icon}</span>
    <span className="text-xs font-black uppercase tracking-tighter">{label}</span>
  </button>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 flex flex-col items-center">
    <h4 className="font-black text-[10px] uppercase text-gray-400 mb-6">{title}</h4>
    <div className="h-48 w-full">{children}</div>
  </div>
);

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex items-center gap-6 shadow-sm">
    <div className={`size-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center ${color}`}><span className="material-symbols-outlined text-3xl">{icon}</span></div>
    <div>
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{title}</p>
      <p className="text-3xl font-black leading-none">{value}</p>
    </div>
  </div>
);

const ConfigItem: React.FC<{ icon: string; title: string; desc: string; onClick: () => void }> = ({ icon, title, desc, onClick }) => (
  <button onClick={onClick} className="w-full p-8 flex items-center gap-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left group">
    <div className="size-14 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:bg-primary group-hover:text-white transition-all shadow-sm"><span className="material-symbols-outlined text-3xl">{icon}</span></div>
    <div className="flex-1">
      <p className="text-xl font-black leading-tight group-hover:text-primary transition-colors">{title}</p>
      <p className="text-xs text-gray-400 font-bold uppercase mt-1 tracking-widest">{desc}</p>
    </div>
    <span className="material-symbols-outlined text-gray-300 group-hover:translate-x-2 transition-transform">chevron_right</span>
  </button>
);

const TabItem: React.FC<{ icon: string; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 py-4 px-6 rounded-[2.5rem] transition-all ${active ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600'}`}>
    <span className={`material-symbols-outlined text-3xl ${active ? 'fill-1' : ''}`}>{icon}</span>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default AdminDashboard;
