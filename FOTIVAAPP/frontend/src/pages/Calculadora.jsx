import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../lib/api';
import { Calculator, RefreshCw, Settings, Camera, ArrowRight } from 'lucide-react';

const OR = '#E87722';

const TIPOS = [
  { id:'casamento',    label:'Casamento',        horas:8,  edicao:10 },
  { id:'ensaio',       label:'Ensaio',            horas:2,  edicao:3  },
  { id:'aniversario',  label:'Aniversario',       horas:5,  edicao:6  },
  { id:'formatura',    label:'Formatura',         horas:6,  edicao:8  },
  { id:'corporativo',  label:'Corporativo',       horas:4,  edicao:4  },
  { id:'newborn',      label:'Newborn/Gestante',  horas:3,  edicao:5  },
  { id:'familia',      label:'Familia',           horas:3,  edicao:4  },
  { id:'book',         label:'Book/Retrato',      horas:2,  edicao:4  },
];

const NIVEIS = [
  { id:'iniciante',     label:'Iniciante',      mult:0.7  },
  { id:'intermediario', label:'Intermediario',  mult:1.0  },
  { id:'profissional',  label:'Profissional',   mult:1.4  },
  { id:'especialista',  label:'Especialista',   mult:1.8  },
];

const REGIOES = [
  { id:'interior_mg',  label:'Interior MG/SP/outros', mult:0.8  },
  { id:'capital',      label:'Capital (SP/RJ/BH)',     mult:1.2  },
  { id:'medio',        label:'Cidade media',           mult:1.0  },
];

const labelStyle = { color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:8 };
const cardStyle  = { background:'#111', border:'1px solid rgba(255,255,255,.06)', borderRadius:14, padding:20, marginBottom:16 };
const inpStyle   = { width:'100%', background:'#161616', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, color:'#ddd', padding:'10px 14px', fontSize:14, outline:'none', fontFamily:'inherit' };

