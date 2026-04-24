import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Phone, Mail, MapPin, FileText, Hash } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const EMPTY = { name:'', phone:'', email:'', cpf:'', address:'', city:'', complement:'', notes:'' };

function fmtCPF(v) {
  return v.replace(/\D/g,'').slice(0,11)
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/,'$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4');
}
function fmtPhone(v) {
  return v.replace(/\D/g,'').slice(0,11)
    .replace(/(\d{2})(\d)/,'($1) $2')
    .replace(/(\d{4,5})(\d{4})$/,'$1-$2');
}

export default function NovoCliente() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('basico'); // basico | contato | endereco

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setLoading(true);
    try {
      await api.post('/api/clients', form);
      toast.success('Cliente cadastrado!');
      navigate('/clientes');
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setLoading(false); }
  };

  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 };
  const inp = (extra={}) => ({ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'11px 14px', color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit', ...extra });
  const card = { background:'#111', border:'1px solid rgba(255,255,255,.06)', borderRadius:16, padding:24, marginBottom:16 };

  const SECTIONS = [['basico','👤 Básico'],['contato','📞 Contato'],['endereco','📍 Endereço']];

  return (
    <Layout>
      <div style={{ maxWidth:560, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
          <button onClick={() => navigate('/clientes')}
            style={{ background:'#161616', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'8px 14px', color:'#888', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontFamily:'inherit' }}>
            <ArrowLeft size={15}/> Voltar
          </button>
          <div>
            <h1 style={{ color:'#fff', fontSize:20, fontWeight:800, margin:0 }}>Novo Cliente</h1>
            <p style={{ color:'#555', fontSize:13, marginTop:2 }}>Campos com * são obrigatórios</p>
          </div>
        </div>

        {/* Section tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20, background:'#0d0d0d', border:'1px solid rgba(255,255,255,.06)', borderRadius:10, padding:4 }}>
          {SECTIONS.map(([id, label]) => (
            <button key={id} onClick={() => setSection(id)}
              style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
                background: section===id ? 'linear-gradient(135deg,#E87722,#C85A00)' : 'transparent',
                color: section===id ? '#fff' : '#555' }}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handle}>
          {/* BÁSICO */}
          {section === 'basico' && (
            <div style={card}>
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>Nome completo *</label>
                <div style={{ position:'relative' }}>
                  <User size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#444' }}/>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="Nome do cliente" style={inp({ paddingLeft:36 })} required/>
                </div>
              </div>
              <div>
                <label style={lbl}>CPF <span style={{ color:'#444', fontWeight:400, textTransform:'none', fontSize:10 }}>(opcional)</span></label>
                <div style={{ position:'relative' }}>
                  <Hash size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#444' }}/>
                  <input value={form.cpf} onChange={e => set('cpf', fmtCPF(e.target.value))}
                    placeholder="000.000.000-00" style={inp({ paddingLeft:36 })}/>
                </div>
                <p style={{ color:'#444', fontSize:11, marginTop:5 }}>Necessário para gerar contrato</p>
              </div>
            </div>
          )}

          {/* CONTATO */}
          {section === 'contato' && (
            <div style={card}>
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>Telefone / WhatsApp <span style={{ color:'#444', fontWeight:400, textTransform:'none', fontSize:10 }}>(opcional)</span></label>
                <div style={{ position:'relative' }}>
                  <Phone size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#444' }}/>
                  <input value={form.phone} onChange={e => set('phone', fmtPhone(e.target.value))}
                    placeholder="(37) 99999-0000" style={inp({ paddingLeft:36 })}/>
                </div>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>Email <span style={{ color:'#444', fontWeight:400, textTransform:'none', fontSize:10 }}>(opcional)</span></label>
                <div style={{ position:'relative' }}>
                  <Mail size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#444' }}/>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="email@exemplo.com" style={inp({ paddingLeft:36 })}/>
                </div>
              </div>
              <div>
                <label style={lbl}>Observações <span style={{ color:'#444', fontWeight:400, textTransform:'none', fontSize:10 }}>(opcional)</span></label>
                <div style={{ position:'relative' }}>
                  <FileText size={14} style={{ position:'absolute', left:12, top:14, color:'#444' }}/>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="Notas sobre o cliente..." rows={3}
                    style={{ ...inp({ paddingLeft:36 }), resize:'vertical', lineHeight:1.6 }}/>
                </div>
              </div>
            </div>
          )}

          {/* ENDEREÇO */}
          {section === 'endereco' && (
            <div style={card}>
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>Endereço <span style={{ color:'#444', fontWeight:400, textTransform:'none', fontSize:10 }}>(opcional)</span></label>
                <div style={{ position:'relative' }}>
                  <MapPin size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#444' }}/>
                  <input value={form.address} onChange={e => set('address', e.target.value)}
                    placeholder="Rua, número" style={inp({ paddingLeft:36 })}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:16 }}>
                <div>
                  <label style={lbl}>Cidade</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)}
                    placeholder="Divinópolis" style={inp()}/>
                </div>
                <div>
                  <label style={lbl}>UF</label>
                  <input value={form.state || ''} onChange={e => set('state', e.target.value.toUpperCase().slice(0,2))}
                    placeholder="MG" maxLength={2} style={inp()}/>
                </div>
              </div>
              <div>
                <label style={lbl}>Complemento</label>
                <input value={form.complement} onChange={e => set('complement', e.target.value)}
                  placeholder="Apto, bloco, referência..." style={inp()}/>
              </div>
            </div>
          )}

          {/* Navegação entre seções */}
          <div style={{ display:'flex', gap:10 }}>
            {section !== 'basico' && (
              <button type="button" onClick={() => setSection(section==='endereco' ? 'contato' : 'basico')}
                style={{ flex:1, padding:'12px', borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#888', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                ← Anterior
              </button>
            )}
            {section !== 'endereco' ? (
              <button type="button" onClick={() => setSection(section==='basico' ? 'contato' : 'endereco')}
                style={{ flex:2, padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Próximo →
              </button>
            ) : (
              <button type="submit" disabled={loading}
                style={{ flex:2, padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:loading?.6:1 }}>
                <Save size={15}/> {loading ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
}
