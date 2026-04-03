"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [serverExpiry, setServerExpiry] = useState<string | null>(null);
  const [serverLoading, setServerLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    fetch("/api/server-info")
      .then(res => res.json())
      .then(data => {
        if (data.status === "SUCCESS") setServerExpiry(data.expiry_date);
        setServerLoading(false);
      })
      .catch(() => setServerLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="gradient-text" style={{ fontSize: '2rem' }}>Loading...</div>
      </div>
    );
  }

  const getServerExpiryDisplay = () => {
    if (serverLoading) return "Menghubungkan...";
    if (serverExpiry) return serverExpiry;

    // Fallback: Use 31-day logic from base date if API fails or data is empty
    let expiry = new Date("2026-05-05T00:00:00");
    const now = new Date();
    while (expiry <= now) {
      expiry.setDate(expiry.getDate() + 31);
    }
    return expiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + " (Est.)";
  };

  return (
    <main style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>MYnyak Engsel Sunset</h1>
        <div className="status-badge status-active">Online</div>
      </header>

      <div className="glass-card animate-fade" style={{ marginBottom: '24px', border: '1px solid rgba(255, 165, 0, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="label" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Masa Aktif Server:</div>
          <div className="value" style={{ fontSize: '1rem', color: 'white' }}>{getServerExpiryDisplay()}</div>
        </div>
        <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
          <a
            href="https://howdy.id/login"
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ display: 'block', textAlign: 'center', fontSize: '0.85rem', textDecoration: 'none', padding: '10px' }}
          >
            💳 Bayar Perpanjang
          </a>
        </div>
      </div>

      {profile ? (
        <div className="glass-card animate-fade">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div className="label">Nomor HP</div>
              <div className="value">{profile.number}</div>
            </div>
            <div>
              <div className="label">Tipe Akun</div>
              <div className="value">{profile.subscription_type}</div>
            </div>
            <div>
              <div className="label">Pulsa Terkini</div>
              <div className="value" style={{ color: 'var(--accent)' }}>Rp {profile.balance?.toLocaleString() || 0}</div>
            </div>
            <div>
              <div className="label">Masa Aktif</div>
              <div className="value">{new Date(profile.balance_expired_at * 1000).toLocaleDateString()}</div>
            </div>
          </div>
          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <div className="label">Loyalty Info</div>
            <div className="value" style={{ fontSize: '0.9rem' }}>{profile.point_info}</div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <p>Belum ada akun yang aktif.</p>
          <button className="btn-primary" style={{ marginTop: '20px', width: '100%' }}>Login Sekarang</button>
        </div>
      )}

      <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Link href="/packages" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📦</div>
            <div className="value" style={{ fontSize: '0.9rem' }}>Paket Saya</div>
          </div>
        </Link>
        <Link href="/purchase" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔥</div>
            <div className="value" style={{ fontSize: '0.9rem' }}>Beli Paket</div>
          </div>
        </Link>
      </div>

      <div style={{ marginTop: '16px' }}>
        <Link href="/account" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ cursor: 'pointer', textAlign: 'center' }}>
            <div className="value" style={{ fontSize: '0.9rem' }}>Ganti Akun / Login</div>
          </div>
        </Link>
      </div>
    </main>
  );
}
