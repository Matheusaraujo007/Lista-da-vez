
import React from 'react';
import { Seller, SellerStatus } from '../types';

interface FiscalPanelProps {
  sellers: Seller[];
  queue: Seller[];
  onLogout: () => void;
  onRefresh: () => void;
  onAssignClient: (sellerId: string) => void;
  onUpdateStatus: (id: string, status: SellerStatus) => void;
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
        {/* Sessão da Fila */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h3 className="font-black text-2xl">Próximos da Vez</h3>
            <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">{queue.length} em espera</span>
          </div>

          <div className="grid gap-3">
            {queue.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 opacity-50">
                <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                <p className="text-xs font-bold uppercase tracking-wider">Fila Vazia</p>
              </div>
            ) : (
              queue.map((s, idx) => (
                <div key={s.id} className="bg-white dark:bg-gray-900 p-5 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-5 group hover:shadow-xl transition-all">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl italic">
                    {idx + 1}º
                  </div>
                  <img src={s.avatar} alt="" className="size-14 rounded-2xl object-cover shadow-md group-hover:scale-110 transition-transform" />
                  <div className="flex-1">
                    <p className="font-black text-lg leading-tight">{s.name}</p>
                    <p className="text-[10px] font-bold text-green-500 uppercase mt-0.5 tracking-widest">Disponível</p>
                  </div>
                  <button 
                    onClick={() => onAssignClient(s.id)}
                    className="bg-primary text-white h-14 px-6 rounded-2xl text-xs font-black shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    DIRECIONAR
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Lista Completa com Força de Atendimento */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h3 className="font-black text-2xl">Floor Monitor</h3>
            <span className="text-[10px] font-black text-gray-400 uppercase">{sellers.length} vendedores</span>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800 shadow-xl">
            {sellers.map(s => (
              <div key={s.id} className="p-6 flex items-center gap-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <div className="relative">
                  <img src={s.avatar} alt="" className="size-16 rounded-[1.5rem] object-cover shadow-sm group-hover:rotate-3 transition-transform" />
                  <span className={`absolute -bottom-1 -right-1 size-5 border-4 border-white dark:border-gray-900 rounded-full ${s.status === SellerStatus.AVAILABLE ? 'bg-green-500' : s.status === SellerStatus.IN_SERVICE ? 'bg-blue-500' : 'bg-orange-400'}`}></span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-xl leading-none mb-1.5">{s.name}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.status}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Botão de Forçar Atendimento (Mesmo se já estiver ocupado) */}
                  <button 
                    onClick={() => onAssignClient(s.id)}
                    className={`size-14 flex items-center justify-center rounded-2xl transition-all shadow-lg ${s.status === SellerStatus.IN_SERVICE ? 'bg-orange-500 text-white shadow-orange-500/20 active:bg-orange-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 active:bg-gray-200'}`}
                    title={s.status === SellerStatus.IN_SERVICE ? "Atribuir segundo cliente" : "Iniciar Atendimento"}
                  >
                    <span className="material-symbols-outlined text-2xl">person_add</span>
                  </button>

                  <div className="relative group/menu">
                    <button className="size-14 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-primary active:scale-90 transition-all">
                      <span className="material-symbols-outlined text-2xl">settings_accessibility</span>
                    </button>
                    {/* Menu de Status Rápido */}
                    <div className="absolute right-0 top-0 hidden group-hover/menu:flex flex-col bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl p-2 z-[60] w-44 animate-in fade-in zoom-in-95">
                      <p className="text-[9px] font-black text-gray-400 uppercase px-3 py-2 border-b border-gray-50 dark:border-gray-700 mb-1">Mudar Status</p>
                      <StatusBtn label="Livre / Fila" icon="check_circle" color="text-green-500" onClick={() => onUpdateStatus(s.id, SellerStatus.AVAILABLE)} />
                      <StatusBtn label="Pausa Café" icon="coffee" color="text-orange-400" onClick={() => onUpdateStatus(s.id, SellerStatus.BREAK)} />
                      <StatusBtn label="Horário Almoço" icon="restaurant" color="text-orange-600" onClick={() => onUpdateStatus(s.id, SellerStatus.LUNCH)} />
                      <StatusBtn label="Indisponível" icon="block" color="text-red-500" onClick={() => onUpdateStatus(s.id, SellerStatus.AWAY)} />
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
  <button onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left group/btn">
    <span className={`material-symbols-outlined text-xl transition-transform group-hover/btn:scale-125 ${color}`}>{icon}</span>
    <span className="text-[11px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-tighter">{label}</span>
  </button>
);

export default FiscalPanel;
