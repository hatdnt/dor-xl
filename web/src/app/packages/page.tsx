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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {packages.length > 0 ? (
                    packages.map((pkg, idx) => (
                        <div key={idx} className="glass-card animate-fade" style={{ animationDelay: `${idx * 0.1}s`, marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                <div>
                                    <div className="value" style={{ fontSize: '1rem', color: 'white' }}>{pkg.name}</div>
                                    <div className="label" style={{ fontSize: '0.75rem' }}>{pkg.group_name}</div>
                                </div>
                                <div className="status-badge status-active">Aktif</div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
                                {pkg.benefits?.map((benefit: any, bIdx: number) => (
                                    <div key={bIdx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: bIdx < pkg.benefits.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: '4px' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{benefit.name}</div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold' }}>{benefit.remaining_str}</div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>dari {benefit.total_str}</div>
                                        </div>
                                    </div>
                                ))}
                                {(!pkg.benefits || pkg.benefits.length === 0) && (
                                    <div className="label" style={{ fontSize: '0.8rem', textAlign: 'center' }}>Tidak ada detail kuota</div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                        <p>Tidak ada paket aktif yang ditemukan.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
