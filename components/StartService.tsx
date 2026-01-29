
import React, { useState } from 'react';
import { Seller } from '../types';

interface StartServiceProps {
  seller: Seller;
  isFiscal?: boolean;
  onCancel: () => void;
  onConfirm: (data: { clientName: string; clientWhatsApp: string; serviceType: any, assignedSellerId?: string }) => void;
}

const StartService: React.FC<StartServiceProps> = ({ seller, isFiscal, onCancel, onConfirm }) => {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [type, setType] = useState('COMPRA');

  const handleSubmit = () => {
    if (!name.trim()) return alert('Informe o nome do cliente para prosseguir.');
    onConfirm({ 
      clientName: name, 
      clientWhatsApp: whatsapp, 
      serviceType: type, 
      assignedSellerId: seller.id 
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-background-dark animate-in slide-in-from-bottom duration-500">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-5 flex items-center">
        <button onClick={onCancel} className="size-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 active:scale-90 transition-all shadow-sm">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex-1 text-center pr-12">
          <h2 className="text-xl font-black tracking-tight">{isFiscal ? 'Direcionar Cliente' : 'Novo Atendimento'}</h2>
          <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Registro Oficial</p>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full p-6 space-y-10">
        {/* Card do Vendedor Destino */}
        <div className="p-8 bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-800 flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
             <span className="material-symbols-outlined text-6xl">person_check</span>
          </div>
          <img src={seller.avatar} alt="" className="size-20 rounded-[2rem] object-cover shadow-2xl z-10" />
          <div className="z-10">
            <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1.5">Atribuído para:</p>
            <p className="text-2xl font-black leading-tight">{seller.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
               <span className="size-2 rounded-full bg-green-500"></span>
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{seller.status}</span>
            </div>
          </div>
        </div>

        {/* Formulário do Cliente */}
        <div className="space-y-6">
          <div className="space-y-2.5">
            <label className="text-[11px] font-black uppercase text-gray-400 ml-4 tracking-[0.1em]">Nome do Cliente</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-gray-300">person</span>
              <input 
                autoFocus 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full h-18 bg-white dark:bg-gray-900 border-0 rounded-[2rem] pl-16 pr-6 font-bold text-lg focus:ring-4 focus:ring-primary/10 transition-all shadow-sm" 
                placeholder="Ex: João da Silva" 
              />
            </div>
          </div>
          
          <div className="space-y-2.5">
            <label className="text-[11px] font-black uppercase text-gray-400 ml-4 tracking-[0.1em]">WhatsApp / Contato</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-gray-300">send_to_mobile</span>
              <input 
                value={whatsapp} 
                onChange={e => setWhatsapp(e.target.value)} 
                className="w-full h-18 bg-white dark:bg-gray-900 border-0 rounded-[2rem] pl-16 pr-6 font-bold text-lg focus:ring-4 focus:ring-primary/10 transition-all shadow-sm" 
                placeholder="(00) 00000-0000" 
                type="tel" 
              />
            </div>
          </div>
        </div>

        {/* Tipo de Atendimento */}
        <div className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-lg">Objetivo</h3>
            <span className="text-[10px] font-black text-gray-400 uppercase">Selecione um</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TypeChip label="Compra" icon="shopping_bag" active={type === 'COMPRA'} onClick={() => setType('COMPRA')} color="bg-blue-500" />
            <TypeChip label="Troca" icon="sync" active={type === 'TROCA'} onClick={() => setType('TROCA')} color="bg-purple-500" />
            <TypeChip label="Orçamento" icon="request_quote" active={type === 'ORCAMENTO'} onClick={() => setType('ORCAMENTO')} color="bg-green-500" />
            <TypeChip label="Info/Dúvida" icon="help_center" active={type === 'INFORMACAO'} onClick={() => setType('INFORMACAO')} color="bg-orange-500" />
          </div>
        </div>
      </main>

      {/* Botão de Ação */}
      <footer className="p-8 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800">
        <button 
          onClick={handleSubmit} 
          className="w-full h-18 bg-primary text-white rounded-[2.2rem] font-black text-xl shadow-[0_20px_50px_-10px_rgba(19,91,236,0.5)] active:scale-95 transition-all flex items-center justify-center gap-4 group"
        >
          <span className="material-symbols-outlined text-3xl group-hover:rotate-12 transition-transform">bolt</span>
          {isFiscal ? 'Confirmar Envio' : 'Iniciar Atendimento'}
        </button>
      </footer>
    </div>
  );
};

const TypeChip: React.FC<{ label: string; icon: string; active: boolean; onClick: () => void; color: string }> = ({ label, icon, active, onClick, color }) => (
  <button 
    onClick={onClick} 
    className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-3 relative overflow-hidden group/chip ${active ? `bg-white dark:bg-gray-800 border-primary shadow-2xl scale-105` : 'bg-white dark:bg-gray-900 border-transparent shadow-sm grayscale opacity-60 hover:grayscale-0 hover:opacity-100'}`}
  >
    <div className={`size-12 rounded-2xl ${active ? color : 'bg-gray-100 dark:bg-gray-800'} text-white flex items-center justify-center transition-all duration-500`}>
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </div>
    <span className={`text-[11px] font-black uppercase tracking-widest ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{label}</span>
    {active && (
      <div className="absolute top-2 right-2 size-2 bg-primary rounded-full animate-ping"></div>
    )}
  </button>
);

export default StartService;
