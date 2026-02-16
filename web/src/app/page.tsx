"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="gradient-text" style={{ fontSize: '2rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <main style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>MYnyak Engsel Sunset</h1>
        <div className="status-badge status-active">Online</div>
      </header>

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
