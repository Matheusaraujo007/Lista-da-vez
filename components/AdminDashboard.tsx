
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Seller, SellerStatus } from '../types';
import { LOSS_REASONS } from '../constants';
import { getDashboardInsights } from '../services/geminiService';
import { dbService } from '../services/dbService';

interface AdminDashboardProps {
  sellers: Seller[];
  onNavigateToSeller: () => void;
  onRefresh: () => void;
  onSelectSeller: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ sellers, onNavigateToSeller, onRefresh, onSelectSeller }) => {
  const [aiInsight, setAiInsight] = useState<string>('Analisando desempenho...');
  const [activeTab, setActiveTab] = useState('home');
  const [isAddingSeller, setIsAddingSeller] = useState(false);
  const [newSeller, setNewSeller] = useState({ name: '', avatar: '' });
  const [dbStatus, setDbStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');

  useEffect(() => {
    const fetchInsights = async () => {
      const text = await getDashboardInsights({
        totalServicesToday: 42,
        conversionRate: 35
      });
      setAiInsight(text || '');
    };
    fetchInsights();
  }, []);

  const handleAddSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeller.name) return;
    
    setDbStatus('LOADING');
    const avatar = newSeller.avatar || `https://picsum.photos/seed/${newSeller.name}/200`;
    const result = await dbService.createSeller(newSeller.name, avatar);
    
    if (result.success) {
      setNewSeller({ name: '', avatar: '' });
      setIsAddingSeller(false);
      onRefresh();
      setDbStatus('SUCCESS');
      setTimeout(() => setDbStatus('IDLE'), 2000);
    } else {
      setDbStatus('ERROR');
    }
  };

  const handleDeleteSeller = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este vendedor?')) {
      await dbService.deleteSeller(id);
      onRefresh();
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button className="size-10 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined">analytics</span>
          </button>
          <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center">Gestão Pro</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsAddingSeller(true)}
              className="size-10 flex items-center justify-center rounded-lg bg-primary text-white shadow-lg active:scale-90 transition-transform"
              title="Cadastrar Vendedor"
            >
              <span className="material-symbols-outlined">person_add</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-5">
        <div 
          onClick={onNavigateToSeller}
          className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-4 text-white flex items-center justify-between cursor-pointer shadow-lg active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined p-2 bg-white/20 rounded-lg">sensor_occupied</span>
            <div>
              <p className="font-bold">Meu Painel de Vendas</p>
              <p className="text-xs text-white/70">Clique para alternar para visão vendedor</p>
            </div>
          </div>
          <span className="material-symbols-outlined">chevron_right</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard title="Total Hoje" value="0" trend="--" icon="groups" />
          <StatCard title="Conversão" value="0%" trend="--" icon="shopping_cart" />
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <h3 className="font-bold text-primary">IA Advisor</h3>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
            {sellers.length === 0 ? "Cadastre sua equipe para começar a receber insights personalizados da IA." : `"${aiInsight}"`}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[#111318] dark:text-white text-lg font-bold">Equipe em Tempo Real</h3>
            <span className="text-xs text-gray-400 font-bold">{sellers.length} cadastrados</span>
          </div>

          {sellers.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-3">
              <span className="material-symbols-outlined text-4xl text-gray-300">group_off</span>
              <p className="text-gray-400 text-sm font-medium">Nenhum vendedor cadastrado ainda.</p>
              <button 
                onClick={() => setIsAddingSeller(true)}
                className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
              >
                Cadastrar agora <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              {sellers.map((seller, idx) => (
                <div 
                  key={seller.id} 
                  className={`flex items-center justify-between p-4 ${idx !== sellers.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}
                >
                  <div className="flex items-center gap-3 cursor-pointer group flex-1" onClick={() => onSelectSeller(seller.id)}>
                    <div className="relative">
                      <img src={seller.avatar} alt={seller.name} className="size-11 rounded-xl object-cover group-hover:scale-105 transition-transform" />
                      <span className={`absolute -bottom-1 -right-1 size-3.5 border-2 border-white dark:border-gray-900 rounded-full ${seller.status === SellerStatus.AVAILABLE ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    </div>
                    <div>
                      <p className="text-sm font-bold group-hover:text-primary transition-colors">{seller.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Gerenciar vendedor</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={seller.status} />
                    <button 
                      onClick={() => handleDeleteSeller(seller.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Cadastro */}
      {isAddingSeller && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Novo Vendedor</h3>
              <button onClick={() => setIsAddingSeller(false)} className="text-gray-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddSeller} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-gray-400 ml-1">Nome Completo</label>
                <input 
                  autoFocus
                  required
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl px-4 focus:ring-2 focus:ring-primary"
                  value={newSeller.name}
                  onChange={e => setNewSeller({...newSeller, name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-gray-400 ml-1">URL da Foto (Opcional)</label>
                <input 
                  placeholder="Link da imagem..."
                  className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl px-4 focus:ring-2 focus:ring-primary"
                  value={newSeller.avatar}
                  onChange={e => setNewSeller({...newSeller, avatar: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                disabled={dbStatus === 'LOADING'}
                className="w-full h-14 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {dbStatus === 'LOADING' ? <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Confirmar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 w-full bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 flex justify-around py-3 pb-8 px-4 safe-area-bottom z-50">
        <TabItem icon="home" label="Início" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <TabItem icon="badge" label="Equipe" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
        <TabItem icon="list_alt" label="Fila" active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} />
        <TabItem icon="settings" label="Config" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; trend: string; icon: string }> = ({ title, value, trend, icon }) => (
  <div className="flex flex-col gap-2 rounded-xl p-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
    <div className="flex justify-between items-start">
      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
      <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
    </div>
    <div className="flex items-baseline gap-1.5 mt-1">
      <p className="text-[#111318] dark:text-white text-2xl font-black">{value}</p>
      <p className="text-gray-300 text-[10px] font-black">{trend}</p>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: SellerStatus }> = ({ status }) => {
  const configs = {
    [SellerStatus.AVAILABLE]: { label: 'Livre', class: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
    [SellerStatus.IN_SERVICE]: { label: 'Em Mesa', class: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
    [SellerStatus.BREAK]: { label: 'Pausa', class: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' },
    [SellerStatus.LUNCH]: { label: 'Almoço', class: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' },
    [SellerStatus.AWAY]: { label: 'Fora', class: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  };
  const config = configs[status];
  return (
    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${config.class}`}>
      {config.label}
    </span>
  );
};

const TabItem: React.FC<{ icon: string; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-primary scale-110' : 'text-gray-400'}`}>
    <span className={`material-symbols-outlined ${active ? 'fill-1' : ''}`}>{icon}</span>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export default AdminDashboard;
