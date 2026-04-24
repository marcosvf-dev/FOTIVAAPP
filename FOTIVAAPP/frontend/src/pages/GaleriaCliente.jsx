import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Check, Image, Lock, Send, Loader, Camera, ChevronDown, X } from 'lucide-react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const OR = '#E87722';
const dark = (extra={}) => ({ background:'#0d0d14', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, ...extra });
const btn  = (extra={}) => ({ display:'inline-flex', alignItems:'center', gap:7, padding:'11px 22px', borderRadius:11, border:'none', fontFamily:'inherit', fontSize:14, fontWeight:700, cursor:'pointer', transition:'all .2s', ...extra });
const inp  = (extra={}) => ({ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'12px 16px', color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit', ...extra });

export default function GaleriaCliente() {
  const { id } = useParams();
  const [step,      setStep]      = useState('login'); // login | gallery | done
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [loginErr,  setLoginErr]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [gallery,   setGallery]   = useState(null);
  const [photos,    setPhotos]    = useState([]);
  const [selected,  setSelected]  = useState(new Set());
  const [sending,   setSending]   = useState(false);
  const [lightbox,  setLightbox]  = useState(null);

  async function doLogin() {
    setLoginErr(''); setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND}/api/gallery/client/login`, { galleryId: id, email, password });
      setGallery(data.gallery);
      setPhotos(data.photos);
      // Pre-select fotos já marcadas
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
    // Salva no backend
    try {
      await axios.post(`${BACKEND}/api/gallery/client/${id}/select`, {
        email, password, photoId, selected: !isSelected,
      });
    } catch {}
  }

  async function finishSelection() {
    if (!selected.size) return alert('Selecione pelo menos 1 foto antes de finalizar.');
    if (!confirm(`Finalizar seleção com ${selected.size} foto(s)?\n\nO fotógrafo receberá a lista por email.`)) return;
    setSending(true);
    try {
      await axios.post(`${BACKEND}/api/gallery/client/${id}/finish`, { email, password });
      setStep('done');
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao enviar. Tente novamente.');
    }
    setSending(false);
  }

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
            style={btn({ width:'100%', justifyContent:'center', background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', opacity:loading||!email||!password?.6:1 })}>
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
      <div style={{ textAlign:'center', maxWidth:420 }}>
        <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(34,197,94,.1)', border:'2px solid rgba(34,197,94,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <Check size={40} color="#22C55E"/>
        </div>
        <h1 style={{ color:'#fff', fontSize:28, fontWeight:800, marginBottom:12 }}>Seleção enviada! 🎉</h1>
        <p style={{ color:'#666', fontSize:15, lineHeight:1.7, marginBottom:8 }}>
          Você selecionou <strong style={{ color:OR }}>{selected.size} foto(s)</strong>.<br/>
          O fotógrafo já recebeu sua lista por email.
        </p>
        <p style={{ color:'#444', fontSize:13, marginTop:16 }}>Você pode fechar esta página.</p>
        <div style={{ color:'#333', fontSize:12, marginTop:32 }}>Powered by <span style={{ color:OR, fontWeight:700 }}>Fotiva</span></div>
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
            {gallery.totalPhotos} fotos · {selected.size} selecionadas
          </div>
        </div>
        <button onClick={finishSelection} disabled={!selected.size || sending}
          style={btn({ background: selected.size ? `linear-gradient(135deg,${OR},#C85A00)` : 'rgba(255,255,255,.05)', color: selected.size ? '#fff' : '#444', border: selected.size ? 'none' : '1px solid rgba(255,255,255,.08)', cursor: selected.size ? 'pointer' : 'default' })}>
          {sending ? <Loader size={15} style={{ animation:'spin 1s linear infinite' }}/> : <Send size={15}/>}
          {sending ? 'Enviando...' : selected.size ? `Finalizar (${selected.size})` : 'Selecione fotos'}
        </button>
      </div>

      {/* Instrução */}
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'16px 20px' }}>
        <div style={{ background:'rgba(232,119,34,.06)', border:'1px solid rgba(232,119,34,.15)', borderRadius:12, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#ccc' }}>
          <Camera size={16} color={OR}/>
          <span>Clique nas fotos que deseja selecionar. Quando terminar, clique em <strong style={{ color:OR }}>Finalizar</strong>.</span>
        </div>

        {/* Grid */}
        {!photos.length ? (
          <div style={{ textAlign:'center', padding:'60px 24px', color:'#444' }}>
            <Camera size={40} style={{ marginBottom:12 }}/><div>Nenhuma foto disponível</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:10 }}>
            {photos.map(p => {
              const isSel = selected.has(p.id);
              return (
                <div key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  style={{ position:'relative', borderRadius:12, overflow:'hidden', cursor:'pointer', border:`2px solid ${isSel ? '#22C55E' : 'rgba(255,255,255,.06)'}`, transition:'all .2s', aspectRatio:'1', background:'#0a0a10' }}>
                  {p.thumbnailUrl
                    ? <img src={p.thumbnailUrl} alt={p.filename} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform .2s' }}
                        onMouseEnter={e => e.target.style.transform='scale(1.05)'}
                        onMouseLeave={e => e.target.style.transform='scale(1)'}/>
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Camera size={24} color="#333"/></div>
                  }
                  {/* Overlay escuro ao selecionar */}
                  {isSel && <div style={{ position:'absolute', inset:0, background:'rgba(34,197,94,.15)' }}/>}
                  {/* Checkmark */}
                  <div style={{ position:'absolute', top:8, right:8, width:26, height:26, borderRadius:'50%',
                    background: isSel ? '#22C55E' : 'rgba(0,0,0,.6)',
                    border: isSel ? '2px solid #22C55E' : '2px solid rgba(255,255,255,.3)',
                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
                    {isSel && <Check size={13} color="#fff"/>}
                  </div>
                  {/* Fullscreen btn */}
                  <button onClick={e => { e.stopPropagation(); setLightbox(p); }}
                    style={{ position:'absolute', bottom:8, right:8, background:'rgba(0,0,0,.7)', border:'none', borderRadius:7, padding:'4px 7px', cursor:'pointer', color:'#fff', fontSize:10, display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                    ↗ Ver
                  </button>
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
          <img src={lightbox.url || lightbox.thumbnailUrl} alt={lightbox.filename}
            style={{ maxWidth:'100%', maxHeight:'90vh', borderRadius:12, objectFit:'contain' }}
            onClick={e => e.stopPropagation()}/>
          <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', color:'#888', fontSize:12 }}>
            {lightbox.filename}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
