
import React, { useState } from 'react';
import { Seller } from '../types';

interface LoginProps {
  sellers: Seller[];
  onAdminLogin: () => void;
  onFiscalLogin: () => void;
  onSellerLogin: (sellerId: string) => void;
}

const Login: React.FC<LoginProps> = ({ sellers, onAdminLogin, onFiscalLogin, onSellerLogin }) => {
  const [mode, setMode] = useState<'CHOICE' | 'PASS' | 'SELLER_SELECT'>('CHOICE');
  const [targetRole, setTargetRole] = useState<'ADMIN' | 'FISCAL' | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handlePassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPass = localStorage.getItem('adminPassword') || '1234';
    if (password === storedPass) {
      if (targetRole === 'ADMIN') onAdminLogin();
      else onFiscalLogin();
    } else {
      setError('Senha de acesso inválida');
      if (window.navigator.vibrate) window.navigator.vibrate(200);
      setTimeout(() => setError(''), 3000);
    }
  };

  const openPass = (role: 'ADMIN' | 'FISCAL') => {
    setTargetRole(role);
    setMode('PASS');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-background-dark transition-colors duration-500">
      <div className="w-full max-w-sm space-y-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="size-24 bg-primary rounded-[35%] flex items-center justify-center mx-auto shadow-[0_20px_60px_-15px_rgba(19,91,236,0.6)] mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
            <span className="material-symbols-outlined text-white text-5xl">format_list_numbered</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Lista da Vez Pro</h1>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Excelência no Atendimento</p>
        </div>

        {mode === 'CHOICE' && (
          <div className="grid gap-5">
            <ChoiceButton 
              onClick={() => setMode('SELLER_SELECT')} 
              icon="badge" 
              title="Sou Vendedor" 
              desc="Meu painel e fila pessoal" 
              color="text-primary" 
              bg="bg-primary/5" 
            />
            <ChoiceButton 
              onClick={() => openPass('FISCAL')} 
              icon="manage_accounts" 
              title="Fiscal de Loja" 
              desc="Direcionar clientes e monitorar" 
              color="text-green-500" 
              bg="bg-green-500/5" 
            />
            <ChoiceButton 
              onClick={() => openPass('ADMIN')} 
              icon="shield_person" 
              title="Administração" 
              desc="Gestão de equipe e dados" 
              color="text-gray-500" 
              bg="bg-gray-100 dark:bg-gray-800" 
            />
          </div>
        )}

        {mode === 'PASS' && (
          <form onSubmit={handlePassSubmit} className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-2xl space-y-8 animate-in slide-in-from-bottom duration-300 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-5">
              <button type="button" onClick={() => setMode('CHOICE')} className="size-12 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 flex items-center justify-center active:scale-90 transition-all">
                <span className="material-symbols-outlined text-3xl">arrow_back</span>
              </button>
              <div className="text-left">
                <h3 className="text-2xl font-black">{targetRole === 'ADMIN' ? 'Gestão' : 'Fiscal'}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acesso Restrito</p>
              </div>
            </div>
            <div className="space-y-4 text-center">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Senha Master</label>
              <input 
                autoFocus 
                type="password" 
                placeholder="••••" 
                className="w-full h-20 bg-gray-50 dark:bg-gray-800 border-0 rounded-[2rem] px-6 text-center text-5xl tracking-[0.5em] focus:ring-4 focus:ring-primary/20 transition-all font-mono shadow-inner" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
              {error && <p className="text-red-500 text-[10px] font-black uppercase animate-bounce">{error}</p>}
            </div>
            <button className="w-full h-18 bg-primary text-white rounded-[2rem] font-black text-xl shadow-[0_15px_40px_-10px_rgba(19,91,236,0.4)] active:scale-95 transition-all">
              Desbloquear
            </button>
          </form>
        )}

        {mode === 'SELLER_SELECT' && (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-2xl space-y-6 max-h-[65vh] flex flex-col animate-in slide-in-from-bottom duration-300 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-5">
              <button type="button" onClick={() => setMode('CHOICE')} className="size-12 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">arrow_back</span>
              </button>
              <div className="text-left">
                <h3 className="text-2xl font-black">Quem é você?</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selecione seu nome</p>
              </div>
            </div>
            <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
              {sellers.length === 0 ? (
                <div className="py-20 text-center opacity-30">
                  <span className="material-symbols-outlined text-6xl">person_off</span>
                  <p className="text-xs font-black uppercase mt-2">Sem vendedores</p>
                </div>
              ) : (
                sellers.map(s => (
                  <button key={s.id} onClick={() => onSellerLogin(s.id)} className="w-full flex items-center gap-5 p-4 rounded-[2rem] bg-gray-50 dark:bg-gray-800/50 hover:bg-primary/10 border-2 border-transparent hover:border-primary/20 transition-all active:scale-[0.98] group">
                    <img src={s.avatar} alt="" className="size-16 rounded-[1.2rem] object-cover shadow-md group-hover:rotate-2 transition-transform" />
                    <p className="font-black text-xl text-left flex-1">{s.name}</p>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">arrow_forward</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ChoiceButton: React.FC<{ onClick: () => void; icon: string; title: string; desc: string; color: string; bg: string }> = ({ onClick, icon, title, desc, color, bg }) => (
  <button onClick={onClick} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all flex items-center gap-5 text-left active:scale-95 border border-gray-100 dark:border-gray-800 group overflow-hidden relative">
    <div className={`size-16 rounded-[1.5rem] ${bg} ${color} flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500`}>
      <span className="material-symbols-outlined text-3xl">{icon}</span>
    </div>
    <div className="relative z-10">
      <p className="font-black text-xl leading-none mb-1 group-hover:text-primary transition-colors">{title}</p>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{desc}</p>
    </div>
    <div className="absolute right-0 top-0 size-24 bg-primary/5 rounded-full blur-3xl -translate-y-12 translate-x-12 group-hover:bg-primary/20 transition-colors"></div>
  </button>
);

export default Login;
