import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Check, Image, Lock, Send, Loader, Camera, X, Download, ShoppingCart, Info, AlertCircle, MessageCircle } from 'lucide-react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const OR = '#E87722';
const dark = (extra={}) => ({ background:'#0d0d14', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, ...extra });
const btn  = (extra={}) => ({ display:'inline-flex', alignItems:'center', gap:7, padding:'11px 22px', borderRadius:11, border:'none', fontFamily:'inherit', fontSize:14, fontWeight:700, cursor:'pointer', transition:'all .2s', ...extra });
const inp  = (extra={}) => ({ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'12px 16px', color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit', ...extra });

export default function GaleriaCliente() {
  const { id } = useParams();
  const [step,        setStep]        = useState('login');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [loginErr,    setLoginErr]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [gallery,     setGallery]     = useState(null);
  const [photos,      setPhotos]      = useState([]);
  const [selected,    setSelected]    = useState(new Set());
  const [sending,     setSending]     = useState(false);
  const [lightbox,    setLightbox]    = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [payModal,    setPayModal]    = useState(false);
  const [finishData,  setFinishData]  = useState(null);
  const [downloadCount, setDownloadCount] = useState(0);

  async function doLogin() {
    setLoginErr(''); setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND}/api/gallery/client/login`,
        { galleryId: id, email, password },
        { timeout: 20000 }
      );
      setGallery(data.gallery);
      setPhotos(data.photos);
      setDownloadCount(data.gallery.downloadCount || 0);
      const pre = new Set(data.photos.filter(p => p.selected).map(p => p.id));
      setSelected(pre);
      setStep('gallery');
    } catch (e) {
      setLoginErr(e.response?.data?.error || 'Email ou senha incorretos');
    }
    setLoading(false);
  }

  async function toggleSelect(photoId) {
    const isSelected = selected.has(photoId);
    const newSet = new Set(selected);
    if (isSelected) newSet.delete(photoId); else newSet.add(photoId);
    setSelected(newSet);
    try {
      await axios.post(`${BACKEND}/api/gallery/client/${id}/select`,
        { email, password, photoId, selected: !isSelected },
        { timeout: 10000 }
      );
    } catch(e) {}
  }

  async function finishSelection() {
    if (!selected.size) return alert('Selecione pelo menos 1 foto antes de finalizar.');
    if (!window.confirm(`Finalizar seleção com ${selected.size} foto(s)?`)) return;
    setSending(true);
    try {
      const { data } = await axios.post(
        `${BACKEND}/api/gallery/client/${id}/finish`,
        { email, password },
        { timeout: 15000 }
      );
      setFinishData(data);
      setStep('done');
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao finalizar. Tente novamente.');
    }
    setSending(false);
  }

  function openWhatsApp() {
    if (!finishData) return;
    const phone = finishData.photographerPhone;
    if (!phone) { alert('Número do fotógrafo não disponível. Entre em contato diretamente.'); return; }
    const lista = finishData.selectedFilenames.map((f, i) => `${i+1}. ${f}`).join('\n');
    const msg = `Olá${finishData.photographerName ? ', ' + finishData.photographerName : ''}! 👋\n\nSou *${finishData.clientName}* e acabei de finalizar minha seleção da galeria *${finishData.galleryTitle}*.\n\nSelecionei *${finishData.selectedCount} foto(s)*:\n${lista}\n\nAguardo o retorno! 😊`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async function downloadPhoto(photo) {
    if (downloadBloqueado) { setPayModal(true); return; }
    setDownloading(photo.id);
    try {
      const { data } = await axios.post(
        `${BACKEND}/api/gallery/client/${id}/download/${photo.id}`,
        { email, password },
        { timeout: 15000 }
      );
      if (data.downloadCount !== undefined) setDownloadCount(data.downloadCount);
      const a = document.createElement('a');
      a.href = data.url; a.download = data.filename || photo.filename;
      a.click();
    } catch (e) {
      const err = e.response?.data;
      if (err?.limitReached) {
        setPayModal(true);
      } else {
        alert(err?.error || 'Erro ao baixar foto');
      }
    }
    setDownloading(null);
  }

  const downloadLimit      = gallery?.downloadLimit ?? null;
  const extraPhotoPrice    = gallery?.extraPhotoPrice || 0;
  const selectedArr        = Array.from(selected);
  const extraPhotos        = downloadLimit !== null ? Math.max(0, selectedArr.length - downloadLimit) : 0;
  const extraTotal         = extraPhotos * extraPhotoPrice;
  const downloadsRestantes = downloadLimit !== null ? Math.max(0, downloadLimit - downloadCount) : null;
  const downloadBloqueado  = downloadLimit !== null && downloadCount >= downloadLimit;
  const watermarkEnabled   = gallery?.watermarkEnabled || false;
  const WATERMARK_URL      = '/logo-watermark.png';

  // ── LOGIN ──
  if (step === 'login') return (
    <div style={{ minHeight:'100vh', background:'#080810', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${OR},#C85A00)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Image size={32} color="#fff"/>
          </div>
          <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, marginBottom:8 }}>Acessar Galeria</h1>
          <p style={{ color:'#666', fontSize:14, lineHeight:1.6 }}>Use o email e senha que o fotógrafo enviou para você</p>
        </div>
        <div style={dark({ padding:28 })}>
          <div style={{ marginBottom:16 }}>
            <label style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:8 }}>Seu Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && doLogin()}
              type="email" placeholder="seu@email.com" style={inp()}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:8 }}>Senha da Galeria</label>
            <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && doLogin()}
              type="password" placeholder="••••••••" style={inp()}/>
          </div>
          {loginErr && (
            <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:9, padding:'10px 14px', color:'#EF4444', fontSize:13, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              <Lock size={14}/> {loginErr}
            </div>
          )}
          <button onClick={doLogin} disabled={loading || !email || !password}
            style={btn({ width:'100%', justifyContent:'center', background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', opacity: loading||!email||!password ? .6 : 1 })}>
            {loading ? <Loader size={16} style={{ animation:'spin 1s linear infinite' }}/> : <Lock size={16}/>}
            {loading ? 'Verificando...' : 'Acessar galeria'}
          </button>
        </div>
        <div style={{ textAlign:'center', color:'#333', fontSize:12, marginTop:20 }}>
          Powered by <span style={{ color:OR, fontWeight:700 }}>Fotiva</span>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── DONE ──
  if (step === 'done') return (
    <div style={{ minHeight:'100vh', background:'#080810', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center', maxWidth:440 }}>
        <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(34,197,94,.1)', border:'2px solid rgba(34,197,94,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <Check size={40} color="#22C55E"/>
        </div>
        <h1 style={{ color:'#fff', fontSize:28, fontWeight:800, marginBottom:12 }}>Seleção finalizada!</h1>
        <p style={{ color:'#666', fontSize:15, lineHeight:1.7, marginBottom:24 }}>
          Você escolheu <strong style={{ color:OR }}>{finishData?.selectedCount || selected.size} foto(s)</strong>.<br/>
          Agora envie a confirmação para o fotógrafo pelo WhatsApp.
        </p>
        {finishData?.photographerPhone ? (
          <button onClick={openWhatsApp}
            style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'14px 28px', borderRadius:12, background:'#25D366', border:'none', color:'#fff', fontSize:16, fontWeight:800, cursor:'pointer', fontFamily:'inherit', marginBottom:16 }}>
            <MessageCircle size={20}/> Enviar seleção pelo WhatsApp
          </button>
        ) : (
          <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'14px 18px', color:'#888', fontSize:13, marginBottom:16 }}>
            Entre em contato diretamente com o fotógrafo para confirmar sua seleção.
          </div>
        )}
        <p style={{ color:'#333', fontSize:12, marginTop:8 }}>Você pode fechar esta página após enviar a mensagem.</p>
        <div style={{ color:'#222', fontSize:12, marginTop:24 }}>Powered by <span style={{ color:OR, fontWeight:700 }}>Fotiva</span></div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── GALERIA ──
  return (
    <div style={{ minHeight:'100vh', background:'#080810', fontFamily:'Inter,sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom:'1px solid rgba(255,255,255,.06)', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'rgba(8,8,16,.95)', backdropFilter:'blur(20px)', zIndex:100 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>{gallery.title}</div>
          <div style={{ fontSize:12, color:'#555', marginTop:1 }}>
            {gallery.totalPhotos} fotos
            {downloadLimit !== null
              ? <span style={{ color: downloadBloqueado ? OR : '#22C55E', marginLeft:6 }}>
                  · {selected.size}/{downloadLimit} selecionadas
                  {downloadBloqueado && ` (+${extraPhotos} excedente${extraPhotos > 1 ? 's' : ''})`}
                </span>
              : <span style={{ color:'#22C55E', marginLeft:6 }}>· {selected.size} selecionadas</span>
            }
          </div>
        </div>
        <button onClick={finishSelection} disabled={!selected.size || sending}
          style={btn({ background: selected.size ? `linear-gradient(135deg,${OR},#C85A00)` : 'rgba(255,255,255,.05)', color: selected.size ? '#fff' : '#444', border: selected.size ? 'none' : '1px solid rgba(255,255,255,.08)', cursor: selected.size ? 'pointer' : 'default' })}>
          {sending ? <Loader size={15} style={{ animation:'spin 1s linear infinite' }}/> : <Send size={15}/>}
          {sending ? 'Finalizando...' : selected.size ? `Finalizar (${selected.size})` : 'Selecione fotos'}
        </button>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'16px 20px' }}>

        {/* Painel de instruções */}
        <div style={dark({ padding:20, marginBottom:16 })}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <Info size={15} color={OR}/>
            <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>Como funciona</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:16 }}>
            <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ color:'#555', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Total na galeria</div>
              <div style={{ color:'#fff', fontSize:22, fontWeight:800 }}>{gallery.totalPhotos}</div>
              <div style={{ color:'#555', fontSize:12, marginTop:2 }}>fotos disponíveis</div>
            </div>
            {downloadLimit !== null ? (
              <div style={{ background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.15)', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ color:'#555', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Seu pacote inclui</div>
                <div style={{ color:'#22C55E', fontSize:22, fontWeight:800 }}>{downloadLimit}</div>
                <div style={{ color:'#555', fontSize:12, marginTop:2 }}>fotos para download</div>
              </div>
            ) : (
              <div style={{ background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.15)', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ color:'#555', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Download</div>
                <div style={{ color:'#22C55E', fontSize:22, fontWeight:800 }}>Ilimitado</div>
                <div style={{ color:'#555', fontSize:12, marginTop:2 }}>baixe todas as fotos</div>
              </div>
            )}
            <div style={{ background: downloadBloqueado ? 'rgba(232,119,34,.08)' : 'rgba(255,255,255,.04)', border: downloadBloqueado ? '1px solid rgba(232,119,34,.2)' : 'none', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ color:'#555', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Selecionadas</div>
              <div style={{ color: downloadBloqueado ? OR : '#fff', fontSize:22, fontWeight:800 }}>{selected.size}</div>
              <div style={{ color:'#555', fontSize:12, marginTop:2 }}>
                {downloadLimit !== null
                  ? downloadBloqueado
                    ? `${extraPhotos} acima do limite`
                    : `${downloadLimit - selected.size} restante${(downloadLimit - selected.size) !== 1 ? 's' : ''}`
                  : 'fotos marcadas'
                }
              </div>
            </div>
            {downloadLimit !== null && extraPhotoPrice > 0 && (
              <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ color:'#555', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Foto extra</div>
                <div style={{ color:'#fff', fontSize:22, fontWeight:800 }}>R${extraPhotoPrice.toFixed(2)}</div>
                <div style={{ color:'#555', fontSize:12, marginTop:2 }}>por foto adicional</div>
              </div>
            )}
          </div>
          <div style={{ paddingTop:14, borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', flexWrap:'wrap', gap:14 }}>
            {[
              { n:'1', t:'Clique nas fotos que deseja receber' },
              { n:'2', t: downloadLimit !== null ? `Selecione até ${downloadLimit} foto${downloadLimit !== 1 ? 's' : ''} do pacote` : 'Selecione quantas quiser' },
              { n:'3', t:'Clique em Finalizar e envie a confirmação pelo WhatsApp' },
            ].map(({ n, t }) => (
              <div key={n} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#777' }}>
                <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(232,119,34,.12)', border:'1px solid rgba(232,119,34,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:OR, flexShrink:0 }}>{n}</div>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Aviso de excedente */}
        {downloadBloqueado && (
          <div style={{ background:'rgba(232,119,34,.08)', border:'1px solid rgba(232,119,34,.3)', borderRadius:12, padding:'14px 16px', marginBottom:16, fontSize:13 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, color:OR, fontWeight:700, marginBottom:8 }}>
              <AlertCircle size={15}/>
              Download bloqueado — você selecionou {extraPhotos} foto{extraPhotos > 1 ? 's' : ''} acima do limite
            </div>
            <div style={{ color:'#aaa', lineHeight:1.8 }}>
              Pacote inclui <strong style={{ color:'#fff' }}>{downloadLimit}</strong> foto{downloadLimit !== 1 ? 's' : ''} · Você selecionou <strong style={{ color:'#fff' }}>{selected.size}</strong>
              {extraPhotoPrice > 0 && <> · Excedente: <strong style={{ color:OR }}>R${extraTotal.toFixed(2)}</strong></>}
            </div>
            <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
              {extraPhotoPrice > 0 && (
                <button onClick={() => setPayModal(true)}
                  style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:10, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  <ShoppingCart size={14}/> Pagar R${extraTotal.toFixed(2)} e liberar
                </button>
              )}
              <span style={{ fontSize:12, color:'#666' }}>ou desmarque {extraPhotos} foto{extraPhotos > 1 ? 's' : ''} para voltar ao limite</span>
            </div>
          </div>
        )}

        {/* Grid de fotos */}
        {!photos.length ? (
          <div style={{ textAlign:'center', padding:'60px 24px', color:'#444' }}>
            <Camera size={40} style={{ marginBottom:12 }}/><div>Nenhuma foto disponível</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:10 }}>
            {photos.map(p => {
              const isSel  = selected.has(p.id);
              const isDown = downloading === p.id;
              return (
                <div key={p.id} onClick={() => toggleSelect(p.id)}
                  style={{ position:'relative', borderRadius:12, overflow:'hidden', cursor:'pointer', border:`2px solid ${isSel ? '#22C55E' : 'rgba(255,255,255,.06)'}`, transition:'all .2s', aspectRatio:'1', background:'#0a0a10' }}>
                  {p.thumbnailUrl
                    ? <img src={p.thumbnailUrl} alt={p.filename} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform .2s' }}
                        onMouseEnter={e => e.target.style.transform='scale(1.05)'}
                        onMouseLeave={e => e.target.style.transform='scale(1)'}/>
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Camera size={24} color="#333"/></div>
                  }
                  {watermarkEnabled && (
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                      <img src={WATERMARK_URL} alt="watermark" style={{ width:'70%', opacity:.45, userSelect:'none', pointerEvents:'none' }}/>
                    </div>
                  )}
                  {isSel && <div style={{ position:'absolute', inset:0, background:'rgba(34,197,94,.15)' }}/>}
                  <div style={{ position:'absolute', top:8, right:8, width:26, height:26, borderRadius:'50%',
                    background: isSel ? '#22C55E' : 'rgba(0,0,0,.6)',
                    border: isSel ? '2px solid #22C55E' : '2px solid rgba(255,255,255,.3)',
                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
                    {isSel && <Check size={13} color="#fff"/>}
                  </div>
                  <div style={{ position:'absolute', bottom:8, right:8, display:'flex', gap:5 }}>
                    <button onClick={e => { e.stopPropagation(); setLightbox(p); }}
                      style={{ background:'rgba(0,0,0,.7)', border:'none', borderRadius:7, padding:'4px 7px', cursor:'pointer', color:'#fff', fontSize:10, display:'flex', alignItems:'center', gap:3, fontFamily:'inherit' }}>
                      Ver
                    </button>
                    {gallery?.downloadEnabled && (
                      <button
                        onClick={e => { e.stopPropagation(); downloadPhoto(p); }}
                        disabled={isDown}
                        title={downloadBloqueado ? 'Download bloqueado — excedeu o limite do pacote' : 'Baixar foto'}
                        style={{ background: downloadBloqueado ? 'rgba(232,119,34,.7)' : 'rgba(59,130,246,.8)', border:'none', borderRadius:7, padding:'4px 7px', cursor: downloadBloqueado ? 'not-allowed' : 'pointer', color:'#fff', fontSize:10, display:'flex', alignItems:'center', gap:3, fontFamily:'inherit', opacity:isDown ? .6 : 1 }}>
                        {isDown ? <Loader size={10} style={{ animation:'spin 1s linear infinite' }}/> : downloadBloqueado ? <AlertCircle size={10}/> : <Download size={10}/>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.95)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            style={{ position:'absolute', top:20, right:20, background:'rgba(255,255,255,.1)', border:'none', borderRadius:'50%', width:40, height:40, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={20}/>
          </button>
          <div style={{ position:'relative', display:'inline-block' }} onClick={e => e.stopPropagation()}>
            <img src={lightbox.url || lightbox.thumbnailUrl} alt={lightbox.filename}
              style={{ maxWidth:'100%', maxHeight:'90vh', borderRadius:12, objectFit:'contain', display:'block' }}/>
            {watermarkEnabled && (
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                <img src={WATERMARK_URL} alt="watermark" style={{ width:'50%', opacity:.45, userSelect:'none', pointerEvents:'none' }}/>
              </div>
            )}
          </div>
          <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ color:'#888', fontSize:12 }}>{lightbox.filename}</span>
            {gallery?.downloadEnabled && (
              <button onClick={e => { e.stopPropagation(); downloadPhoto(lightbox); }}
                disabled={downloadBloqueado}
                title={downloadBloqueado ? 'Download bloqueado — excedeu o limite' : 'Baixar foto'}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, background: downloadBloqueado ? 'rgba(232,119,34,.7)' : 'rgba(59,130,246,.8)', border:'none', color:'#fff', fontSize:13, cursor: downloadBloqueado ? 'not-allowed' : 'pointer', fontFamily:'inherit', fontWeight:700 }}>
                {downloadBloqueado ? <AlertCircle size={14}/> : <Download size={14}/>}
                {downloadBloqueado ? 'Bloqueado' : 'Baixar'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal pagamento fotos extras */}
      {payModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.9)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setPayModal(false)}>
          <div style={dark({ padding:28, maxWidth:400, width:'100%' })} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🛒</div>
              <h2 style={{ color:'#fff', fontSize:20, fontWeight:800, margin:0 }}>Fotos extras</h2>
            </div>
            <div style={{ background:'rgba(255,255,255,.04)', borderRadius:12, padding:16, marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, color:'#888', fontSize:13 }}>
                <span>Incluídas no pacote</span><span style={{ color:'#22C55E' }}>{downloadLimit}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, color:'#888', fontSize:13 }}>
                <span>Selecionadas</span><span style={{ color:'#fff' }}>{selected.size}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, color:'#888', fontSize:13 }}>
                <span>Fotos extras</span><span style={{ color:OR }}>{extraPhotos}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', color:'#888', fontSize:13 }}>
                <span>Valor por foto extra</span><span style={{ color:'#fff' }}>R${extraPhotoPrice.toFixed(2)}</span>
              </div>
              <div style={{ borderTop:'1px solid rgba(255,255,255,.08)', marginTop:12, paddingTop:12, display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:700 }}>
                <span style={{ color:'#fff' }}>Total</span>
                <span style={{ color:OR }}>R${extraTotal.toFixed(2)}</span>
              </div>
            </div>
            <p style={{ color:'#555', fontSize:12, textAlign:'center', marginBottom:16 }}>
              Entre em contato com o fotógrafo para realizar o pagamento e liberar o download das fotos extras.
            </p>
            {gallery?.photographerPhone && (
              <button
                onClick={() => {
                  const msg = `Olá! Gostaria de pagar pelas ${extraPhotos} foto(s) extra(s) da galeria *${gallery.title}*. Total: R$${extraTotal.toFixed(2)}.`;
                  window.open(`https://wa.me/55${gallery.photographerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                style={{ width:'100%', padding:'12px', borderRadius:10, background:'#25D366', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:10 }}>
                <MessageCircle size={16}/> Falar com o fotógrafo
              </button>
            )}
            <button onClick={() => setPayModal(false)}
              style={{ width:'100%', padding:'12px', borderRadius:10, background:'rgba(255,255,255,.06)', color:'#aaa', border:'1px solid rgba(255,255,255,.08)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
