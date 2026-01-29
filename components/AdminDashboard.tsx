
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Seller, SellerStatus } from '../types';
import { LOSS_REASONS } from '../constants';
import { getDashboardInsights } from '../services/geminiService';
import { dbService } from '../services/dbService';

interface AdminDashboardProps {
  sellers: Seller[];
  onNavigateToSeller: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ sellers, onNavigateToSeller }) => {
  const [aiInsight, setAiInsight] = useState<string>('Analisando desempenho...');
  const [activeTab, setActiveTab] = useState('home');
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

  const handleInitDB = async () => {
    setDbStatus('LOADING');
    const result = await dbService.initDatabase();
    if (result.success) {
      setDbStatus('SUCCESS');
      setTimeout(() => setDbStatus('IDLE'), 3000);
      alert('Banco de dados configurado com sucesso!');
    } else {
      setDbStatus('ERROR');
      alert('Aviso: ' + result.message + '\n\nO sistema continuará funcionando em modo de simulação.');
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
              onClick={handleInitDB}
              disabled={dbStatus === 'LOADING'}
              className={`size-10 flex items-center justify-center rounded-lg transition-colors ${dbStatus === 'SUCCESS' ? 'bg-success text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              title="Configurar Tabelas no Neon"
            >
              <span className={`material-symbols-outlined ${dbStatus === 'LOADING' ? 'animate-spin' : ''}`}>
                {dbStatus === 'SUCCESS' ? 'check_circle' : 'database'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-5">
        {/* Banner de Modo Simulação para o Preview */}
        {dbService.isMockMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 animate-pulse">
            <span className="material-symbols-outlined text-amber-600">info</span>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-tight">
              Modo Simulação Ativado (Preview)
            </p>
          </div>
        )}

        <div 
          onClick={onNavigateToSeller}
          className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-4 text-white flex items-center justify-between cursor-pointer shadow-lg active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined p-2 bg-white/20 rounded-lg">sensor_occupied</span>
            <div>
              <p className="font-bold">Meu Painel de Vendas</p>
              <p className="text-xs text-white/70">Gerenciar meus atendimentos</p>
            </div>
          </div>
          <span className="material-symbols-outlined">chevron_right</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard title="Total Hoje" value="42" trend="+12%" icon="groups" />
          <StatCard title="Conversão" value="35%" trend="+5%" icon="shopping_cart" />
          <div className="col-span-2 md:col-span-1 flex flex-col gap-2 rounded-xl p-5 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Top Vendedor</p>
              <span className="material-symbols-outlined text-yellow-500">emoji_events</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <img src="https://picsum.photos/seed/ricardo/100" className="size-10 rounded-full border border-primary/20" alt="" />
              <div>
                <p className="text-[#111318] dark:text-white text-sm font-bold leading-none">Ricardo O.</p>
                <p className="text-primary text-[10px] font-bold mt-1">98% Eficiência</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">neurology</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <h3 className="font-bold text-primary">Resumo da IA</h3>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
            "{aiInsight}"
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-[#111318] dark:text-white text-lg font-bold mb-4">Motivos de Perda</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={LOSS_REASONS}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {LOSS_REASONS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-4 text-center">
             {LOSS_REASONS.map((reason) => (
              <div key={reason.name} className="flex flex-col items-center">
                <div className="size-3 rounded-full mb-1" style={{ backgroundColor: reason.color }}></div>
                <span className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase">{reason.name}</span>
                <span className="text-xs font-black">{reason.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[#111318] dark:text-white text-lg font-bold">Equipe em Tempo Real</h3>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            {sellers.map((seller, idx) => (
              <div key={seller.id} className={`flex items-center justify-between p-4 ${idx !== sellers.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={seller.avatar} alt={seller.name} className="size-11 rounded-xl object-cover" />
                    <span className={`absolute -bottom-1 -right-1 size-3.5 border-2 border-white dark:border-gray-900 rounded-full ${seller.status === SellerStatus.AVAILABLE ? 'bg-green-500' : seller.status === SellerStatus.IN_SERVICE ? 'bg-blue-500' : 'bg-yellow-500'}`}></span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{seller.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Posição: {seller.queuePosition ? `${seller.queuePosition}º` : '--'}</p>
                  </div>
                </div>
                <StatusBadge status={seller.status} />
              </div>
            ))}
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 w-full bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 flex justify-around py-3 pb-8 px-4 safe-area-bottom z-50">
        <TabItem icon="home" label="Início" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <TabItem icon="badge" label="Equipe" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
        <TabItem icon="list_alt" label="Fila" active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} />
        <TabItem icon="bar_chart" label="Metas" active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} />
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
      <p className="text-green-600 text-[10px] font-black">{trend}</p>
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
