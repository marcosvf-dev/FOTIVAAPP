import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  Image, Plus, Upload, Trash2, Send, Lock,
  Eye, X, Check, Loader, Link2,
  Camera, Download, Droplets, ToggleLeft, ToggleRight
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
      {value
        ? <ToggleRight size={32} color={color}/>
        : <ToggleLeft  size={32} color="#444"/>}
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
      return toast.error('Preencha todos os campos obrigatórios');
    try {
      await api.post('/api/gallery/photographer', form);
      toast.success('Galeria criada!');
      setModal(null);
      setForm({ title:'', description:'', clientName:'', clientEmail:'', password:'', downloadEnabled:false, watermarkEnabled:false });
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
      if (data.errors?.length) toast.error(`${data.errors.length} foto(s) com erro`);
      loadGallery(current._id);
    } catch (e) { toast.error(e.response?.data?.error || 'Erro no upload'); }
    setUploading(false);
  }

  async function deletePhoto(photoId) {
    if
