import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import api from '../lib/api';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function Agenda() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [curr, setCurr] = useState(new Date());

  useEffect(() => { api.get('/api/events').then(r => setEventos(r.data)).catch(() => {}); }, []);

  const year  = curr.getFullYear();
  const month = curr.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const evByDay = {};
  eventos.forEach(ev => {
    if (!ev.eventDate) return;
    const d = new Date(ev.eventDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const k = d.getDate();
      if (!evByDay[k]) evByDay[k] = [];
      evByDay[k].push(ev);
    }
  });

  const today = new Date();
  const isToday = d => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.4px' }}>Agenda</h1>
          <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>Visualize seus eventos no calendário</p>
        </div>
        <button className="f-btn f-btn-primary" onClick={() => navigate('/eventos/novo')}><Plus size={16} /> Novo Evento</button>
      </div>

      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button onClick={() => setCurr(new Date(year, month - 1))} style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 8, color: '#888', cursor: 'pointer', display: 'flex' }}><ChevronLeft size={18} /></button>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{MESES[month]} {year}</h2>
          <button onClick={() => setCurr(new Date(year, month + 1))} style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 8, color: '#888', cursor: 'pointer', display: 'flex' }}><ChevronRight size={18} /></button>
        </div>

        {/* Weekdays */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
          {DIAS_SEMANA.map(d => <div key={d} style={{ textAlign: 'center', color: '#444', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', padding: '4px 0' }}>{d}</div>)}
        </div>

        {/* Days grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const evs = evByDay[day] || [];
            const tod = isToday(day);
            return (
              <div key={day}
                style={{ minHeight: 60, background: tod ? 'rgba(232,119,34,0.12)' : evs.length ? 'rgba(255,255,255,0.03)' : 'transparent', border: `1px solid ${tod ? 'rgba(232,119,34,0.4)' : 'rgba(255,255,255,0.04)'}`, borderRadius: 10, padding: '6px 5px', cursor: evs.length ? 'pointer' : 'default', transition: 'all .15s' }}
                onClick={() => evs.length && navigate('/eventos')}
                onMouseEnter={e => { if(evs.length) e.currentTarget.style.borderColor='rgba(232,119,34,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = tod ? 'rgba(232,119,34,0.4)' : 'rgba(255,255,255,0.04)'; }}>
                <div style={{ textAlign: 'center', fontSize: 13, fontWeight: tod ? 800 : 500, color: tod ? '#E87722' : '#888', marginBottom: 4 }}>{day}</div>
                {evs.slice(0, 2).map((ev, j) => (
                  <div key={j} style={{ background: 'rgba(232,119,34,0.2)', color: '#E87722', fontSize: 9, fontWeight: 600, padding: '2px 4px', borderRadius: 4, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.eventType}
                  </div>
                ))}
                {evs.length > 2 && <div style={{ color: '#555', fontSize: 9, textAlign: 'center' }}>+{evs.length - 2}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming this month */}
      {Object.keys(evByDay).length > 0 && (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
          <h3 style={{ color: '#ddd', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Eventos deste mês</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(evByDay).sort((a,b) => a[0]-b[0]).flatMap(([day, evs]) =>
              evs.map((ev, i) => (
                <div key={`${day}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#161616', borderRadius: 10, cursor: 'pointer' }} onClick={() => navigate(`/eventos/editar/${ev._id}`)}>
                  <div style={{ width: 36, height: 36, background: 'rgba(232,119,34,0.1)', border: '1px solid rgba(232,119,34,0.2)', borderRadius: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#E87722', fontSize: 13, fontWeight: 800 }}>{day}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#ddd', fontSize: 13, fontWeight: 600 }}>{ev.eventType}</div>
                    <div style={{ color: '#555', fontSize: 12 }}>{ev.clientName}</div>
                  </div>
                  {ev.eventDate && <div style={{ color: '#555', fontSize: 12 }}>{new Date(ev.eventDate).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
