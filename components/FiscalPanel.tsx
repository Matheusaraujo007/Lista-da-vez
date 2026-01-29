
import React from 'react';
import { Seller, SellerStatus } from '../types';

interface FiscalPanelProps {
  sellers: (Seller & { activeClientName?: string })[];
  queue: Seller[];
  onLogout: () => void;
  onRefresh: () => void;
  onAssignClient: (sellerId: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

const FiscalPanel: React.FC<FiscalPanelProps> = ({ sellers, queue, onLogout, onRefresh, onAssignClient, onUpdateStatus }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background-dark pb-32">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-5 flex items-center justify-between">
        <button onClick={onLogout} className="size-12 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 active:scale-90 transition-all">
          <span className="material-symbols-outlined">logout</span>
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black tracking-tight">Painel Fiscal</h2>
          <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest leading-none">Gestão de Fluxo</p>
        </div>
        <button onClick={onRefresh} className="size-12 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-primary active:rotate-180 transition-all">
          <span className="material-symbols-outlined">sync</span>
        </button>
      </header>

      <main className="p-4 space-y-8 max-w-2xl mx-auto">
        {/* Próximos da Vez */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h3 className="font-black text-2xl">Próximos da Vez</h3>
            <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">{queue.length}</span>
          </div>

          <div className="grid gap-3">
            {queue.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800 text-center opacity-40">
                <p className="text-xs font-black uppercase tracking-widest">Ninguém na fila</p>
              </div>
            ) : (
              queue.map((s, idx) => (
                <div key={s.id} className="bg-white dark:bg-gray-900 p-5 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-5 group animate-in slide-in-from-right duration-300">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl italic group-hover:scale-110 transition-transform">{idx + 1}º</div>
                  <img src={s.avatar} alt="" className="size-14 rounded-2xl object-cover shadow-md" />
                  <div className="flex-1">
                    <p className="font-black text-lg leading-tight">{s.name}</p>
                    <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Disponível</p>
                  </div>
                  <button onClick={() => onAssignClient(s.id)} className="bg-primary text-white h-14 px-6 rounded-2xl text-xs font-black shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 transition-all">DIRECIONAR</button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Floor Monitor */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h3 className="font-black text-2xl">Floor Monitor</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempo Real</p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800 shadow-xl">
            {sellers.map(s => (
              <div key={s.id} className="p-6 flex items-center gap-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <div className="relative">
                  <img src={s.avatar} alt="" className="size-16 rounded-[1.5rem] object-cover shadow-sm group-hover:scale-105 transition-transform" />
                  <span className={`absolute -bottom-1 -right-1 size-5 border-4 border-white dark:border-gray-900 rounded-full ${s.status === 'AVAILABLE' ? 'bg-green-500' : s.status === 'IN_SERVICE' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-orange-400'}`}></span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-xl leading-none mb-1.5">{s.name}</p>
                  {s.status === 'IN_SERVICE' ? (
                    <div className="flex items-center gap-1 animate-pulse">
                       <span className="material-symbols-outlined text-sm text-primary">person</span>
                       <p className="text-[11px] font-black text-primary uppercase">Mesa: {s.activeClientName || 'Cliente em Mesa'}</p>
                    </div>
                  ) : (
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {s.status === 'AVAILABLE' ? 'Aguardando Cliente' : s.status === 'BREAK' ? 'Intervalo Curto' : s.status === 'LUNCH' ? 'Almoço' : s.status}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Botão de Direcionamento rápido mesmo se estiver ocupado (urgência) */}
                  <button 
                    onClick={() => onAssignClient(s.id)}
                    className={`size-14 flex items-center justify-center rounded-2xl shadow-lg transition-all active:scale-90 ${s.status === 'IN_SERVICE' ? 'bg-orange-500 text-white shadow-orange-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}
                  >
                    <span className="material-symbols-outlined text-2xl">person_add</span>
                  </button>
                  <div className="relative group/menu">
                    <button className="size-14 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-primary/10 hover:text-primary transition-all">
                      <span className="material-symbols-outlined text-2xl">settings_accessibility</span>
                    </button>
                    <div className="absolute right-0 top-0 hidden group-hover/menu:flex flex-col bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl p-2 z-[60] w-44 animate-in fade-in zoom-in duration-200">
                      <StatusBtn label="Livre" icon="check_circle" color="text-green-500" onClick={() => onUpdateStatus(s.id, 'AVAILABLE')} />
                      <StatusBtn label="Pausa" icon="coffee" color="text-orange-400" onClick={() => onUpdateStatus(s.id, 'BREAK')} />
                      <StatusBtn label="Almoço" icon="restaurant" color="text-orange-600" onClick={() => onUpdateStatus(s.id, 'LUNCH')} />
                      <div className="border-t border-gray-50 dark:border-gray-800 my-1"></div>
                      <StatusBtn label="Inativo" icon="block" color="text-gray-400" onClick={() => onUpdateStatus(s.id, 'OFFLINE')} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

const StatusBtn: React.FC<{ label: string; icon: string; color: string; onClick: () => void }> = ({ label, icon, color, onClick }) => (
  <button onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left group">
    <span className={`material-symbols-outlined text-xl ${color} group-hover:scale-110 transition-transform`}>{icon}</span>
    <span className="text-[11px] font-black text-gray-600 dark:text-gray-300 uppercase">{label}</span>
  </button>
);

export default FiscalPanel;
