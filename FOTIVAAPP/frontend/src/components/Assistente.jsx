import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Mic, MicOff, Check, Edit3 } from 'lucide-react';
import api from '../lib/api';

const FotivaIcon = () => (
  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
    <path d="M4 5C4 5 9 3 14 7C14 7 19 11 16 16C16 16 13 20 8 17" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M8 17C8 17 5 20 4 18C3 16 6 14 8 13" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const SUGESTOES = [
  'Casamento da Ana dia 15/06 às 16h, R$3000',
  'Ensaio para o Pedro, 20/05, R$800',
  'Ver meus clientes',
  'Ver eventos futuros',
];

export default function Assistente() {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([{ type: 'bot', text: '👋 Olá! Sou o assistente FOTIVA com IA.\n\nFale naturalmente:\n• "Casamento do Marcos 23/05 às 18h, R$2000"\n• "Ensaio Ana, 300 reais, pix"\n• "Novo cliente João, tel 11999990000"\n• "Ver meus eventos"' }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [recOn,   setRecOn]   = useState(false);
  const [pending, setPending] = useState(null);
  const bottomRef = useRef(null);
  const recRef    = useRef(null);
  const transRef  = useRef('');

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'pt-BR'; r.continuous = true; r.interimResults = true;
    r.onresult = e => {
      let f = '', i = '';
      for (let x = 0; x < e.results.length; x++)
        e.results[x].isFinal ? f += e.results[x][0].transcript : i += e.results[x][0].transcript;
      const t = (f + i).trim();
      setInput(t); transRef.current = t;
    };
    r.onerror = e => { if (e.error !== 'no-speech') setRecOn(false); };
    r.onend = () => setRecOn(false);
    recRef.current = r;
  }, []);

  useEffect(() => {
    if (!recOn && transRef.current.trim()) {
      const t = setTimeout(() => {
        const txt = transRef.current.trim();
        if (txt) { send(txt); transRef.current = ''; }
      }, 800);
      return () => clearTimeout(t);
    }
  }, [recOn]);

  const addBot = useCallback((text, extra = {}) => {
    setMsgs(p => [...p, { type: 'bot', text, ...extra }]);
  }, []);

  const send = useCallback(async (txt = input) => {
    const msg = (txt || '').trim();
    if (!msg || loading) return;
    setMsgs(p => [...p, { type: 'user', text: msg }]);
    setInput(''); transRef.current = '';
    setLoading(true);
    try {
      const { data } = await api.post('/api/chat', { message: msg });
      if (data.acao_pendente) {
        setPending({ acao_pendente: data.acao_pendente, dados: data.dados });
        addBot(data.message, { hasBotoes: true });
      } else {
        setPending(null);
        addBot(data.message || '✅ Feito!');
      }
    } catch (e) {
      addBot(`❌ ${e.response?.data?.error || 'Erro de conexão.'}`);
    }
    setLoading(false);
  }, [input, loading, addBot]);

  const confirmar = useCallback(async () => {
    if (!pending) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/chat/confirmar', pending);
      setPending(null);
      addBot(data.message || '✅ Criado!');
    } catch { addBot('❌ Erro ao confirmar.'); }
    setLoading(false);
  }, [pending, addBot]);

  const toggleMic = () => {
    if (!recRef.current) { addBot('❌ Microfone não disponível.'); return; }
    if (recOn) { recRef.current.stop(); setRecOn(false); }
    else {
      setInput(''); transRef.current = '';
      try { recRef.current.start(); setRecOn(true); }
      catch { recRef.current.stop(); setTimeout(() => { recRef.current.start(); setRecOn(true); }, 200); }
    }
  };

  const S = { /* styles */ };

  return (
    <>
      {/* FAB */}
      <button onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 60,
          width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: open ? '#1C1C1C' : 'linear-gradient(135deg,#E87722,#C85A00)',
          boxShadow: open ? '0 4px 20px rgba(0,0,0,0.5)' : '0 8px 28px rgba(232,119,34,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .25s cubic-bezier(0.4,0,0.2,1)',
          transform: open ? 'scale(1)' : 'scale(1)',
        }}>
        {open
          ? <X size={22} color="#888" />
          : <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
              <path d="M4 5C4 5 9 3 14 7C14 7 19 11 16 16C16 16 13 20 8 17" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M8 17C8 17 5 20 4 18C3 16 6 14 8 13" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
        }
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 60,
          width: 380, maxWidth: 'calc(100vw - 32px)',
          height: 540, borderRadius: 20, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
          animation: 'fadeIn .2s ease',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#080808', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#E87722,#C85A00)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FotivaIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Assistente FOTIVA</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <div style={{ width: 6, height: 6, background: '#22C55E', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                <span style={{ color: '#555', fontSize: 11 }}>IA Online · Fale livremente</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', display: 'flex', padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8, background: '#0D0D0D' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.type === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6 }}>
                {m.type === 'bot' && (
                  <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg,#E87722,#C85A00)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 }}>
                    <FotivaIcon />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '78%' }}>
                  <div style={{
                    padding: '9px 13px', borderRadius: m.type === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-line',
                    background: m.type === 'user' ? 'linear-gradient(135deg,#E87722,#C85A00)' : '#1A1A1A',
                    color: m.type === 'user' ? '#fff' : '#ccc',
                    border: m.type === 'bot' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    {m.text}
                  </div>
                  {m.hasBotoes && pending && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={confirmar} disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(135deg,#E87722,#C85A00)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <Check size={13} /> Confirmar
                      </button>
                      <button onClick={() => { setPending(null); addBot('Ok! Me diga o que quer corrigir.'); }} disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#222', color: '#aaa', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <Edit3 size={13} /> Editar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg,#E87722,#C85A00)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FotivaIcon />
                </div>
                <div style={{ padding: '10px 14px', background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px 14px 14px 4px' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0,150,300].map(d => <span key={d} style={{ width: 7, height: 7, background: '#E87722', borderRadius: '50%', animation: `pulse 1.2s ${d}ms infinite` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugestões */}
          {msgs.length <= 1 && (
            <div style={{ padding: '8px 12px', background: '#0A0A0A', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0 }}>
              {SUGESTOES.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(232,119,34,0.1)', color: '#E87722', border: '1px solid rgba(232,119,34,0.2)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                  {s.length > 28 ? s.slice(0, 28) + '…' : s}
                </button>
              ))}
            </div>
          )}

          {/* Gravando */}
          {recOn && (
            <div style={{ padding: '6px 14px', background: '#1A0808', borderTop: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
              <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 500 }}>Gravando... pressione ⏹ para parar</span>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px', background: '#080808', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 7, flexShrink: 0 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={recOn ? 'Ouvindo...' : 'Ex: casamento da Ana, 15/06, R$3000...'}
              disabled={loading}
              style={{
                flex: 1, background: recOn ? '#1A0808' : '#151515',
                border: `1px solid ${recOn ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 10, color: '#ddd', padding: '8px 12px', fontSize: 13, outline: 'none',
              }} />
            <button onClick={toggleMic}
              style={{ padding: 9, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: recOn ? '#ef4444' : '#1C1C1C', color: recOn ? '#fff' : '#666', transition: 'all .15s' }}>
              {recOn ? <MicOff size={17} /> : <Mic size={17} />}
            </button>
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ padding: 9, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#E87722,#C85A00)', color: '#fff', opacity: !input.trim() || loading ? 0.4 : 1, transition: 'all .15s' }}>
              <Send size={17} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
