
import React, { useState, useEffect, useRef } from 'react';
import { Seller, SellerStatus } from '../types';
import { dbService } from '../services/dbService';
import { getDashboardInsights } from '../services/geminiService';

interface AdminDashboardProps {
  sellers: Seller[];
  onNavigateToSeller: () => void;
  onRefresh: () => void;
  onSelectSeller: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ sellers, onNavigateToSeller, onRefresh, onSelectSeller }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [formData, setFormData] = useState({ name: '', avatar: '' });
  const [dbStatus, setDbStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [aiInsight, setAiInsight] = useState<string>('Gerando relatório inteligente...');
  const [adminPass, setAdminPass] = useState(localStorage.getItem('adminPassword') || '1234');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setDbStatus('LOADING');
    try {
      if (editingSeller) {
        await dbService.updateSeller(editingSeller.id, { nome: formData.name, avatar_url: formData.avatar });
      } else {
        await dbService.createSeller(formData.name, formData.avatar);
      }
      
      setDbStatus('SUCCESS');
      setTimeout(() => {
        setIsModalOpen(false);
        setEditingSeller(null);
        setFormData({ name: '', avatar: '' });
        onRefresh();
        setDbStatus('IDLE');
      }, 500);
    } catch (err) {
      setDbStatus('ERROR');
    }
  };

  const openEdit = (seller: Seller) => {
    setEditingSeller(seller);
    setFormData({ name: seller.name, avatar: seller.avatar });
    setIsModalOpen(true);
  };

  const handleResetQueue = async () => {
    if (confirm('Deseja realmente resetar a fila?')) {
      setDbStatus('LOADING');
      for (const s of sellers) {
        await dbService.updateSeller(s.id, { status: SellerStatus.AVAILABLE });
      }
      onRefresh();
      setDbStatus('IDLE');
    }
  };

  const changePassword = () => {
    const newPass = prompt('Nova senha (4 dígitos):', adminPass);
    if (newPass && newPass.length === 4) {
      localStorage.setItem('adminPassword', newPass);
      setAdminPass(newPass);
      alert('Alterada!');
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 bg-gray-50 dark:bg-background-dark">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center justify-between">
        <button onClick={onNavigateToSeller} className="size-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 active:scale-90 transition-transform">
          <span className="material-symbols-outlined">logout</span>
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black tracking-tight">Gestão Master</h2>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Dash Administrativo</p>
        </div>
        <button 
          onClick={() => { setEditingSeller(null); setFormData({name: '', avatar: ''}); setIsModalOpen(true); }}
          className="size-10 flex items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 active:scale-90"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-6">
        {activeTab === 'home' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <StatCard title="Vendedores" value={sellers.length.toString()} icon="badge" color="text-blue-500" />
              <StatCard title="Em Atendimento" value={sellers.filter(s => s.status === SellerStatus.IN_SERVICE).length.toString()} icon="groups" color="text-green-500" />
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">auto_awesome</span>
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest">Análise de IA Gemini</h3>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 italic">
                "{aiInsight}"
              </p>
              <div className="absolute -right-8 -bottom-8 size-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-xl">Top Performers</h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-2 divide-y divide-gray-50 dark:divide-gray-800">
                {sellers.slice(0, 3).map((s, idx) => (
                  <div key={s.id} className="flex items-center gap-4 p-4">
                    <div className={`size-8 rounded-xl flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-100 dark:bg-gray-800'}`}>{idx+1}º</div>
                    <img src={s.avatar} alt="" className="size-12 rounded-2xl object-cover shadow-sm" />
                    <div className="flex-1">
                      <p className="text-base font-black leading-tight">{s.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{s.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'team' && (
          <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
            <h3 className="font-black text-2xl">Equipe de Vendas</h3>
            <div className="grid gap-3">
              {sellers.map(s => (
                <div key={s.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-[2rem] flex items-center gap-4 shadow-sm group">
                  <img src={s.avatar} alt="" className="size-16 rounded-[1.5rem] object-cover shadow-md group-hover:rotate-3 transition-transform" />
                  <div className="flex-1">
                    <p className="font-black text-xl leading-tight">{s.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{s.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="size-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary transition-all active:scale-90"><span className="material-symbols-outlined text-xl">edit</span></button>
                    <button onClick={() => { if(confirm('Excluir?')) dbService.deleteSeller(s.id).then(onRefresh); }} className="size-12 flex items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90"><span className="material-symbols-outlined text-xl">delete</span></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
            <h3 className="font-black text-2xl">Ajustes do Sistema</h3>
            <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
              <ConfigItem icon="lock" title="Senha de Acesso" desc="Modificar senha master do app" onClick={changePassword} />
              <ConfigItem icon="restart_alt" title="Zerar Fila" desc="Reiniciar as posições de todos" onClick={handleResetQueue} />
              <ConfigItem icon="palette" title="Aparência" desc="Escolher cores e logotipo" onClick={() => alert('Em breve')} />
              <ConfigItem icon="database" title="Limpar Banco" desc="Apagar todos os dados de vendas" onClick={() => alert('Protegido')} />
            </section>
          </div>
        )}
      </main>

      {/* Modal Avançado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black">{editingSeller ? 'Atualizar Perfil' : 'Cadastrar Membro'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 active:scale-90"><span className="material-symbols-outlined text-3xl">close</span></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6 text-center">
              <div onClick={() => fileInputRef.current?.click()} className="size-32 rounded-[2.5rem] bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 mx-auto flex flex-col items-center justify-center cursor-pointer hover:border-primary group overflow-hidden relative shadow-inner transition-all">
                {formData.avatar ? <img src={formData.avatar} alt="Preview" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-4xl text-gray-300 group-hover:text-primary transition-colors">add_a_photo</span>}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Nome Social</label>
                <input autoFocus required placeholder="Ex: Maria Clara" className="w-full h-16 bg-gray-50 dark:bg-gray-800 border-0 rounded-[2rem] px-6 font-bold focus:ring-4 focus:ring-primary/10 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <button type="submit" disabled={dbStatus === 'LOADING'} className="w-full h-16 bg-primary text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3">
                {dbStatus === 'LOADING' ? <div className="size-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : (editingSeller ? 'Salvar Perfil' : 'Adicionar na Fila')}
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border border-gray-100 dark:border-gray-800 shadow-2xl rounded-[2.5rem] flex justify-around p-2 z-50">
        <TabItem icon="home" label="Resumo" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <TabItem icon="group" label="Equipe" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
        <TabItem icon="settings" label="Painel" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
    <div className={`size-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center ${color}`}><span className="material-symbols-outlined">{icon}</span></div>
    <div>
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-0.5">{title}</p>
      <p className="text-2xl font-black leading-none">{value}</p>
    </div>
  </div>
);

const ConfigItem: React.FC<{ icon: string; title: string; desc: string; onClick: () => void }> = ({ icon, title, desc, onClick }) => (
  <button onClick={onClick} className="w-full p-6 flex items-center gap-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left group">
    <div className="size-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:bg-primary group-hover:text-white transition-all"><span className="material-symbols-outlined text-2xl">{icon}</span></div>
    <div className="flex-1">
      <p className="text-base font-black leading-tight">{title}</p>
      <p className="text-xs text-gray-400 font-bold uppercase mt-0.5">{desc}</p>
    </div>
    <span className="material-symbols-outlined text-gray-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
  </button>
);

const TabItem: React.FC<{ icon: string; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 py-3 px-6 rounded-[2rem] transition-all ${active ? 'text-primary bg-primary/5' : 'text-gray-400'}`}>
    <span className={`material-symbols-outlined text-2xl ${active ? 'fill-1' : ''}`}>{icon}</span>
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default AdminDashboard;
