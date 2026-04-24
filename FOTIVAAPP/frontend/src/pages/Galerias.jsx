import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  Image, Plus, Upload, Trash2, Send, Lock,
  Eye, X, Check, Loader, Link2,
  Camera, AlertCircle
} from 'lucide-react';

const OR = '#E87722';
const dark = { background:'#0a0a10', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:20 };
const btnStyle = (extra={}) => ({ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, border:'none', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s', ...extra });
const inpStyle = (extra={}) => ({ width:'100%', background:'#1a1a22', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'10px 14px', color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit', ...extra });

export default function Galerias() {
  const navigate  = useNavigate();
  const [galleries, setGalleries] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [current,   setCurrent]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [closing,   setClosing]   = useState(false);
  const [sending,   setSending]   = useState(false);
  const fileRef = useRef();
  const [form, setForm] = useState({ title:'', description:'', clientName:'', clientEmail:'', password:'' });

  useEffect(() => { loadGalleries(); }, []);

  async function loadGalleries() {
    try {
      const { data } = await api.get('/api/gallery/photographer');
      setGalleries(data);
    } catch (e) {
      if (e.response?.status === 403) {
        toast.error('Galeria disponível apenas no plano PRO');
        navigate('/assinatura');
      }
    }
    setLoading(false);
  }

  async function loadGallery(id) {
    try {
      const { data } = await api.get(`/api/gallery/photographer/${id}`);
      setCurrent(data);
      setModal('gallery');
    } catch { toast.error('Erro ao carregar galeria'); }
  }

  async function createGallery() {
    if (!form.title || !form.clientName || !form.clientEmail || !form.password)
      return toast.error('Preencha todos os campos');
    try {
      await api.post('/api/gallery/photographer', form);
      toast.success('Galeria criada!');
      setModal(null);
      setForm({ title:'', description:'', clientName:'', clientEmail:'', password:'' });
      loadGalleries();
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao criar galeria'); }
  }

  async function uploadPhotos(files) {
    if (!current || !files.length) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('photos', f));
    try {
      const { data } = await api.post(`/api/gallery/photographer/${current._id}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      toast.success(`${data.uploaded} foto(s) enviada(s)!`);
      loadGallery(current._id);
    } catch (e) { toast.error(e.response?.data?.error || 'Erro no upload'); }
    setUploading(false);
  }

  async function deletePhoto(photoId) {
    if (!window.confirm('Deletar esta foto?')) return;
    try {
      await api.delete(`/api/gallery/photographer/${current._id}/photo/${photoId}`);
      toast.success('Foto deletada');
      loadGallery(current._id);
    } catch { toast.error('Erro ao deletar'); }
  }

  async function sendSelection() {
    setSending(true);
    try {
      const { data } = await api.post(`/api/gallery/photographer/${current._id}/send-selection`);
      toast.success(`Email enviado com ${data.sent} fotos!`);
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao enviar'); }
    setSending(false);
  }

  async function closeGallery() {
    if (!window.confirm(`Encerrar a galeria "${current.title}"?\n\nTodas as fotos serão APAGADAS permanentemente.`)) return;
    setClosing(true);
    try {
      await api.post(`/api/gallery/photographer/${current._id}/close`);
      toast.success('Galeria encerrada!');
      setModal(null);
      setCurrent(null);
      loadGalleries();
    } catch { toast.error('Erro ao encerrar galeria'); }
    setClosing(false);
  }

  function copyLink(gal) {
    const url = `${window.location.origin}/galeria/${gal._id}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copiado!'));
  }

  const selectedCount = current?.photos?.filter(p => p.selected).length || 0;
  const APP_URL = window.location.origin;

  if (loading) return (
    <Layout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'#555' }}>
        <Loader size={28} style={{ animation:'spin 1s linear infinite' }}/>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:0 }}>Galerias de Fotos</h1>
            <p style={{ color:'#555', fontSize:13, marginTop:4 }}>Crie galerias e deixe seus clientes escolherem as fotos</p>
          </div>
          <button onClick={() => setModal('create')} style={btnStyle({ background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff' })}>
            <Plus size={16}/> Nova galeria
          </button>
        </div>

        {/* Lista */}
        {!galleries.length ? (
          <div style={{ ...dark, textAlign:'center', padding:'60px 24px' }}>
            <Image size={48} color="#333" style={{ marginBottom:16 }}/>
            <div style={{ color:'#666', fontSize:15, marginBottom:8 }}>Nenhuma galeria criada ainda</div>
            <div style={{ color:'#444', fontSize:13, marginBottom:24 }}>Crie sua primeira galeria e envie fotos para seus clientes escolherem</div>
            <button onClick={() => setModal('create')} style={btnStyle({ background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff' })}>
              <Plus size={15}/> Criar primeira galeria
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16 }}>
            {galleries.map(g => (
              <div key={g._id} style={{ ...dark, cursor:'pointer', transition:'all .25s', position:'relative' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(232,119,34,.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,.07)'}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{g.title}</div>
                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:6,
                        background: g.status==='active' ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                        color: g.status==='active' ? '#22C55E' : '#EF4444' }}>
                        {g.status==='active' ? 'ATIVA' : 'ENCERRADA'}
                      </span>
                    </div>
                    <div style={{ color:'#555', fontSize:12 }}>👤 {g.clientName}</div>
                    <div style={{ color:'#444', fontSize:11, marginTop:2 }}>📧 {g.clientEmail}</div>
                  </div>
                  <div style={{ background:'rgba(232,119,34,.08)', borderRadius:10, padding:'8px 10px', textAlign:'center', marginLeft:10 }}>
                    <div style={{ fontSize:20, fontWeight:800, color:OR }}>{g.photos?.length || 0}</div>
                    <div style={{ fontSize:9, color:'#555', marginTop:1 }}>fotos</div>
                  </div>
                </div>

                {g.selectionSentAt && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.15)', borderRadius:8, padding:'6px 10px', marginBottom:10, fontSize:11, color:'#22C55E' }}>
                    <Check size={12}/> Seleção enviada em {new Date(g.selectionSentAt).toLocaleDateString('pt-BR')}
                  </div>
                )}

                <div style={{ display:'flex', gap:8, marginTop:12 }}>
                  <button onClick={() => loadGallery(g._id)}
                    style={btnStyle({ flex:1, justifyContent:'center', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#ccc', padding:'8px 12px' })}>
                    <Eye size={13}/> Gerenciar
                  </button>
                  {g.status === 'active' && (
                    <button onClick={() => copyLink(g)} title="Copiar link"
                      style={btnStyle({ background:'rgba(232,119,34,.1)', border:'1px solid rgba(232,119,34,.2)', color:OR, padding:'8px 12px' })}>
                      <Link2 size={14}/>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Criar galeria */}
      {modal === 'create' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#0d0d14', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, padding:32, width:'100%', maxWidth:460 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
              <h2 style={{ color:'#fff', fontSize:18, fontWeight:800, margin:0 }}>Nova Galeria</h2>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#555' }}><X size={20}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:6 }}>Título *</label>
                <input value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="Ex: Casamento Ana & Pedro" style={inpStyle()}/>
              </div>
              <div>
                <label style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:6 }}>Descrição</label>
                <input value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Opcional" style={inpStyle()}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:6 }}>Nome do Cliente *</label>
                  <input value={form.clientName} onChange={e => setForm({...form, clientName:e.target.value})} placeholder="Ana Silva" style={inpStyle()}/>
                </div>
                <div>
                  <label style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:6 }}>Email *</label>
                  <input type="email" value={form.clientEmail} onChange={e => setForm({...form, clientEmail:e.target.value})} placeholder="ana@email.com" style={inpStyle()}/>
                </div>
              </div>
              <div>
                <label style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:6 }}>Senha de Acesso *</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder="Crie uma senha para o cliente" style={inpStyle()}/>
                <div style={{ color:'#444', fontSize:11, marginTop:5 }}>O cliente usará esta senha para acessar as fotos</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:24 }}>
              <button onClick={() => setModal(null)} style={btnStyle({ flex:1, justifyContent:'center', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#888' })}>
                Cancelar
              </button>
              <button onClick={createGallery} style={btnStyle({ flex:1, justifyContent:'center', background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff' })}>
                <Plus size={15}/> Criar Galeria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gerenciar galeria */}
      {modal === 'gallery' && current && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.92)', zIndex:1000, overflowY:'auto', padding:20 }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0', marginBottom:20, flexWrap:'wrap', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <button onClick={() => { setModal(null); setCurrent(null); }}
                  style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:9, padding:'8px 14px', color:'#888', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontFamily:'inherit' }}>
                  ← Voltar
                </button>
                <div>
                  <h2 style={{ color:'#fff', fontSize:18, fontWeight:800, margin:0 }}>{current.title}</h2>
                  <div style={{ color:'#555', fontSize:12, marginTop:2 }}>👤 {current.clientName} · 📧 {current.clientEmail}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button onClick={() => copyLink(current)}
                  style={btnStyle({ background:'rgba(232,119,34,.1)', border:'1px solid rgba(232,119,34,.2)', color:OR })}>
                  <Link2 size={14}/> Copiar link
                </button>
                {selectedCount > 0 && (
                  <button onClick={sendSelection} disabled={sending}
                    style={btnStyle({ background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.25)', color:'#22C55E', opacity:sending?.6:1 })}>
                    <Send size={14}/>{sending ? 'Enviando...' : `Enviar seleção (${selectedCount})`}
                  </button>
                )}
                {current.status === 'active' && (
                  <button onClick={closeGallery} disabled={closing}
                    style={btnStyle({ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', color:'#EF4444', opacity:closing?.6:1 })}>
                    <Lock size={14}/>{closing ? 'Encerrando...' : 'Encerrar'}
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {[
                { label:'Total', value:current.photos?.length||0, color:OR },
                { label:'Selecionadas', value:selectedCount, color:'#22C55E' },
                { label:'Não selecionadas', value:(current.photos?.length||0)-selectedCount, color:'#555' },
                { label:'Status', value:current.status==='active'?'Ativa':'Encerrada', color:current.status==='active'?'#22C55E':'#EF4444' },
              ].map(s => (
                <div key={s.label} style={{ ...dark, textAlign:'center', padding:'14px 16px' }}>
                  <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'#444', marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Link */}
            <div style={{ ...dark, marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ background:'rgba(232,119,34,.08)', borderRadius:9, padding:'10px 12px' }}>
                <Link2 size={18} color={OR}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>Link para o cliente</div>
                <div style={{ color:'#ccc', fontSize:13, marginTop:2, fontFamily:'monospace' }}>{APP_URL}/galeria/{current._id}</div>
              </div>
              <button onClick={() => copyLink(current)}
                style={btnStyle({ background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', padding:'8px 16px' })}>
                Copiar
              </button>
            </div>

            {/* Upload */}
            {current.status === 'active' && (
              <div
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor=OR; }}
                onDragLeave={e => { e.currentTarget.style.borderColor='rgba(232,119,34,.25)'; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor='rgba(232,119,34,.25)'; uploadPhotos(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                style={{ border:'2px dashed rgba(232,119,34,.25)', borderRadius:14, padding:28, textAlign:'center', cursor:'pointer', marginBottom:20, transition:'all .2s', background:'rgba(232,119,34,.02)' }}>
                <input ref={fileRef} type="file" multiple accept="image/*" style={{ display:'none' }}
                  onChange={e => uploadPhotos(e.target.files)}/>
                {uploading ? (
                  <div style={{ color:OR }}>
                    <Loader size={28} style={{ animation:'spin 1s linear infinite', marginBottom:8 }}/>
                    <div style={{ fontSize:14, fontWeight:600 }}>Enviando fotos...</div>
                  </div>
                ) : (
                  <>
                    <Upload size={28} color={OR} style={{ marginBottom:10 }}/>
                    <div style={{ color:'#ccc', fontSize:14, fontWeight:600 }}>Arraste fotos ou clique para selecionar</div>
                    <div style={{ color:'#555', fontSize:12, marginTop:6 }}>JPG, PNG · Máx 50MB por foto · Compressão automática</div>
                  </>
                )}
              </div>
            )}

            {/* Grid de fotos */}
            {!current.photos?.length ? (
              <div style={{ ...dark, textAlign:'center', padding:'40px 24px' }}>
                <Camera size={36} color="#333" style={{ marginBottom:12 }}/>
                <div style={{ color:'#555', fontSize:14 }}>Nenhuma foto ainda — faça o upload acima</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:10 }}>
                {current.photos.map(p => (
                  <div key={p.id} style={{ position:'relative', borderRadius:12, overflow:'hidden', background:'#0a0a10', border:`2px solid ${p.selected?'#22C55E':'rgba(255,255,255,.06)'}`, aspectRatio:'1' }}>
                    {p.thumbnailUrl
                      ? <img src={p.thumbnailUrl} alt={p.filename} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Camera size={24} color="#333"/></div>
                    }
                    {p.selected && (
                      <div style={{ position:'absolute', top:6, right:6, width:20, height:20, borderRadius:'50%', background:'#22C55E', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Check size={11} color="#fff"/>
                      </div>
                    )}
                    <button onClick={() => deletePhoto(p.id)}
                      style={{ position:'absolute', bottom:6, right:6, background:'rgba(239,68,68,.85)', border:'none', borderRadius:6, padding:'4px 7px', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center' }}>
                      <Trash2 size={11}/>
                    </button>
                    <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(0,0,0,.8))', padding:'12px 8px 6px', fontSize:9, color:'#aaa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {p.filename}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </Layout>
  );
}
