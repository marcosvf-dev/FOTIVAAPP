import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Mic, MicOff, Check, Edit3 } from 'lucide-react';
import api from '../lib/api';

const ICONE_SRC = "data:image/jpeg;base64,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";
const FotivaIcon = () => (
  <img src={ICONE_SRC} alt="Fotiva" style={{ width:22, height:22, objectFit:'contain', borderRadius:5 }}/>
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
  const [pending,  setPending]  = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const bottomRef = useRef(null);
  const recRef    = useRef(null);
  const transRef  = useRef('');

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { recRef.current = null; return; }
    try {
      const r = new SR();
      r.lang = 'pt-BR';
      r.continuous = false;
      r.interimResults = true;
      r.maxAlternatives = 1;
      r.onresult = e => {
        let final = '', interim = '';
        for (let x = 0; x < e.results.length; x++) {
          if (e.results[x].isFinal) final += e.results[x][0].transcript;
          else interim += e.results[x][0].transcript;
        }
        const t = (final || interim).trim();
        if (t) { setInput(t); transRef.current = t; }
      };
      r.onerror = e => {
        console.log('Speech error:', e.error);
        setRecOn(false);
        if (e.error === 'not-allowed') {
          setMsgs(p => [...p, { type:'bot', text:'❌ Permissão de microfone negada. Ative nas configurações do celular.' }]);
        }
      };
      r.onend = () => setRecOn(false);
      recRef.current = r;
    } catch(err) {
      recRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!recOn && transRef.current.trim()) {
      const t = setTimeout(() => {
        const txt = transRef.current.trim();
        if (txt) {
          send(txt);
          transRef.current = '';
          setInput('');
        }
      }, 600);
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
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !recRef.current) {
      setMsgs(p => [...p, { type:'bot', text:'❌ Seu navegador não suporta microfone.\n📱 iPhone: Safari → Configurações → Microfone → Permitir\n🤖 Android: use o Chrome.' }]);
      return;
    }
    if (recOn) {
      recRef.current.stop();
      setRecOn(false);
    } else {
      setInput('');
      transRef.current = '';
      try {
        recRef.current.start();
        setRecOn(true);
      } catch(err) {
        console.log('Start error:', err);
        // Recria o recognition e tenta de novo
        try {
          const r = new SR();
          r.lang = 'pt-BR'; r.continuous = false; r.interimResults = true;
          r.onresult = e => {
            let t = '';
            for (let x = 0; x < e.results.length; x++)
              t += e.results[x][0].transcript;
            if (t.trim()) { setInput(t.trim()); transRef.current = t.trim(); }
          };
          r.onerror = e => { setRecOn(false); };
          r.onend = () => setRecOn(false);
          recRef.current = r;
          r.start();
          setRecOn(true);
        } catch(err2) {
          setMsgs(p => [...p, { type:'bot', text:'❌ Não foi possível ativar o microfone. Tente digitar.' }]);
          setRecOn(false);
        }
      }
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
          : <img src={ICONE_SRC} alt="Fotiva" style={{ width:28, height:28, objectFit:"contain", borderRadius:7 }}/>
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
                      <button onClick={() => { setEditForm(pending?.dados || {}); setEditMode(true); }} disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#222', color: '#aaa', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <Edit3 size={13} /> Editar dados
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

      {/* Modal de edição de dados */}
      {editMode && pending && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}>
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:24, width:'100%', maxWidth:360 }}>
            <div style={{ color:'#fff', fontWeight:700, fontSize:15, marginBottom:16 }}>✏️ Editar dados</div>
            {[
              ['tipo_evento',    'Tipo de evento',  'text'],
              ['cliente_nome',   'Nome do cliente', 'text'],
              ['data',           'Data (AAAA-MM-DD)','date'],
              ['horario',        'Horário (HH:MM)',  'time'],
              ['valor_total',    'Valor total (R$)', 'number'],
              ['valor_pago',     'Entrada paga (R$)','number'],
              ['local',          'Local',            'text'],
              ['forma_pagamento','Forma pagamento',  'text'],
            ].map(([key, label, type]) => (
              <div key={key} style={{ marginBottom:10 }}>
                <label style={{ display:'block', color:'#666', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>{label}</label>
                <input
                  type={type}
                  value={editForm[key] || ''}
                  onChange={e => setEditForm(f => ({...f, [key]: e.target.value}))}
                  style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit' }}
                />
              </div>
            ))}
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button onClick={() => setEditMode(false)}
                style={{ flex:1, padding:'10px', borderRadius:9, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'#888', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Cancelar
              </button>
              <button onClick={() => {
                setPending(p => ({...p, dados: editForm}));
                setEditMode(false);
                addBot('✅ Dados atualizados! Confirme para salvar.');
              }}
                style={{ flex:2, padding:'10px', borderRadius:9, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                💾 Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
