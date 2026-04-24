import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import { X, Download, MessageCircle, FileText, CheckCircle } from 'lucide-react';

const LOGO_SRC = "data:image/jpeg;base64,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";

function fmtDate(d) {
  if (!d) return '___/___/______';
  return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
}
function fmtMoney(v) {
  return (v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}
function fmtDateShort(d) {
  if (!d) return '__/__/____';
  return new Date(d).toLocaleDateString('pt-BR');
}

export default function Contrato({ eventoId, onClose }) {
  const [evento,    setEvento]    = useState(null);
  const [cliente,   setCliente]   = useState(null);
  const [fotografo, setFotografo] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [clausulas, setClausulas] = useState({
    entrega: '30',        // dias para entrega
    revisoes: '2',        // revisões incluídas
    cancelamento: '30',   // dias de antecedência para cancelamento sem multa
    multa: '50',          // % de multa por cancelamento tardio
    direitos: true,       // fotógrafo mantém direitos autorais
    extra: '',            // cláusula extra opcional
  });
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [evRes, userRes] = await Promise.all([
          api.get(`/api/events/${eventoId}`),
          api.get('/api/auth/me'),
        ]);
        setEvento(evRes.data);
        setFotografo(userRes.data);
        if (evRes.data.clientId) {
          const cliRes = await api.get(`/api/clients/${evRes.data.clientId}`);
          setCliente(cliRes.data);
        }
      } catch { toast.error('Erro ao carregar dados'); }
      setLoading(false);
    }
    load();
  }, [eventoId]);

  function gerarTextoContrato() {
    if (!evento || !fotografo) return '';
    const ev = evento;
    const fo = fotografo;
    const cl = cliente || {};
    const hoje = fmtDate(new Date());
    const dataEvento = fmtDate(ev.eventDate);
    const saldo = (ev.totalValue||0) - (ev.amountPaid||0);

    return `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS

${fo.city ? fo.city + ', ' : ''}${hoje}

CONTRATANTE (CLIENTE):
Nome: ${cl.name || ev.clientName || '_______________'}
CPF: ${cl.cpf || '___.___.___-__'}
Endereço: ${cl.address ? `${cl.address}${cl.complement?', '+cl.complement:''}, ${cl.city||''}${cl.state?'/'+cl.state:''}` : '_______________________________________________'}
Telefone: ${cl.phone || '(__) _____-____'}
E-mail: ${cl.email || '___________________________'}

CONTRATADO (FOTÓGRAFO):
Nome: ${fo.name || '_______________'}
Estúdio: ${fo.studioName || '_______________'}
Telefone: ${fo.phone || '(__) _____-____'}
E-mail: ${fo.email || '___________________________'}

OBJETO DO CONTRATO:
Prestação de serviços fotográficos para ${ev.eventType}
Data do evento: ${dataEvento}
Horário: ${ev.eventDate ? new Date(ev.eventDate).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '__h__'}
Local: ${ev.location || '_______________________________________________'}

VALOR E PAGAMENTO:
Valor total: ${fmtMoney(ev.totalValue)}
Sinal/Entrada: ${fmtMoney(ev.amountPaid)} (já pago)
Saldo restante: ${fmtMoney(saldo)}
${ev.installments > 1 ? `Parcelamento: ${ev.installments}x de ${fmtMoney(saldo/ev.installments)}` : ''}
Forma de pagamento: ${ev.paymentType?.toUpperCase() || 'A COMBINAR'}

CLÁUSULAS E CONDIÇÕES:

1. ENTREGA DO MATERIAL
O CONTRATADO se compromete a entregar o material fotográfico editado em até ${clausulas.entrega} (${numPorExtenso(clausulas.entrega)}) dias corridos após a realização do evento.

2. REVISÕES
Estão incluídas ${clausulas.revisoes} (${numPorExtenso(clausulas.revisoes)}) rodada(s) de revisão sem custo adicional. Solicitações além deste limite serão orçadas separadamente.

3. CANCELAMENTO
O cancelamento deverá ser comunicado com no mínimo ${clausulas.cancelamento} (${numPorExtenso(clausulas.cancelamento)}) dias de antecedência para que o sinal seja devolvido integralmente. Cancelamentos com prazo inferior implicam multa de ${clausulas.multa}% sobre o valor total do contrato.

4. DIREITOS AUTORAIS
${clausulas.direitos
  ? 'O CONTRATADO mantém todos os direitos autorais sobre as fotografias produzidas, podendo utilizá-las em portfólio, redes sociais e material de divulgação, preservando a privacidade do CONTRATANTE quando solicitado.'
  : 'O CONTRATANTE terá uso exclusivo das fotografias para fins pessoais, sendo vedada a comercialização sem autorização prévia do CONTRATADO.'}

5. IMPREVISTOS
Em caso de força maior que impossibilite a realização do serviço (doença grave, acidente, desastre natural), o CONTRATADO se compromete a indicar outro profissional de qualidade equivalente ou devolver integralmente o valor pago.

6. EQUIPAMENTOS
O CONTRATADO disponibilizará equipamentos e profissionais necessários para a cobertura do evento. Danos causados por terceiros aos equipamentos do CONTRATADO são de responsabilidade do CONTRATANTE.
${clausulas.extra ? `
7. DISPOSIÇÕES ADICIONAIS
${clausulas.extra}` : ''}

Ambas as partes declaram ter lido, compreendido e concordado com todos os termos deste contrato.

${fo.city || '_____________'}, ${hoje}


_______________________________________
${fo.name || 'CONTRATADO'}
${fo.studioName || ''}


_______________________________________
${cl.name || ev.clientName || 'CONTRATANTE'}
CPF: ${cl.cpf || '___.___.___-__'}
    `.trim();
  }

  function numPorExtenso(n) {
    const nums = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove',
      'dez','quinze','vinte','trinta','quarenta','cinquenta','sessenta','noventa'];
    const map = {'1':'um','2':'dois','3':'três','5':'cinco','7':'sete','10':'dez',
      '15':'quinze','20':'vinte','30':'trinta','50':'cinquenta','60':'sessenta','90':'noventa'};
    return map[String(n)] || String(n);
  }

  function downloadPDF() {
    const texto = gerarTextoContrato();
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Contrato — ${evento?.clientName || ''}</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.7; }
  h1 { text-align: center; font-size: 18px; letter-spacing: 2px; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
  .logo { text-align: center; margin-bottom: 24px; }
  .logo img { height: 50px; }
  .section { margin-bottom: 24px; }
  .section strong { display: block; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; color: #444; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .field { margin-bottom: 6px; font-size: 14px; }
  .assinaturas { display: flex; justify-content: space-around; margin-top: 60px; }
  .ass-box { text-align: center; width: 280px; }
  .ass-line { border-top: 1px solid #333; padding-top: 8px; font-size: 13px; }
  pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 14px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="logo"><img src="${LOGO_SRC}" alt="Fotiva"/></div>
<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS</h1>
<pre>${texto}</pre>
</body>
</html>`;

    const blob = new Blob([html], { type:'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Contrato_${(evento?.clientName||'cliente').replace(/\s+/g,'_')}_${evento?.eventType||''}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Contrato baixado! Abra no navegador e use Ctrl+P para salvar como PDF.');
  }

  function enviarWhatsApp() {
    const cl = cliente || {};
    const phone = cl.phone?.replace(/\D/g,'');
    if (!phone) { toast.error('Cliente sem telefone cadastrado'); return; }

    const ev = evento;
    const msg = encodeURIComponent(
      `Olá ${cl.name || ev.clientName}! 😊

` +
      `Segue o resumo do nosso contrato para o *${ev.eventType}* em *${fmtDateShort(ev.eventDate)}*:

` +
      `📍 Local: ${ev.location || 'a combinar'}
` +
      `💰 Valor total: ${fmtMoney(ev.totalValue)}
` +
      `✅ Entrada paga: ${fmtMoney(ev.amountPaid)}
` +
      `⏳ Saldo restante: ${fmtMoney((ev.totalValue||0)-(ev.amountPaid||0))}

` +
      `Estou enviando o contrato completo em PDF em seguida. Por favor, confirme o recebimento! 📄

` +
      `_${fotografo?.studioName || fotografo?.name || 'Fotógrafo'}_`
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
    toast.success('WhatsApp aberto! Envie o PDF do contrato em seguida.');
  }

  if (loading) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}>
      <div style={{ color:'#E87722', fontSize:16 }}>Carregando contrato...</div>
    </div>
  );

  const texto = gerarTextoContrato();

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.92)', zIndex:2000, overflowY:'auto', padding:20 }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <FileText size={22} color="#E87722"/>
            <div>
              <div style={{ color:'#fff', fontSize:16, fontWeight:800 }}>Contrato — {evento?.clientName}</div>
              <div style={{ color:'#555', fontSize:12 }}>{evento?.eventType} · {fmtDateShort(evento?.eventDate)}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setEditando(!editando)}
              style={{ padding:'8px 16px', borderRadius:9, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'#888', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              ✏️ {editando ? 'Fechar edição' : 'Editar cláusulas'}
            </button>
            <button onClick={enviarWhatsApp}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:9, background:'rgba(37,211,102,.12)', border:'1px solid rgba(37,211,102,.25)', color:'#25D366', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              <MessageCircle size={15}/> WhatsApp
            </button>
            <button onClick={downloadPDF}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:9, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', border:'none' }}>
              <Download size={15}/> Baixar PDF
            </button>
            <button onClick={onClose}
              style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'#888', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={18}/>
            </button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: editando ? '1fr 340px' : '1fr', gap:20 }}>

          {/* Contrato preview */}
          <div style={{ background:'#fff', borderRadius:16, padding:'48px 56px', color:'#1a1a1a', fontFamily:'Georgia,serif', lineHeight:1.8 }}>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <img src={LOGO_SRC} alt="Fotiva" style={{ height:44, objectFit:'contain', marginBottom:16 }}/>
              <h2 style={{ fontSize:15, fontWeight:700, letterSpacing:2, textTransform:'uppercase', borderBottom:'2px solid #333', paddingBottom:12, marginBottom:0 }}>
                Contrato de Prestação de Serviços Fotográficos
              </h2>
            </div>
            <pre style={{ whiteSpace:'pre-wrap', fontFamily:'Georgia,serif', fontSize:13.5, color:'#1a1a1a', lineHeight:1.8, margin:0 }}>
              {texto}
            </pre>
          </div>

          {/* Editor de cláusulas */}
          {editando && (
            <div style={{ background:'#0f0f14', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:20, height:'fit-content' }}>
              <div style={{ color:'#fff', fontWeight:700, fontSize:14, marginBottom:16 }}>✏️ Personalizar cláusulas</div>
              {[
                ['Dias para entrega das fotos', 'entrega', 'number', '30'],
                ['Rodadas de revisão incluídas', 'revisoes', 'number', '2'],
                ['Dias de antecedência p/ cancelamento', 'cancelamento', 'number', '30'],
                ['Multa por cancelamento tardio (%)', 'multa', 'number', '50'],
              ].map(([label, key, type, ph]) => (
                <div key={key} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', color:'#666', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>{label}</label>
                  <input type={type} value={clausulas[key]} placeholder={ph}
                    onChange={e => setClausulas(c => ({...c, [key]: e.target.value}))}
                    style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:8, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit' }}/>
                </div>
              ))}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', color:'#666', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Direitos autorais</label>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[[true,'Fotógrafo mantém os direitos'],[false,'Cliente tem uso exclusivo']].map(([val, label]) => (
                    <label key={label} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color: clausulas.direitos===val ? '#fff' : '#666' }}>
                      <input type="radio" checked={clausulas.direitos===val} onChange={() => setClausulas(c=>({...c,direitos:val}))}/>
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display:'block', color:'#666', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>Cláusula extra (opcional)</label>
                <textarea value={clausulas.extra} onChange={e => setClausulas(c=>({...c,extra:e.target.value}))} rows={4}
                  placeholder="Digite aqui uma cláusula personalizada..."
                  style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:8, padding:'9px 12px', color:'#fff', fontSize:12, outline:'none', fontFamily:'inherit', resize:'vertical', lineHeight:1.6 }}/>
              </div>
              <div style={{ marginTop:14, padding:'10px 12px', background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.15)', borderRadius:9, fontSize:11, color:'#22C55E', display:'flex', alignItems:'flex-start', gap:7 }}>
                <CheckCircle size={13} style={{ flexShrink:0, marginTop:1 }}/>
                O contrato atualiza automaticamente conforme você edita
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign:'center', color:'#444', fontSize:12, marginTop:16, paddingBottom:20 }}>
          💡 Dica: Clique em "Baixar PDF", abra o arquivo no navegador e use <strong>Ctrl+P → Salvar como PDF</strong> para gerar o PDF final
        </div>
      </div>
    </div>
  );
}