export default function Calculadora() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tipo:'casamento', nivel:'intermediario', regiao:'medio',
    horasEvento:8, horasEdicao:10, kmDeslocamento:0,
    custoExtras:0, margem:40, equipamentosUsados:[],
  });
  const [resultado,   setResultado]   = useState(null);
  const [equipments,  setEquipments]  = useState([]);
  const [settings,    setSettings]    = useState(null);
  const [showConfig,  setShowConfig]  = useState(false);
  const [configForm,  setConfigForm]  = useState({ hourlyRate:38, editingRate:28, kmRate:1.5, monthlyEvents:4, defaultMargin:40 });

  useEffect(() => {
    Promise.all([
      api.get('/api/equipments').catch(() => ({ data: [] })),
      api.get('/api/settings/calculator').catch(() => ({ data: null })),
    ]).then(([r1, r2]) => {
      setEquipments(r1.data);
      if (r2.data) {
        setSettings(r2.data);
        setConfigForm({
          hourlyRate:    r2.data.hourlyRate    || 38,
          editingRate:   r2.data.editingRate   || 28,
          kmRate:        r2.data.kmRate        || 1.5,
          monthlyEvents: r2.data.monthlyEvents || 4,
          defaultMargin: r2.data.defaultMargin || 40,
        });
        setForm(f => ({...f, margem: r2.data.defaultMargin || 40 }));
      }
    });
  }, []);

  const set = (k, v) => setForm(p => ({...p, [k]: v}));

  function calcEquipamento(item) {
    const monthly = (settings?.monthlyEvents) || 4;
    return (item.buyValue / item.usageMonths) / monthly;
  }

  function calcular() {
    const nivel = NIVEIS.find(n => n.id === form.nivel) || NIVEIS[1];
    const reg   = REGIOES.find(r => r.id === form.regiao) || REGIOES[2];
    const hRate = settings?.hourlyRate    || 38;
    const eRate = settings?.editingRate   || 28;
    const kRate = settings?.kmRate        || 1.5;

    const maoDeObra    = parseFloat(form.horasEvento)    * hRate * nivel.mult * reg.mult;
    const edicao       = parseFloat(form.horasEdicao)    * eRate * nivel.mult;
    const deslocamento = parseFloat(form.kmDeslocamento) * kRate * 2;

    const equipSelecionados = equipments.filter(e => form.equipamentosUsados.includes(e._id));
    const custoEquip = equipSelecionados.reduce((sum, e) => sum + calcEquipamento(e), 0);

    const extras    = parseFloat(form.custoExtras) || 0;
    const subtotal  = maoDeObra + edicao + deslocamento + custoEquip + extras;
    const margemVal = subtotal * (parseFloat(form.margem) / 100);
    const total     = subtotal + margemVal;

    setResultado({
      maoDeObra:   Math.round(maoDeObra),
      edicao:      Math.round(edicao),
      deslocamento:Math.round(deslocamento),
      equipamento: Math.round(custoEquip),
      extras:      Math.round(extras),
      subtotal:    Math.round(subtotal),
      margemValor: Math.round(margemVal),
      total:       Math.round(total),
      sugestaoMin: Math.round(total * 0.9),
      sugestaoMax: Math.round(total * 1.2),
      equipamentosDetalhes: equipSelecionados.map(e => ({ name:e.name, valor:Math.round(calcEquipamento(e)) })),
    });
  }

  const salvarConfig = async () => {
    try {
      const { data } = await api.put('/api/settings/calculator', configForm);
      setSettings(data);
      setShowConfig(false);
    } catch(e) { console.error(e); }
  };

  const fmt = (v) => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

  return (
    <Layout>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${OR},#C85A00)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Calculator size={22} color="#fff"/>
            </div>
            <div>
              <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:0 }}>Calculadora de Precificacao</h1>
              <p style={{ color:'#555', fontSize:13, marginTop:3 }}>Descubra o valor justo para o seu trabalho</p>
            </div>
          </div>
          <button onClick={() => setShowConfig(true)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:9, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#888', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            <Settings size={14}/> Configurar
          </button>
        </div>

        {showConfig && (
          <div style={{ ...cardStyle, border:`1px solid ${OR}33`, background:`${OR}05` }}>
            <h3 style={{ color:OR, fontSize:13, fontWeight:800, marginBottom:14 }}>Configuracoes da calculadora</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label style={labelStyle}>Hora de cobertura (R$)</label>
                <input type="number" step="0.01" value={configForm.hourlyRate} onChange={e => setConfigForm(f => ({...f, hourlyRate:e.target.value}))} style={inpStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Hora de edicao (R$)</label>
                <input type="number" step="0.01" value={configForm.editingRate} onChange={e => setConfigForm(f => ({...f, editingRate:e.target.value}))} style={inpStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Valor por km (R$)</label>
                <input type="number" step="0.01" value={configForm.kmRate} onChange={e => setConfigForm(f => ({...f, kmRate:e.target.value}))} style={inpStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Eventos por mes (media)</label>
                <input type="number" min="1" value={configForm.monthlyEvents} onChange={e => setConfigForm(f => ({...f, monthlyEvents:e.target.value}))} style={inpStyle}/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>Margem de lucro padrao (%)</label>
                <input type="number" min="0" max="200" value={configForm.defaultMargin} onChange={e => setConfigForm(f => ({...f, defaultMargin:e.target.value}))} style={inpStyle}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:14 }}>
              <button onClick={() => setShowConfig(false)}
                style={{ flex:1, padding:'10px', borderRadius:9, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#888', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Cancelar
              </button>
              <button onClick={salvarConfig}
                style={{ flex:2, padding:'10px', borderRadius:9, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Salvar configuracoes
              </button>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <h3 style={{ color:OR, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.6, marginBottom:16 }}>Tipo de Evento</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:8 }}>
            {TIPOS.map(t => (
              <button key={t.id} onClick={() => { set('tipo', t.id); set('horasEvento', t.horas); set('horasEdicao', t.edicao); }}
                style={{ padding:'10px 12px', borderRadius:9, border:`1px solid ${form.tipo===t.id ? OR+'66' : 'rgba(255,255,255,.07)'}`, background: form.tipo===t.id ? OR+'18' : 'transparent', color: form.tipo===t.id ? OR : '#666', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ color:OR, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.6, marginBottom:16 }}>Seu Nivel e Regiao</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label style={labelStyle}>Nivel de experiencia</label>
              <select value={form.nivel} onChange={e => set('nivel', e.target.value)} style={{ ...inpStyle, cursor:'pointer' }}>
                {NIVEIS.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Regiao</label>
              <select value={form.regiao} onChange={e => set('regiao', e.target.value)} style={{ ...inpStyle, cursor:'pointer' }}>
                {REGIOES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
            <h3 style={{ color:OR, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.6, margin:0 }}>Equipamentos do Evento</h3>
            <button onClick={() => navigate('/equipamentos')}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, background:'rgba(232,119,34,.08)', border:'1px solid rgba(232,119,34,.2)', color:OR, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Gerenciar <ArrowRight size={11}/>
            </button>
          </div>
          {!equipments.length ? (
            <div style={{ background:'rgba(255,255,255,.03)', borderRadius:10, padding:20, textAlign:'center' }}>
              <Camera size={28} color="#444" style={{ marginBottom:8 }}/>
              <div style={{ color:'#666', fontSize:13, marginBottom:12 }}>Cadastre seus equipamentos para um calculo preciso</div>
              <button onClick={() => navigate('/equipamentos')}
                style={{ padding:'8px 18px', borderRadius:9, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Cadastrar equipamentos
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:8 }}>
              {equipments.map(eq => {
                const ativo  = form.equipamentosUsados.includes(eq._id);
                const porUso = calcEquipamento(eq);
                return (
                  <button key={eq._id} type="button"
                    onClick={() => {
                      const lista = form.equipamentosUsados;
                      set('equipamentosUsados', ativo ? lista.filter(x => x !== eq._id) : [...lista, eq._id]);
                    }}
                    style={{ padding:'10px 12px', borderRadius:9, border:`1px solid ${ativo ? OR+'66' : 'rgba(255,255,255,.07)'}`, background: ativo ? OR+'18' : 'transparent', color: ativo ? OR : '#666', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', flexDirection:'column', gap:3 }}>
                    <span>{eq.name}</span>
                    <span style={{ fontSize:10, opacity:.7 }}>{fmt(porUso)}/evento</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={{ color:OR, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.6, marginBottom:16 }}>Detalhes do Servico</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label style={labelStyle}>Horas no evento</label>
              <input type="number" min="1" max="24" value={form.horasEvento} onChange={e => set('horasEvento', e.target.value)} style={inpStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Horas de edicao</label>
              <input type="number" min="1" max="100" value={form.horasEdicao} onChange={e => set('horasEdicao', e.target.value)} style={inpStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Deslocamento (km ida)</label>
              <input type="number" min="0" value={form.kmDeslocamento} onChange={e => set('kmDeslocamento', e.target.value)} style={inpStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Custo extras (R$)</label>
              <input type="number" min="0" value={form.custoExtras} onChange={e => set('custoExtras', e.target.value)} style={inpStyle}/>
              <div style={{ color:'#444', fontSize:11, marginTop:4 }}>Assistente, props, comida...</div>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={labelStyle}>Margem de lucro (%)</label>
              <input type="number" min="0" max="200" value={form.margem} onChange={e => set('margem', e.target.value)} style={inpStyle}/>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:24 }}>
          <button onClick={calcular}
            style={{ flex:2, padding:'14px', borderRadius:12, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit' }}>
            <Calculator size={18}/> Calcular valor
          </button>
          <button onClick={() => setResultado(null)}
            style={{ flex:1, padding:'14px', borderRadius:12, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#888', fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }}>
            <RefreshCw size={15}/> Limpar
          </button>
        </div>

        {resultado && (
          <div style={{ ...cardStyle, border:`1px solid ${OR}33`, background:`${OR}08` }}>
            <h3 style={{ color:OR, fontSize:14, fontWeight:800, marginBottom:20 }}>Resultado da Precificacao</h3>

            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
              {[
                { label:'Mao de obra (evento)', value: resultado.maoDeObra },
                { label:'Edicao/pos-processamento', value: resultado.edicao },
                { label:'Deslocamento (ida e volta)', value: resultado.deslocamento },
                { label:'Depreciacao equipamentos', value: resultado.equipamento },
                { label:'Extras', value: resultado.extras },
              ].filter(i => i.value > 0).map(item => (
                <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'rgba(255,255,255,.03)', borderRadius:9 }}>
                  <span style={{ color:'#888', fontSize:13 }}>{item.label}</span>
                  <span style={{ color:'#ccc', fontSize:13, fontWeight:600 }}>{fmt(item.value)}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', background:'rgba(255,255,255,.05)', borderRadius:9 }}>
                <span style={{ color:'#aaa', fontSize:13 }}>Subtotal</span>
                <span style={{ color:'#fff', fontSize:13, fontWeight:700 }}>{fmt(resultado.subtotal)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', background:'rgba(255,255,255,.03)', borderRadius:9 }}>
                <span style={{ color:'#888', fontSize:13 }}>Margem de lucro ({form.margem}%)</span>
                <span style={{ color:'#22C55E', fontSize:13, fontWeight:600 }}>{fmt(resultado.margemValor)}</span>
              </div>
            </div>

            <div style={{ background:`${OR}15`, border:`1px solid ${OR}44`, borderRadius:14, padding:20, textAlign:'center', marginBottom:16 }}>
              <div style={{ color:OR, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Valor sugerido</div>
              <div style={{ color:'#fff', fontSize:36, fontWeight:900 }}>{fmt(resultado.total)}</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:12, padding:14, textAlign:'center' }}>
                <div style={{ color:'#22C55E', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Minimo aceitavel</div>
                <div style={{ color:'#fff', fontSize:20, fontWeight:800 }}>{fmt(resultado.sugestaoMin)}</div>
              </div>
              <div style={{ background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.2)', borderRadius:12, padding:14, textAlign:'center' }}>
                <div style={{ color:'#3B82F6', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Valor premium</div>
                <div style={{ color:'#fff', fontSize:20, fontWeight:800 }}>{fmt(resultado.sugestaoMax)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
