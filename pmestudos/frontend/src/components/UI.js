import { useState, useEffect } from 'react';

// ── Toast ──────────────────────────────────────────────────────────
export function Toast({ msg, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); } }, [msg, onClose]);
  if (!msg) return null;
  return <div className="toast">🔔 {msg}</div>;
}

// ── Spinner ────────────────────────────────────────────────────────
export function Loader() { return <div className="loader"><div className="spinner" /></div>; }

// ── Modal ──────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 className="modal-title" style={{ margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:'#8FA3BF', cursor:'pointer' }}>✕</button>
        </div>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────
export function Badge({ color = 'gray', children }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

// ── Confirm ────────────────────────────────────────────────────────
export function ConfirmModal({ open, msg, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Confirmar ação"
      footer={<>
        <button className="btn btn-outline btn-sm" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger btn-sm" onClick={() => { onConfirm(); onClose(); }}>Confirmar</button>
      </>}>
      <p style={{ color:'#4A6080', fontSize:15 }}>{msg}</p>
    </Modal>
  );
}

// ── Logo ───────────────────────────────────────────────────────────
export function Logo({ onClick }) {
  return (
    <div className="nav-logo" onClick={onClick} style={{ cursor:'pointer' }}>
      <div className="nav-logo-badge">⭐</div>
      <div className="nav-logo-text">PM<span>Estudos</span></div>
    </div>
  );
}

// ── Plan Badge ─────────────────────────────────────────────────────
export function PlanBadge({ plan }) {
  const map = { free: ['gray','Grátis'], pro: ['gold','⭐ Pro'], elite: ['blue','💎 Elite'] };
  const [color, label] = map[plan] || map.free;
  return <Badge color={color}>{label}</Badge>;
}

// ── Empty State ────────────────────────────────────────────────────
export function Empty({ icon = '📭', title, desc, action }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:52, marginBottom:16 }}>{icon}</div>
      <h3 style={{ fontSize:20, fontWeight:800, color:'#0B1E3D', marginBottom:8 }}>{title}</h3>
      {desc && <p style={{ color:'#4A6080', fontSize:14, marginBottom:20 }}>{desc}</p>}
      {action}
    </div>
  );
}
