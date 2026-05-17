import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Calculator, RefreshCw } from 'lucide-react';

const OR = '#E87722';

const TIPOS = [
  { id:'casamento',    label:'Casamento',        base:800,  horas:8,  edicao:10 },
  { id:'ensaio',       label:'Ensaio',            base:250,  horas:2,  edicao:3  },
  { id:'aniversario',  label:'Aniversario',       base:500,  horas:5,  edicao:6  },
  { id:'formatura',    label:'Formatura',         base:600,  horas:6,  edicao:8  },
  { id:'corporativo',  label:'Corporativo',       base:400,  horas:4,  edicao:4  },
  { id:'newborn',      label:'Newborn/Gestante',  base:350,  horas:3,  edicao:5  },
  { id:'familia',      label:'Familia',           base:300,  horas:3,  edicao:4  },
  { id:'book',         label:'Book/Retrato',      base:280,  horas:2,  edicao:4  },
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
  const [form, setForm] = useState({
    tipo:          'casamento',
    nivel:         'intermediario',
    regiao:        'medio',
    horasEvento:   8,
    horasEdicao:   10,
    kmDeslocamento:0,
    valorKm:       1.5,
    custoEquip:    50,
    margem:        30,
  });
  const [resultado, setResultado] = useState(null);

  const set = (k, v) => setForm(p => ({...p, [k]: v}));

  function calcular() {
    const tipo  = TIPOS.find(t => t.id === form.tipo)  || TIPOS[0];
    const nivel = NIVEIS.find(n => n.id === form.nivel) || NIVEIS[1];
    const reg   = REGIOES.find(r => r.id === form.regiao) || REGIOES[2];

    const valorHoraTrab = 35;
    const maoDeObra     = parseFloat(form.horasEvento) * valorHoraTrab * nivel.mult * reg.mult;
    const edicao        = parseFloat(form.horasEdicao) * 25 * nivel.mult;
    const deslocamento  = parseFloat(form.kmDeslocamento) * parseFloat(form.valorKm) * 2;
    const equipamento   = parseFloat(form.custoEquip) || 0;
    const subtotal      = maoDeObra + edicao + deslocamento + equipamento;
    const margemValor   = subtotal * (parseFloat(form.margem) / 100);
    const total         = subtotal + margemValor;

    setResultado({
      maoDeObra:   Math.round(maoDeObra),
      edicao:      Math.round(edicao),
      deslocamento:Math.round(deslocamento),
      equipamento: Math.round(equipamento),
      subtotal:    Math.round(subtotal),
      margemValor: Math.round(margemValor),
      total:       Math.round(total),
      sugestaoMin: Math.round(total * 0.9),
      sugestaoMax: Math.round(total * 1.2),
    });
  }

  const fmt = (v) => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

  return (
    <Layout>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${OR},#C85A00)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Calculator size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:0 }}>Calculadora de Precificacao</h1>
            <p style={{ color:'#555', fontSize:13, marginTop:3 }}>Descubra o valor justo para o seu trabalho</p>
          </div>
        </div>

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
              <label style={labelStyle}>Valor por km (R$)</label>
              <input type="number" min="0" step="0.1" value={form.valorKm} onChange={e => set('valorKm', e.target.value)} style={inpStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Custo equip./extras (R$)</label>
              <input type="number" min="0" value={form.custoEquip} onChange={e => set('custoEquip', e.target.value)} style={inpStyle}/>
              <div style={{ color:'#444', fontSize:11, marginTop:4 }}>Cartao, assistente, props...</div>
            </div>
            <div>
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
                { label:'Equipamento e extras', value: resultado.equipamento },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'rgba(255,255,255,.03)', borderRadius:9 }}>
                  <span style={{ color:'#888', fontSize:13 }}>{item.label}</span>
                  <span style={{ color:'#ccc', fontSize:13, fontWeight:600 }}>{fmt(item.value)}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', background:'rgba(255,255,255,.05)', borderRadius:9, borderTop:`1px solid rgba(255,255,255,.08)` }}>
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

            <div style={{ marginTop:16, padding:'12px 14px', background:'rgba(255,255,255,.03)', borderRadius:10, fontSize:12, color:'#555', lineHeight:1.7 }}>
              Estes valores sao sugestoes baseadas em parametros do mercado fotografico brasileiro.
              Ajuste conforme sua experiencia, portfolio e demanda local.
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
