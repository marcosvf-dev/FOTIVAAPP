import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { ExternalLink, MessageCircle, Search, Tag } from 'lucide-react';

const OR = '#E87722';

const CATEGORIAS = [
  { id:'todos',        label:'Todos',          emoji:'🔍' },
  { id:'equipamentos', label:'Equipamentos',    emoji:'📷' },
  { id:'studios',      label:'Estúdios',        emoji:'🏢' },
  { id:'laboratorios', label:'Laboratórios',    emoji:'🖼️' },
  { id:'software',     label:'Software',        emoji:'💻' },
  { id:'cursos',       label:'Cursos',          emoji:'🎓' },
  { id:'outros',       label:'Outros',          emoji:'✨' },
];

export default function Parceiros() {
  const [ads,      setAds]      = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [catAtiva, setCatAtiva] = useState('todos');
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    api.get('/api/ads').then(r => { setAds(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function trackClick(ad) {
    api.post(`/api/ads/${ad._id}/click`).catch(() => {});
    if (ad.link) window.open(ad.link.startsWith('http') ? ad.link : `https://${ad.link}`, '_blank');
    else if (ad.whatsapp) {
      const phone = ad.whatsapp.replace(/\D/g,'');
      window.open(`https://wa.me/55${phone}?text=Olá! Vi seu anúncio no app Fotiva e gostaria de mais informações.`, '_blank');
    }
  }

  const filtered = ads.filter(a => {
    const matchCat = catAtiva === 'todos' || a.category === catAtiva;
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured = filtered.filter(a => a.featured);
  const regular  = filtered.filter(a => !a.featured);

  const AdCard = ({ ad, big }) => (
    <div onClick={() => trackClick(ad)}
      style={{ background:'#0f0f14', border:`1px solid ${ad.featured ? 'rgba(232,119,34,.3)' : 'rgba(255,255,255,.07)'}`, borderRadius:14, overflow:'hidden', cursor:'pointer', transition:'all .25s', position:'relative' }}
      onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
      onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>

      {ad.featured && (
        <div style={{ position:'absolute', top:10, left:10, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:6, zIndex:1 }}>
          ⭐ DESTAQUE
        </div>
      )}

      {/* Imagem */}
      <div style={{ height: big ? 180 : 140, background:'rgba(255,255,255,.04)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        {ad.image
          ? <img src={ad.image} alt={ad.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          : <div style={{ fontSize:48 }}>{CATEGORIAS.find(c=>c.id===ad.category)?.emoji || '📦'}</div>
        }
      </div>

      {/* Conteúdo */}
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6 }}>
          <div style={{ color:'#fff', fontWeight:700, fontSize:14, lineHeight:1.3 }}>{ad.title}</div>
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:5, background:'rgba(232,119,34,.1)', color:OR, flexShrink:0, whiteSpace:'nowrap' }}>
            {CATEGORIAS.find(c=>c.id===ad.category)?.label || 'Outros'}
          </span>
        </div>
        {ad.description && (
          <div style={{ color:'#666', fontSize:12, lineHeight:1.6, marginBottom:12 }}>
            {ad.description.slice(0,120)}{ad.description.length > 120 ? '...' : ''}
          </div>
        )}
        {ad.contactName && <div style={{ color:'#555', fontSize:11, marginBottom:10 }}>👤 {ad.contactName}</div>}

        <div style={{ display:'flex', gap:8 }}>
          {ad.whatsapp && (
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'#25D366' }}>
              <MessageCircle size={12}/> WhatsApp
            </div>
          )}
          {ad.link && (
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:OR }}>
              <ExternalLink size={12}/> Ver mais
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div style={{ maxWidth:900, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:0 }}>Parceiros & Fornecedores</h1>
          <p style={{ color:'#555', fontSize:13, marginTop:4 }}>Produtos e serviços recomendados para fotógrafos</p>
        </div>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:16 }}>
          <Search size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#444' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produtos e serviços..."
            style={{ width:'100%', background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:'11px 14px 11px 36px', color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
        </div>

        {/* Categorias */}
        <div style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
          {CATEGORIAS.map(c => (
            <button key={c.id} onClick={() => setCatAtiva(c.id)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0, transition:'all .2s',
                background: catAtiva===c.id ? `linear-gradient(135deg,${OR},#C85A00)` : 'rgba(255,255,255,.06)',
                color: catAtiva===c.id ? '#fff' : '#666' }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'48px', color:'#555' }}>Carregando...</div>
        ) : !filtered.length ? (
          <div style={{ textAlign:'center', padding:'48px', color:'#555' }}>
            <Tag size={36} color="#333" style={{ marginBottom:12 }}/>
            <div style={{ fontSize:15, color:'#555', marginBottom:6 }}>Nenhum anúncio encontrado</div>
            <div style={{ fontSize:13, color:'#444' }}>Em breve novos parceiros por aqui!</div>
          </div>
        ) : (
          <>
            {/* Destaques */}
            {featured.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <div style={{ color:OR, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>⭐ Destaques</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
                  {featured.map(ad => <AdCard key={ad._id} ad={ad} big/>)}
                </div>
              </div>
            )}

            {/* Regulares */}
            {regular.length > 0 && (
              <div>
                {featured.length > 0 && <div style={{ color:'#555', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Todos os anúncios</div>}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
                  {regular.map(ad => <AdCard key={ad._id} ad={ad}/>)}
                </div>
              </div>
            )}
          </>
        )}

        {/* CTA — anunciar */}
        <div style={{ marginTop:32, background:'linear-gradient(135deg,rgba(232,119,34,.08),rgba(200,90,0,.04))', border:'1px solid rgba(232,119,34,.15)', borderRadius:16, padding:'24px 20px', textAlign:'center' }}>
          <div style={{ fontSize:24, marginBottom:8 }}>📣</div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:15, marginBottom:6 }}>Quer anunciar aqui?</div>
          <div style={{ color:'#666', fontSize:13, marginBottom:16, lineHeight:1.6 }}>
            Alcance centenas de fotógrafos profissionais.<br/>Entre em contato e saiba mais sobre os planos de anúncio.
          </div>
          <a href="https://wa.me/5537988006994?text=Olá! Quero anunciar no app Fotiva!" target="_blank" rel="noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:10, background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:700 }}>
            <MessageCircle size={15}/> Falar no WhatsApp
          </a>
        </div>
      </div>
    </Layout>
  );
}
