
import React, { useState } from 'react';
import { Seller } from '../types';

interface StartServiceProps {
  seller: Seller;
  onCancel: () => void;
  onConfirm: (data: { clientName: string; clientWhatsApp: string; serviceType: any }) => void;
}

const StartService: React.FC<StartServiceProps> = ({ seller, onCancel, onConfirm }) => {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [type, setType] = useState('COMPRA');

  const handleSubmit = () => {
    if (!name.trim()) return alert('Por favor, informe o nome do cliente');
    onConfirm({ clientName: name, clientWhatsApp: whatsapp, serviceType: type });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <button onClick={onCancel} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10">Iniciar Atendimento</h2>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full p-6 space-y-8">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold">Dados do Cliente</h3>
          <p className="text-gray-500 text-sm">Preencha as informações para começar</p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Nome do Cliente</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 h-14 p-4 focus:ring-primary focus:border-primary"
              placeholder="Digite o nome completo"
              type="text"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">WhatsApp</label>
            <div className="relative">
              <input 
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 h-14 p-4 focus:ring-primary focus:border-primary"
                placeholder="(00) 00000-0000"
                type="tel"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                <span className="material-symbols-outlined">chat</span>
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-lg">Tipo de Atendimento</h3>
          <div className="grid grid-cols-2 gap-3">
            <ServiceTypeChip id="COMPRA" label="Compra" icon="shopping_bag" active={type === 'COMPRA'} onClick={() => setType('COMPRA')} />
            <ServiceTypeChip id="TROCA" label="Troca" icon="sync" active={type === 'TROCA'} onClick={() => setType('TROCA')} />
            <ServiceTypeChip id="ORCAMENTO" label="Orçamento" icon="request_quote" active={type === 'ORCAMENTO'} onClick={() => setType('ORCAMENTO')} />
            <ServiceTypeChip id="INFORMACAO" label="Informação" icon="info" active={type === 'INFORMACAO'} onClick={() => setType('INFORMACAO')} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
          <img src={seller.avatar} alt="" className="size-10 rounded-full object-cover" />
          <div className="flex-1">
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Vendedor Ativo</p>
            <p className="font-semibold leading-none mt-1">{seller.name}</p>
          </div>
          <div className="flex items-center gap-1 bg-success/20 px-2 py-1 rounded-full">
            <div className="size-2 rounded-full bg-success"></div>
            <span className="text-[10px] font-bold text-success uppercase">Disponível</span>
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-md mx-auto">
          <button 
            onClick={handleSubmit}
            className="w-full bg-success hover:bg-success/90 active:scale-[0.98] text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-success/20 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">play_circle</span>
            Confirmar Início
          </button>
        </div>
      </div>
    </div>
  );
};

const ServiceTypeChip: React.FC<{ id: string; label: string; icon: string; active: boolean; onClick: () => void }> = ({ label, icon, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${active ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
  >
    <span className="material-symbols-outlined mb-1">{icon}</span>
    <span className="text-sm font-semibold">{label}</span>
  </button>
);

export default StartService;
