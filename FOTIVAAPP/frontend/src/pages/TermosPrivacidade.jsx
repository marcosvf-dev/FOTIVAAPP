import React, { useState } from 'react';

const DATA_ATUALIZACAO = '01 de maio de 2026';
const WHATSAPP = '5537988006994';

const sections = {
  termos: [
    { titulo: '1. Aceitação dos Termos', texto: `Ao criar uma conta e utilizar o Fotiva, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço. O uso continuado após alterações indica aceitação das mudanças.` },
    { titulo: '2. Descrição do Serviço', texto: `O Fotiva é uma plataforma SaaS destinada a fotógrafos profissionais, oferecendo gestão de clientes, eventos, controle financeiro, galerias de fotos e assistente inteligente.\n\nPlanos disponíveis:\n• Starter — R$19,90/mês (7 dias grátis)\n• Normal — R$39,90/mês\n• PRO — R$69,90/mês` },
    { titulo: '3. Responsabilidades do Usuário', texto: `Você é responsável por:\n• Fornecer informações verdadeiras no cadastro\n• Manter a segurança das suas credenciais\n• Não compartilhar sua conta com terceiros\n• Utilizar o serviço apenas para fins legais\n• Garantir que os dados dos seus clientes foram coletados com consentimento` },
    { titulo: '4. Pagamentos e Cancelamento', texto: `Os planos são cobrados mensalmente via Stripe. O cancelamento pode ser feito a qualquer momento em Configurações → Gerenciar Assinatura. O acesso permanece até o fim do período pago. Não há reembolso de períodos parciais, exceto conforme o Código de Defesa do Consumidor.` },
    { titulo: '5. Propriedade Intelectual', texto: `O código, design e marca Fotiva são de propriedade do Fotiva. Os dados inseridos pelo usuário (clientes, eventos, fotos) permanecem de propriedade do próprio usuário.` },
    { titulo: '6. Limitação de Responsabilidade', texto: `O Fotiva não se responsabiliza por:\n• Perda de dados causada por falha do usuário\n• Danos indiretos ou lucros cessantes\n• Indisponibilidade temporária por manutenção\n• Uso inadequado da plataforma` },
    { titulo: '7. Modificações', texto: `Podemos atualizar estes termos periodicamente. Alterações relevantes serão comunicadas por email com 15 dias de antecedência.` },
    { titulo: '8. Lei Aplicável', texto: `Estes termos são regidos pelas leis brasileiras. Disputas serão resolvidas no foro de Divinópolis - MG.` },
  ],
  privacidade: [
    { titulo: '1. Controlador dos Dados', texto: `O Fotiva é o controlador dos dados pessoais nos termos da LGPD (Lei 13.709/2018). Dúvidas: privacidade@fotiva.app` },
    { titulo: '2. Dados que coletamos', texto: `Dados fornecidos por você:\n• Nome, e-mail, telefone e estúdio\n• CPF ou CNPJ (opcional)\n• Dados dos seus clientes e eventos\n• Fotos enviadas para galerias\n\nDados automáticos:\n• Endereço IP\n• Tipo de dispositivo e navegador\n• Páginas acessadas e horários\n• Cookies de sessão` },
    { titulo: '3. Como usamos seus dados', texto: `• Criar e gerenciar sua conta (execução de contrato)\n• Processar pagamentos (execução de contrato)\n• Enviar notificações de eventos e parcelas (legítimo interesse)\n• Melhorar a plataforma (legítimo interesse)\n• Cumprir obrigações legais\n\nNão usamos seus dados para publicidade de terceiros.` },
    { titulo: '4. Compartilhamento', texto: `Compartilhamos dados apenas com:\n• Stripe — pagamentos (certificação PCI-DSS)\n• MongoDB Atlas — banco de dados seguro\n• Render — hospedagem\n• Google Gemini — assistente IA (sem dados de identificação)\n\nNão vendemos nem compartilhamos com terceiros para fins comerciais.` },
    { titulo: '5. Seus direitos (LGPD Art. 18)', texto: `Você tem direito a:\n• Acessar e exportar seus dados (Configurações → Privacidade)\n• Corrigir dados incorretos\n• Solicitar exclusão da conta\n• Revogar o consentimento\n• Portabilidade dos dados\n\nPrazo de resposta: até 15 dias úteis.` },
    { titulo: '6. Retenção de dados', texto: `• Logs de acesso: excluídos automaticamente após 90 dias\n• Conta excluída: dados removidos em até 30 dias após solicitação\n• Dados financeiros: mantidos por até 5 anos (obrigação fiscal)` },
    { titulo: '7. Segurança', texto: `• Senhas com hash bcrypt\n• Comunicação via HTTPS/TLS\n• Tokens JWT com expiração\n• Acesso ao banco restrito por IP\n• Logs de acesso monitorados` },
    { titulo: '8. Contato', texto: `Email: privacidade@fotiva.app\nWhatsApp: +55 37 98800-6994\nPrazo de resposta: até 15 dias úteis.` },
  ]
};

export default function TermosPrivacidade() {
  const [aba, setAba] = useState('termos');
  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'#fff', fontFamily:'Inter,sans-serif' }}>
      <div style={{ background:'#111', borderBottom:'1px solid #222', padding:'20px 24px', display:'flex', alignItems:'center', gap:16 }}>
        <button onClick={() => window.history.back()} style={{ background:'none', border:'1px solid #333', color:'#aaa', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:14 }}>← Voltar</button>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:700 }}>📋 Documentos Legais</h1>
          <p style={{ margin:0, fontSize:12, color:'#666' }}>Atualizado em {DATA_ATUALIZACAO}</p>
        </div>
      </div>
      <div style={{ display:'flex', borderBottom:'1px solid #222', background:'#111', padding:'0 24px' }}>
        {[{ key:'termos', label:'📄 Termos de Uso' },{ key:'privacidade', label:'🔒 Política de Privacidade' }].map(({ key, label }) => (
          <button key={key} onClick={() => setAba(key)} style={{ background:'none', border:'none', borderBottom: aba===key ? '2px solid #E87722' : '2px solid transparent', color: aba===key ? '#E87722' : '#888', padding:'16px 20px', cursor:'pointer', fontSize:14, fontWeight: aba===key ? 600 : 400 }}>{label}</button>
        ))}
      </div>
      <div style={{ maxWidth:800, margin:'0 auto', padding:'32px 24px' }}>
        {sections[aba].map((section, i) => (
          <div key={i} style={{ marginBottom:24, background:'#111', borderRadius:12, border:'1px solid #222', padding:'24px' }}>
            <h2 style={{ margin:'0 0 12px', fontSize:16, fontWeight:700, color:'#E87722' }}>{section.titulo}</h2>
            <div style={{ fontSize:14, lineHeight:1.8, color:'#ccc', whiteSpace:'pre-line' }}>{section.texto}</div>
          </div>
        ))}
        <div style={{ background:'#1a1a1a', borderRadius:12, border:'1px solid #E87722', padding:24, textAlign:'center' }}>
          <p style={{ margin:'0 0 12px', color:'#aaa', fontSize:14 }}>Dúvidas sobre privacidade?</p>
          <a href={`https://wa.me/${WHATSAPP}?text=Olá, tenho uma dúvida sobre privacidade no Fotiva`} target="_blank" rel="noreferrer"
            style={{ display:'inline-block', background:'#25D366', color:'#fff', padding:'10px 24px', borderRadius:8, textDecoration:'none', fontSize:14, fontWeight:600 }}>
            💬 Falar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
