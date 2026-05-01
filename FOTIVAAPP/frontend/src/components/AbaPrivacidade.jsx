import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export function AbaPrivacidade({ token }) {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState('');

  useEffect(() => {
    api.get('/api/lgpd/status')
      .then(r => setStatus(r.data))
      .catch(() => {});
  }, []);

  const exportarDados = async () => {
    setLoading(true);
    try {
      const res  = await api.get('/api/lgpd/meus-dados', { responseType: 'blob' });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'meus-dados-fotiva.json';
      a.click();
      setMsg('✅ Dados exportados com sucesso!');
    } catch {
      setMsg('❌ Erro ao exportar dados.');
    }
    setLoading(false);
  };

  const solicitarExclusao = async () => {
    if (!window.confirm('Tem certeza? Sua conta e TODOS os dados serão excluídos em 30 dias. Pode cancelar antes do prazo.')) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/lgpd/solicitar-exclusao', { motivo: 'Solicitado pelo usuário' });
      setMsg(data.info || data.message);
      setStatus(s => ({ ...s, exclusaoPendente: true }));
    } catch {
      setMsg('❌ Erro ao solicitar exclusão.');
    }
    setLoading(false);
  };

  const cancelarExclusao = async () => {
    setLoading(true);
    try {
      await api.post('/api/lgpd/cancelar-exclusao');
      setMsg('✅ Solicitação cancelada.');
      setStatus(s => ({ ...s, exclusaoPendente: false }));
    } catch {
      setMsg('❌ Erro ao cancelar.');
    }
    setLoading(false);
  };

  const card = { background:'#1a1a1a', borderRadius:12, border:'1px solid #2a2a2a', padding:'20px', marginBottom:16 };
  const btn  = (color) => ({ background:color, color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', cursor: loading ? 'not-allowed' : 'pointer', fontSize:14, fontWeight:600, opacity: loading ? 0.6 : 1, fontFamily:'inherit' });

  return (
    <div>
      <h3 style={{ color:'#E87722', marginBottom:20, fontSize:16 }}>🔒 Seus Direitos e Privacidade (LGPD)</h3>

      {msg && <div style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:8, padding:12, marginBottom:16, color:'#ccc', fontSize:14 }}>{msg}</div>}

      <div style={card}>
        <h4 style={{ color:'#fff', margin:'0 0 12px', fontSize:14 }}>📊 Dados que coletamos sobre você</h4>
        <ul style={{ color:'#aaa', fontSize:13, lineHeight:2, paddingLeft:20, margin:0 }}>
          <li>Nome, e-mail, telefone e dados do estúdio</li>
          <li>CPF/CNPJ (se fornecido)</li>
          <li>Clientes e eventos cadastrados</li>
          <li>Logs de acesso (IP, horário, páginas)</li>
          <li>Dados de pagamento (via Stripe)</li>
        </ul>
      </div>

      <div style={card}>
        <h4 style={{ color:'#fff', margin:'0 0 8px', fontSize:14 }}>📥 Exportar meus dados</h4>
        <p style={{ color:'#aaa', fontSize:13, margin:'0 0 14px' }}>Baixe todos os seus dados armazenados no Fotiva em formato JSON.</p>
        <button style={btn('#2563eb')} onClick={exportarDados} disabled={loading}>
          {loading ? 'Exportando...' : '⬇️ Baixar meus dados'}
        </button>
      </div>

      <div style={card}>
        <h4 style={{ color:'#fff', margin:'0 0 8px', fontSize:14 }}>📄 Documentos legais</h4>
        <p style={{ color:'#aaa', fontSize:13, margin:'0 0 14px' }}>
          {status?.termoAceitoEm ? `Termos aceitos em: ${new Date(status.termoAceitoEm).toLocaleDateString('pt-BR')}` : 'Consulte nossos termos e política de privacidade.'}
        </p>
        <a href="/termos" style={{ ...btn('#333'), display:'inline-block', textDecoration:'none', marginRight:10 }}>📄 Termos de Uso</a>
        <a href="/termos" style={{ ...btn('#333'), display:'inline-block', textDecoration:'none' }}>🔒 Política de Privacidade</a>
      </div>

      <div style={{ ...card, border:'1px solid #7f1d1d' }}>
        <h4 style={{ color:'#f87171', margin:'0 0 8px', fontSize:14 }}>🗑️ Excluir minha conta</h4>
        {status?.exclusaoPendente ? (
          <>
            <p style={{ color:'#fca5a5', fontSize:13, margin:'0 0 14px' }}>
              ⚠️ Exclusão agendada para {status.exclusaoAgendadaPara ? new Date(status.exclusaoAgendadaPara).toLocaleDateString('pt-BR') : '30 dias'}. Todos os dados serão removidos permanentemente.
            </p>
            <button style={btn('#16a34a')} onClick={cancelarExclusao} disabled={loading}>✋ Cancelar exclusão</button>
          </>
        ) : (
          <>
            <p style={{ color:'#aaa', fontSize:13, margin:'0 0 14px' }}>Remove permanentemente todos os seus dados em 30 dias. Pode cancelar antes do prazo.</p>
            <button style={btn('#dc2626')} onClick={solicitarExclusao} disabled={loading}>🗑️ Solicitar exclusão da conta</button>
          </>
        )}
      </div>
    </div>
  );
}
