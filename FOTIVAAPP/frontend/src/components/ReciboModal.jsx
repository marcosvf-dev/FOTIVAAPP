import React from 'react';

function fmtMoney(v) {
  return 'R$' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

export function ReciboModal({ item, user, onClose }) {
  const numero = `REC-${Date.now().toString().slice(-6)}`;
  const hoje   = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const imprimir = () => {
    const conteudo = document.getElementById('recibo-print').innerHTML;
    const janela   = window.open('', '_blank');
    janela.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <title>Recibo ${numero}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: Arial, sans-serif; background: #fff; color: #333; padding: 40px; }
        </style>
      </head>
      <body>${conteudo}</body>
      </html>
    `);
    janela.document.close();
    janela.focus();
    setTimeout(() => { janela.print(); janela.close(); }, 500);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:28, width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ color:'#fff', fontSize:18, fontWeight:800, margin:0 }}>🧾 Recibo de Pagamento</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>

        <div id="recibo-print" style={{ background:'#fff', borderRadius:12, padding:32, color:'#333' }}>
          <div style={{ textAlign:'center', borderBottom:'2px solid #E87722', paddingBottom:20, marginBottom:24 }}>
            <div style={{ fontSize:28, fontWeight:900, color:'#E87722' }}>FOTIVA</div>
            {user?.studioName && <div style={{ fontSize:14, color:'#666', marginTop:4 }}>{user.studioName}</div>}
            <div style={{ fontSize:12, color:'#888', marginTop:4 }}>RECIBO DE PAGAMENTO</div>
          </div>

          <div style={{ textAlign:'center', marginBottom:20 }}>
            <div style={{ background:'#f5f5f5', border:'1px solid #ddd', borderRadius:8, padding:'12px 20px', display:'inline-block' }}>
              <div style={{ fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Número do Recibo</div>
              <div style={{ fontSize:18, fontWeight:700, color:'#333' }}>{numero}</div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
            <div style={{ background:'#f9f9f9', borderRadius:8, padding:16 }}>
              <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:10, fontWeight:700 }}>Fotógrafo</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#333', marginBottom:4 }}>{user?.name || 'Fotógrafo'}</div>
              {user?.studioName && <div style={{ fontSize:13, color:'#666' }}>{user.studioName}</div>}
              {user?.phone      && <div style={{ fontSize:13, color:'#666' }}>{user.phone}</div>}
              {user?.email      && <div style={{ fontSize:13, color:'#666' }}>{user.email}</div>}
              {user?.document   && <div style={{ fontSize:13, color:'#666' }}>CPF/CNPJ: {user.document}</div>}
            </div>
            <div style={{ background:'#f9f9f9', borderRadius:8, padding:16 }}>
              <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:10, fontWeight:700 }}>Cliente</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#333', marginBottom:4 }}>{item.clientName}</div>
              <div style={{ fontSize:13, color:'#666' }}>Evento: {item.eventType}</div>
            </div>
          </div>

          <div style={{ background:'#E87722', color:'#fff', borderRadius:12, padding:'24px', textAlign:'center', margin:'20px 0' }}>
            <div style={{ fontSize:13, opacity:0.85, marginBottom:6 }}>Valor Recebido</div>
            <div style={{ fontSize:36, fontWeight:900 }}>{fmtMoney(item.value)}</div>
            <div style={{ fontSize:13, opacity:0.85, marginTop:6 }}>
              Parcela {item.number} de {item.total} · Vencimento: {fmtDate(item.dueDate)}
            </div>
          </div>

          <div style={{ background:'#f9f9f9', borderRadius:8, padding:16, marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ color:'#666', fontSize:13 }}>Data do pagamento:</span>
              <span style={{ color:'#333', fontSize:13, fontWeight:700 }}>{hoje}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'#666', fontSize:13 }}>Referente a:</span>
              <span style={{ color:'#333', fontSize:13, fontWeight:700 }}>{item.eventType} — Parcela {item.number}/{item.total}</span>
            </div>
          </div>

          <div style={{ marginTop:48, display:'flex', justifyContent:'space-between' }}>
            <div style={{ textAlign:'center', width:'45%' }}>
              <div style={{ borderTop:'1px solid #333', paddingTop:8, fontSize:13, color:'#333' }}>
                {user?.name || 'Fotógrafo'}<br/>
                <span style={{ fontSize:11, color:'#888' }}>Assinatura do Fotógrafo</span>
              </div>
            </div>
            <div style={{ textAlign:'center', width:'45%' }}>
              <div style={{ borderTop:'1px solid #333', paddingTop:8, fontSize:13, color:'#333' }}>
                {item.clientName}<br/>
                <span style={{ fontSize:11, color:'#888' }}>Assinatura do Cliente</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop:'1px solid #eee', paddingTop:16, marginTop:24, textAlign:'center', color:'#888', fontSize:11 }}>
            Recibo gerado pelo Fotiva — {hoje} · {numero}
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'12px', borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#888', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Fechar
          </button>
          <button onClick={imprimir}
            style={{ flex:2, padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
