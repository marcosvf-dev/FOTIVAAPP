import React, { useState } from 'react';

const DATA_ATUALIZACAO = '13 de maio de 2026';
const VERSAO_TERMOS = '2.0';
const WHATSAPP = '5537988006994';

const sections = {
  termos: [
    {
      titulo: '1. Aceitação dos Termos',
      texto: `Ao criar uma conta e utilizar o Fotiva, você declara ter lido, compreendido e concordado com estes Termos de Uso (versão ${VERSAO_TERMOS}). Se não concordar com qualquer disposição, não utilize o serviço.\n\nO uso continuado da plataforma após a publicação de alterações constitui aceitação das novas condições. Alterações relevantes serão comunicadas por email com 15 dias de antecedência.`
    },
    {
      titulo: '2. Descrição do Serviço',
      texto: `O Fotiva é uma plataforma SaaS destinada exclusivamente a fotógrafos profissionais brasileiros, oferecendo:\n\n• Gestão de clientes, eventos e agenda\n• Controle financeiro e parcelas\n• Galeria de fotos com entrega digital\n• Assistente inteligente com IA\n• Contratos digitais\n• Notificações automáticas\n\nPlanos disponíveis:\n• Starter — R$19,90/mês (7 dias grátis, até 20 clientes)\n• Normal — R$39,90/mês (ilimitado + IA + GPS)\n• PRO — R$69,90/mês (tudo + Galeria + Reconhecimento facial)`
    },
    {
      titulo: '3. Cadastro e Responsabilidades do Usuário',
      texto: `Ao se cadastrar, você se compromete a:\n\n• Fornecer informações verdadeiras, completas e atualizadas\n• Manter a segurança das suas credenciais de acesso\n• Não compartilhar sua conta com terceiros\n• Utilizar o serviço apenas para fins legais e lícitos\n• Garantir que os dados dos seus clientes foram coletados com consentimento conforme a LGPD\n• Não utilizar a plataforma para praticar atos ilícitos, fraude ou violação de direitos de terceiros\n\nO Fotiva não se responsabiliza por danos decorrentes do uso indevido das credenciais pelo próprio usuário.`
    },
    {
      titulo: '4. Direito de Arrependimento (CDC Art. 49)',
      texto: `Conforme o Código de Defesa do Consumidor (Lei 8.078/90, Art. 49), você tem direito de desistir da contratação de qualquer plano pago em até 7 (sete) dias corridos a partir da data da contratação, sem qualquer ônus.\n\nPara exercer esse direito, entre em contato pelo WhatsApp ou email informado nestes termos dentro do prazo. O valor pago será estornado integralmente.\n\nApós o prazo de 7 dias, o cancelamento é permitido a qualquer momento, mas sem direito a reembolso proporcional do período em curso.`
    },
    {
      titulo: '5. Pagamentos, Planos e Cancelamento',
      texto: `Os planos são cobrados mensalmente de forma recorrente via Stripe (cartão de crédito/débito).\n\nO cancelamento pode ser feito a qualquer momento em Configurações → Gerenciar Assinatura. Após o cancelamento:\n• O acesso permanece ativo até o fim do período já pago\n• Não há cobrança na renovação seguinte\n• Dados ficam disponíveis por 30 dias após o fim do acesso\n\nO Fotiva reserva-se o direito de ajustar preços com aviso prévio de 30 dias por email.`
    },
    {
      titulo: '6. Disponibilidade e SLA',
      texto: `O Fotiva se compromete a manter a plataforma disponível com uptime mínimo de 99% ao mês (equivalente a no máximo ~7h de indisponibilidade mensal).\n\nManutenções programadas serão comunicadas com antecedência mínima de 24 horas.\n\nIndisponibilidades causadas por fatores externos (falhas de infraestrutura de terceiros, ataques, força maior) não são contabilizadas no SLA.\n\nEm caso de indisponibilidade superior ao SLA, o usuário poderá solicitar crédito proporcional em sua próxima cobrança.`
    },
    {
      titulo: '7. Fotos e Conteúdo das Galerias',
      texto: `As fotos enviadas para as galerias são de propriedade exclusiva do fotógrafo e/ou de seus clientes.\n\nO Fotiva:\n• NÃO acessa, analisa ou utiliza o conteúdo das fotos para qualquer finalidade além da entrega ao cliente\n• NÃO compartilha fotos com terceiros\n• Armazena as fotos com criptografia em trânsito\n• Exclui permanentemente todas as fotos ao encerramento da galeria pelo fotógrafo\n\nO fotógrafo é responsável por ter os direitos e autorizações necessárias para publicar as fotos na plataforma.`
    },
    {
      titulo: '8. Propriedade Intelectual',
      texto: `O código-fonte, design, marca e logotipo do Fotiva são propriedade intelectual do Fotiva, protegidos pela Lei 9.610/98.\n\nOs dados inseridos pelo usuário (clientes, eventos, fotos, contratos) permanecem de propriedade do próprio usuário. O Fotiva não reivindica propriedade sobre o conteúdo gerado pelo usuário.`
    },
    {
      titulo: '9. Limitação de Responsabilidade',
      texto: `O Fotiva não se responsabiliza por:\n• Perda de dados causada por falha ou negligência do usuário\n• Danos indiretos, lucros cessantes ou perda de oportunidade de negócio\n• Atos praticados pelo usuário utilizando a plataforma\n• Indisponibilidade temporária dentro do SLA estabelecido\n• Conteúdo de fotos enviadas pelos usuários\n\nA responsabilidade total do Fotiva limita-se ao valor pago pelo usuário nos últimos 3 meses.`
    },
    {
      titulo: '10. Rescisão',
      texto: `O Fotiva pode suspender ou encerrar sua conta em caso de:\n• Violação destes termos\n• Inadimplência superior a 30 dias\n• Uso fraudulento ou atividades ilegais\n• Atividades que comprometam a segurança da plataforma\n\nEm caso de rescisão sem justa causa pelo Fotiva, o valor proporcional será devolvido.`
    },
    {
      titulo: '11. Disposições Gerais',
      texto: `Estes termos são regidos pelas leis brasileiras. Disputas serão resolvidas no foro de Divinópolis - MG, salvo disposição legal em contrário.\n\nSe qualquer disposição for considerada inválida, as demais permanecem em pleno vigor.\n\nA tolerância com o descumprimento não implica renúncia ao direito de exigi-lo posteriormente.`
    },
  ],
  privacidade: [
    {
      titulo: '1. Controlador dos Dados',
      texto: `O Fotiva é o controlador dos dados pessoais coletados nesta plataforma, nos termos da LGPD (Lei 13.709/2018).\n\nEncarregado de Dados (DPO):\nEmail: marcosvf557@gmail.com\nWhatsApp: +55 37 98800-6994\nPrazo de resposta: até 15 dias úteis`
    },
    {
      titulo: '2. Dados que coletamos',
      texto: `Dados fornecidos por você:\n• Nome, e-mail, telefone e nome do estúdio\n• CPF ou CNPJ (opcional)\n• Senha (armazenada em hash bcrypt — nunca em texto puro)\n• Foto de perfil e logo do estúdio (opcional)\n• Dados dos seus clientes (nome, email, telefone, CPF, endereço)\n• Dados de eventos e pagamentos\n• Fotos enviadas para galerias\n\nDados coletados automaticamente:\n• Endereço IP\n• Tipo de dispositivo, sistema operacional e navegador\n• Páginas acessadas, horários e duração (logs de acesso)\n• Cookies de sessão (apenas essenciais)\n\nDados de pagamento:\n• Processados exclusivamente pelo Stripe (PCI-DSS Level 1)\n• O Fotiva NÃO armazena dados de cartão`
    },
    {
      titulo: '3. Como usamos seus dados',
      texto: `• Criar e gerenciar sua conta — base legal: execução de contrato (Art. 7°, V)\n• Processar pagamentos — base legal: execução de contrato (Art. 7°, V)\n• Enviar notificações de eventos e parcelas — base legal: legítimo interesse (Art. 7°, IX)\n• Enviar comunicações sobre o serviço — base legal: legítimo interesse (Art. 7°, IX)\n• Melhorar a plataforma — base legal: legítimo interesse (Art. 7°, IX)\n• Cumprir obrigações legais — base legal: obrigação legal (Art. 7°, II)\n\nNÃO utilizamos seus dados para publicidade de terceiros.\nNÃO realizamos decisões automatizadas que produzam efeitos jurídicos.`
    },
    {
      titulo: '4. Compartilhamento de dados',
      texto: `Compartilhamos dados apenas com parceiros necessários para a operação:\n\n• Stripe — pagamentos (PCI-DSS Level 1)\n• MongoDB Atlas — banco de dados (AWS São Paulo)\n• Render — hospedagem (AWS Oregon)\n• Backblaze B2 — armazenamento de fotos\n• Google Gemini — assistente IA (apenas conteúdo das mensagens, sem identificação)\n\nNÃO vendemos nem compartilhamos dados com terceiros para fins comerciais.\nPoderemos compartilhar mediante ordem judicial ou autoridade competente.`
    },
    {
      titulo: '5. Seus direitos (LGPD Art. 18)',
      texto: `Você tem os seguintes direitos:\n\n• Confirmação — confirmar se tratamos seus dados\n• Acesso — exportar todos seus dados (Configurações → Privacidade)\n• Correção — corrigir dados incompletos ou incorretos\n• Portabilidade — receber seus dados em formato estruturado\n• Exclusão — solicitar exclusão da conta e dados\n• Revogação do consentimento — a qualquer momento\n• Informação — sobre compartilhamento de dados\n\nPrazo de resposta: até 15 dias úteis.`
    },
    {
      titulo: '6. Retenção e exclusão de dados',
      texto: `• Logs de acesso: excluídos automaticamente após 90 dias\n• Dados da conta: mantidos enquanto ativa\n• Após solicitação de exclusão: removidos em até 30 dias\n• Fotos de galerias: excluídas ao encerramento da galeria\n• Dados financeiros: mantidos por até 5 anos (obrigação fiscal)`
    },
    {
      titulo: '7. Segurança',
      texto: `• Senhas com hash bcrypt (fator 12)\n• Comunicação criptografada via HTTPS/TLS\n• Tokens JWT com expiração de 30 dias\n• Rate limiting contra ataques de força bruta\n• Cabeçalhos de segurança HTTP (Helmet)\n• Acesso ao banco restrito por IP e credenciais\n• Validação e sanitização de todas as entradas\n• Logs de acesso com expiração automática\n\nEm caso de incidente de segurança, notificaremos em até 72 horas conforme a LGPD.`
    },
    {
      titulo: '8. Cookies',
      texto: `Utilizamos apenas cookies estritamente necessários para autenticação e sessão. Não utilizamos cookies de rastreamento ou publicidade.\n\nDesabilitar cookies impedirá o funcionamento correto da plataforma.`
    },
    {
      titulo: '9. Menores de idade',
      texto: `O Fotiva é destinado exclusivamente a profissionais maiores de 18 anos. Não coletamos intencionalmente dados de menores.\n\nSe identificarmos que um usuário é menor de idade, a conta será encerrada e os dados removidos.`
    },
    {
      titulo: '10. Transferência internacional de dados',
      texto: `Alguns parceiros de infraestrutura processam dados fora do Brasil (principalmente EUA). Essas transferências são realizadas com garantias adequadas de proteção, incluindo certificações de conformidade dos parceiros.`
    },
    {
      titulo: '11. Versão e alterações',
      texto: `Esta é a versão ${VERSAO_TERMOS} da Política de Privacidade, vigente a partir de ${DATA_ATUALIZACAO}.\n\nAlterações relevantes serão comunicadas por email com 15 dias de antecedência. O uso continuado após a vigência constitui aceite.`
    },
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
          <p style={{ margin:0, fontSize:12, color:'#666' }}>Versão {VERSAO_TERMOS} — Atualizado em {DATA_ATUALIZACAO}</p>
        </div>
      </div>
      <div style={{ display:'flex', borderBottom:'1px solid #222', background:'#111', padding:'0 24px' }}>
        {[{ key:'termos', label:'📄 Termos de Uso' },{ key:'privacidade', label:'🔒 Política de Privacidade' }].map(({ key, label }) => (
          <button key={key} onClick={() => setAba(key)} style={{ background:'none', border:'none', borderBottom: aba===key ? '2px solid #E87722' : '2px solid transparent', color: aba===key ? '#E87722' : '#888', padding:'16px 20px', cursor:'pointer', fontSize:14, fontWeight: aba===key ? 600 : 400 }}>{label}</button>
        ))}
      </div>
      <div style={{ maxWidth:800, margin:'0 auto', padding:'32px 24px' }}>
        <div style={{ background:'rgba(232,119,34,.08)', border:'1px solid rgba(232,119,34,.2)', borderRadius:8, padding:'8px 14px', marginBottom:24, fontSize:12, color:'#E87722' }}>
          ✅ Versão {VERSAO_TERMOS} — Inclui direito de arrependimento (CDC), SLA de disponibilidade e política de fotos
        </div>
        {sections[aba].map((section, i) => (
          <div key={i} style={{ marginBottom:24, background:'#111', borderRadius:12, border:'1px solid #222', padding:'24px' }}>
            <h2 style={{ margin:'0 0 12px', fontSize:16, fontWeight:700, color:'#E87722' }}>{section.titulo}</h2>
            <div style={{ fontSize:14, lineHeight:1.8, color:'#ccc', whiteSpace:'pre-line' }}>{section.texto}</div>
          </div>
        ))}
        <div style={{ background:'#1a1a1a', borderRadius:12, border:'1px solid #E87722', padding:24, textAlign:'center' }}>
          <p style={{ margin:'0 0 12px', color:'#aaa', fontSize:14 }}>Dúvidas sobre privacidade ou seus direitos?</p>
          <a href={`https://wa.me/${WHATSAPP}?text=Olá, tenho uma dúvida sobre privacidade no Fotiva`} target="_blank" rel="noreferrer"
            style={{ display:'inline-block', background:'#25D366', color:'#fff', padding:'10px 24px', borderRadius:8, textDecoration:'none', fontSize:14, fontWeight:600 }}>
            💬 Falar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
