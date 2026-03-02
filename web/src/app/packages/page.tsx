"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PackagesPage() {
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/packages/my")
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") {
                    setPackages(data.data.quotas || []);
                }
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
                <div className="gradient-text" style={{ fontSize: '2rem' }}>Loading Packages...</div>
            </div>
        );
    }

    return (
        <main style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/" className="glass-card" style={{ padding: '10px 15px', borderRadius: '12px', textDecoration: 'none', color: 'white' }}>
                    ←
                </Link>
                <h1 className="gradient-text" style={{ fontSize: '1.5rem' }}>Paket Saya</h1>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {packages.length > 0 ? (
                    packages.map((pkg, idx) => (
                        <div key={idx} className="glass-card animate-fade" style={{ animationDelay: `${idx * 0.1}s`, padding: '20px' }}>
                            {/* Header: Nama Paket & Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
                                {pkg.icon && (
                                    <img
                                        src={pkg.icon}
                                        alt=""
                                        style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', padding: '4px' }}
                                    />
                                )}
                                <div style={{ flex: 1 }}>
                                    <div className="gradient-text" style={{ fontSize: '1.2rem', marginBottom: '4px', display: 'block' }}>
                                        {pkg.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>
                                        {pkg.group_name}
                                    </div>
                                </div>
                                <div className="status-badge status-active" style={{ fontSize: '0.65rem' }}>AKTIF</div>
                            </div>

                            {/* Divider Tipis */}
                            <div style={{ height: '1px', background: 'linear-gradient(90deg, var(--glass-border), transparent)', marginBottom: '20px' }}></div>

                            {/* Benefit / Kuota List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                {pkg.benefits?.map((benefit: any, bIdx: number) => {
                                    const percentage = benefit.total > 0 ? (benefit.remaining / benefit.total) * 100 : 0;
                                    return (
                                        <div key={bIdx}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                {benefit.icon && (
                                                    <img src={benefit.icon} alt="" style={{ width: '20px', height: '20px', marginTop: '2px', objectFit: 'contain' }} />
                                                )}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>
                                                            {benefit.name}
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <span style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold' }}>{benefit.remaining_str}</span>
                                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>/ {benefit.total_str}</span>
                                                        </div>
                                                    </div>
                                                    {/* Progress Bar Container */}
                                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginTop: '8px' }}>
                                                        <div
                                                            style={{
                                                                width: `${percentage}%`,
                                                                height: '100%',
                                                                background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                                                                borderRadius: '10px',
                                                                transition: 'width 1s ease-out'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!pkg.benefits || pkg.benefits.length === 0) && (
                                    <div className="label" style={{ fontSize: '0.8rem', textAlign: 'center', opacity: 0.5 }}>Tidak ada detail kuota</div>
                                )}
                            </div>

                            {/* Footer Area: Expiry Date */}
                            {pkg.expired_at && (
                                <div style={{
                                    marginTop: '24px',
                                    padding: '10px 14px',
                                    background: 'rgba(255,204,0,0.05)',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,204,0,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <div style={{ fontSize: '0.75rem', color: '#ffcc00', fontWeight: '600' }}>
                                        Berakhir pada: <span style={{ color: 'white' }}>{new Date(pkg.expired_at * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📭</div>
                        <p style={{ opacity: 0.6 }}>Tidak ada paket aktif yang ditemukan.</p>
                        <Link href="/purchase" className="btn-primary" style={{ marginTop: '24px', display: 'inline-block', textDecoration: 'none' }}>Beli Paket Sekarang</Link>
                    </div>
                )}
            </div>
        </main>
    );
}
