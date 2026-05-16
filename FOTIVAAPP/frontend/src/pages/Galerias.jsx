import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  Image, Plus, Upload, Trash2, Send, Lock,
  Eye, X, Check, Loader, Link2,
  Camera, Droplets, ToggleLeft, ToggleRight
} from 'lucide-react';

const OR = '#E87722';
const dark = { background:'#0a0a10', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:20 };
const btnStyle = (extra={}) => ({ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, border:'none', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s', ...extra });
const inpStyle = (extra={}) => ({ width:'100%', background:'#1a1a22', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'10px 14px', color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit', ...extra });

const Toggle = ({ value, onChange, label, sub, color='#22C55E' }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,.03)', borderRadius:10, padding:'12px 14px', border:'1px solid rgba(255,255,255,.06)' }}>
    <div>
      <div style={{ color:'#ddd', fontSize:13, fontWeight:600 }}>{label}</div>
      {sub && <div style={{ color:'#555', fontSize:11, marginTop:2 }}>{sub}</div>}
    </div>
    <button onClick={() => onChange(!value)}
      style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center' }}>
      {value ? <ToggleRight size={32} color={color}/> : <ToggleLeft size={32} color="#444"/>}
    </button>
  </div>
);

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
  const [form, setForm] = useState({
    title:'', description:'', clientName:'', clientEmail:'', password:'',
    downloadEnabled: false, watermarkEnabled: false,
  });

  useEffect(() => { loadGalleries(); }, []);

  async function loadGalleries() {
    try {
      const { data } = await api.get('/api/gallery/photographer');
      setGalleries(data);
    } catch(e) {
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
    } catch(e) { toast.error('Erro ao carregar galeria'); }
  }

  async function createGallery() {
    if (!form.title || !form.clientName || !form.clientEmail || !form.password)
      return toast.error('Preencha todos os campos obrigatórios');
    try {
      await api.post('/api/gallery/photographer', form);
      toast.success('Galeria criada!');
      setModal(null);
      setForm({ title:'', description:'', clientName:'', clientEmail:'', password:'', downloadEnabled:false, watermarkEnabled:false });
      loadGalleries();
    } catch(e) { toast.error(e.response?.data?.error || 'Erro ao criar galeria'); }
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
      if (data.errors?.length) toast.error(`${data.errors.length} foto(s) com erro`);
      loadGallery(current._id);
    } catch(e) { toast.error(e.response?.data?.error || 'Erro no upload'); }
    setUploading(false);
  }

  async function deletePhoto(photoId) {
    if (!window.confirm('Deletar esta foto?')) return;
    try {
      await api.delete(`/api/gallery/photographer/${current._id}/photo/${photoId}`);
      toast.success('Foto deletada');
      loadGallery(current._id);
    } catch(e) { toast.error('Erro ao deletar'); }
  }

  async function sendSelection() {
    setSending(true);
    try {
      const { data } = await api.post(`/api/gallery/photographer/${current._id}/send-selection`);
      toast.success(`Email enviado com ${data.sent} fotos!`);
    } catch(e) { toast.error(e.response?.data?.error || 'Erro ao enviar'); }
    setSending(false);
  }

  async function closeGallery() {
    if (!window.confirm(`Encerrar a galeria "${current.title}"?\n\nTodas as fotos serão APAGADAS permanentemente.`)) return;
    setClosing(true);
    try {
      await api.post(`/api/gallery/photographer/${current._id}/close`);
      toast.success('Galeria encerrada!');
      setModal(null); setCurrent(null);
      loadGalleries();
    } catch(e) { toast.error('Erro ao encerrar galeria'); }
    setClosing(false);
  }

  async function toggleSetting(key, value) {
    try {
      await api.patch(`/api/gallery/photographer/${current._id}/settings`, { [key]: value });
      setCurrent(c => ({ ...c, [key]: value }));
      toast.success(value ? 'Ativado!' : 'Desativado!');
    } catch(e) { toast.error('Erro ao atualizar configuração'); }
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

  // Gerenciar galeria — fora do Layout para não sobrepor sidebar
  if (modal === 'gallery' && current) {
    return (
      <div style={{ minHeight:'100vh', background:'#080808', overflowY:'auto', padding:20, fontFamily:'Inter,sans-serif' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0', marginBottom:20, flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <button onClick={() => { setModal(null); setCurrent(null); }}
                style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:9, padding:'8px 14px', color:'#888', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontFamily:'inherit' }}>
                {'<-'} Voltar
              </button>
              <div>
                <h2 style={{ color:'#fff', fontSize:18, fontWeight:800, margin:0 }}>{current.title}</h2>
                <div style={{ color:'#555', fontSize:12, marginTop:2 }}>{current.clientName} · {current.clientEmail}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button onClick={() => copyLink(current)}
                style={btnStyle({ background:'rgba(232,119,34,.1)', border:'1px solid rgba(232,119,34,.2)', color:OR })}>
                <Link2 size={14}/> Copiar link
              </button>
              {selectedCount > 0 && (
                <button onClick={sendSelection} disabled={sending}
                  style={btnStyle({ background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.25)', color:'#22C55E', opacity:sending ? .6 : 1 })}>
                  <Send size={14}/> {sending ? 'Enviando...' : `Enviar selecao (${selectedCount})`}
                </button>
              )}
              {current.status === 'active' && (
                <button onClick={closeGallery} disabled={closing}
                  style={btnStyle({ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', color:'#EF4444', opacity:closing ? .6 : 1 })}>
                  <Lock size={14}/> {closing ? 'Encerrando...' : 'Encerrar'}
                </button>
              )}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12, marginBottom:20 }}>
            {[
              { label:'Total', value:current.photos?.length||0, color:OR },
              { label:'Selecionadas', value:selectedCount, color:'#22C55E' },
              { label:'Nao selecionadas', value:(current.photos?.length||0)-selectedCount, color:'#555' },
              { label:'Status', value:current.status==='active'?'Ativa':'Encerrada', color:current.status==='active'?'#22C55E':'#EF4444' },
            ].map(s => (
              <div key={s.label} style={{ ...dark, textAlign:'center', padding:'14px 16px' }}>
                <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:'#444', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {current.status === 'active' && (
            <div style={{ ...dark, marginBottom:20 }}>
              <div style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>Configuracoes</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <Toggle value={!!current.downloadEnabled}  onChange={v => toggleSetting('downloadEnabled', v)}  label="Permitir download"  sub="Cliente pode baixar as fotos" color="#3B82F6"/>
                <Toggle value={!!current.watermarkEnabled} onChange={v => toggleSetting('watermarkEnabled', v)} label="Marca dagua"          sub="Aplica no proximo upload"    color="#A855F7"/>
              </div>
              {current.watermarkEnabled && (
                <div style={{ marginTop:10, padding:'10px 14px', background:'rgba(168,85,247,.06)', border:'1px solid rgba(168,85,247,.15)', borderRadius:9, fontSize:12, color:'#A855F7', display:'flex', alignItems:'center', gap:8 }}>
                  <Droplets size={14}/> Marca dagua "{current.watermarkText || 'seu nome'}" nas proximas fotos
                </div>
              )}
            </div>
          )}

          {current.expiresAt && (
            <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#EF4444' }}>
              Galeria expira em <strong>{new Date(current.expiresAt).toLocaleDateString('pt-BR')}</strong>
            </div>
          )}

          <div style={{ ...dark, marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ background:'rgba(232,119,34,.08)', borderRadius:9, padding:'10px 12px' }}>
              <Link2 size={18} color={OR}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>Link para o cliente</div>
              <div style={{ color:'#ccc', fontSize:13, marginTop:2, fontFamily:'monospace', wordBreak:'break-all' }}>{APP_URL}/galeria/{current._id}</div>
            </div>
            <button onClick={() => copyLink(current)} style={btnStyle({ background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', padding:'8px 16px' })}>
              Copiar
            </button>
          </div>

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
                  {current.watermarkEnabled && <div style={{ fontSize:12, color:'#666', marginTop:4 }}>Aplicando marca dagua...</div>}
                </div>
              ) : (
                <>
                  <Upload size={28} color={OR} style={{ marginBottom:10 }}/>
                  <div style={{ color:'#ccc', fontSize:14, fontWeight:600 }}>Arraste fotos ou clique para selecionar</div>
                  <div style={{ color:'#555', fontSize:12, marginTop:6 }}>
                    JPG, PNG · Max 50MB por foto · Compressao automatica
                    {current.watermarkEnabled && ' · Marca dagua sera aplicada'}
                  </div>
                </>
              )}
            </div>
          )}

          {!current.photos?.length ? (
            <div style={{ ...dark, textAlign:'center', padding:'40px 24px' }}>
              <Camera size={36} color="#333" style={{ marginBottom:12 }}/>
              <div style={{ color:'#555', fontSize:14 }}>Nenhuma foto ainda — faca o upload acima</div>
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
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Lista de galerias
  return (
    <Layout>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:0 }}>Galerias de Fotos</h1>
            <p style={{ color:'#555', fontSize:13, marginTop:4 }}>Crie galerias e deixe seus clientes escolherem as fotos</p>
          </div>
          <button onClick={() => setModal('create')} style={btnStyle({ background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff' })}>
            <Plus size={16}/> Nova galeria
          </button>
        </div>

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
              <div key={g._id} style={{ ...dark, cursor:'pointer', transition:'all .25s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(232,119,34,.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,.07)'}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{g.title}</div>
                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:6,
                        background: g.status==='active' ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                        color: g.status==='active' ? '#22C55E' : '#EF4444' }}>
                        {g.status==='active' ? 'ATIVA' : 'ENCERRADA'}
                      </span>
                      {g.downloadEnabled && <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'rgba(59,130,246,.12)', color:'#3B82F6' }}>DOWNLOAD</span>}
                      {g.watermarkEnabled && <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'rgba(168,85,247,.12)', color:'#A855F7' }}>MARCA</span>}
                    </div>
                    <div style={{ color:'#555', fontSize:12 }}>{g.clientName}</div>
                    <div style={{ color:'#444', fontSize:11, marginTop:2 }}>{g.clientEmail}</div>
                    {g.expiresAt && (
                      <div style={{ color:'#EF4444', fontSize:10, marginTop:4 }}>
                        Expira em {new Date(g.expiresAt).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                  <div style={{ background:'rgba(232,119,34,.08)', borderRadius:10, padding:'8px 10px', textAlign:'center', marginLeft:10 }}>
                    <div style={{ fontSize:20, fontWeight:800, color:OR }}>{g.photos?.length || 0}</div>
                    <div style={{ fontSize:9, color:'#555', marginTop:1 }}>fotos</div>
                  </div>
                </div>

                {g.selectionSentAt && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.15)', borderRadius:8, padding:'6px 10px', marginBottom:10, fontSize:11, color:'#22C55E' }}>
                    <Check size={12}/> Selecao enviada em {new Date(g.selectionSentAt).toLocaleDateString('pt-BR')}
                  </div>
                )}

                <div style={{ display:'flex', gap:8, marginTop:12 }}>
                  <button onClick={() => loadGallery(g._id)}
                    style={btnStyle({ flex:1, justifyContent:'center', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#ccc', padding:'8px 12px' })}>
                    <Eye size={13}/> Gerenciar
                  </button>
                  {g.status === 'active' && (
                    <button onClick={() => copyLink(g)}
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

      {modal === 'create' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20, overflowY:'auto' }}>
          <div style={{ background:'#0d0d14', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, padding:32, width:'100%', maxWidth:480, margin:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
              <h2 style={{ color:'#fff', fontSize:18, fontWeight:800, margin:0 }}>Nova Galeria</h2>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#555' }}><X size={20}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:6 }}>Titulo *</label>
                <input value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="Ex: Casamento Ana & Pedro" style={inpStyle()}/>
              </div>
              <div>
                <label style={{ color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:6 }}>Descricao</label>
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
                <div style={{ color:'#444', fontSize:11, marginTop:5 }}>O cliente usara esta senha para acessar as fotos</div>
              </div>
              <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:14, display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ color:'#666', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Opcoes</div>
                <Toggle value={form.downloadEnabled}  onChange={v => setForm({...form, downloadEnabled:v})}  label="Permitir download"  sub="Cliente podera baixar as fotos" color="#3B82F6"/>
                <Toggle value={form.watermarkEnabled} onChange={v => setForm({...form, watermarkEnabled:v})} label="Marca dagua"          sub="Adiciona seu nome nas fotos"    color="#A855F7"/>
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

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </Layout>
  );
}
