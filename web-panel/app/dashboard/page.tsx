"use client";
import { useState } from "react";

const NAV_ITEMS = [
  {
    id: "home",
    label: "Ana Sayfa",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: "opportunities",
    label: "Fırsatlarım",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Ayarlar",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
];

const STATS = [
  { label: "Aktif Fırsatlar", value: "0", color: "#f97316", bg: "#fff7ed" },
  { label: "Bugünkü Satış", value: "₺0", color: "#1e3a5f", bg: "#eff6ff" },
  { label: "Toplam Müşteri", value: "0", color: "#059669", bg: "#ecfdf5" },
];

export default function Dashboard() {
  const [active, setActive] = useState("opportunities");

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f0f4f9", minHeight: "100vh", display: "flex" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: "#0f2644",
        display: "flex",
        flexDirection: "column",
        padding: "0",
        boxShadow: "4px 0 24px rgba(15,38,68,0.18)",
        position: "relative",
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(249,115,22,0.4)",
              fontWeight: 800, color: "#fff", fontSize: 16,
            }}>F</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>FIRSAT</div>
              <div style={{ color: "#f97316", fontWeight: 800, fontSize: 13, letterSpacing: "3px", marginTop: -2 }}>23</div>
            </div>
          </div>
        </div>

        {/* User info */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "linear-gradient(135deg, #f97316 0%, #1e3a5f 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: 15,
          }}>E</div>
          <div>
            <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>Esnaf Hesabı</div>
            <div style={{ color: "#64748b", fontSize: 11 }}>Elazığ Merkez</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px" }}>
          <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", padding: "0 8px 8px", textTransform: "uppercase" }}>MENÜ</div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, marginBottom: 4,
                background: active === item.id ? "rgba(249,115,22,0.12)" : "transparent",
                border: active === item.id ? "1px solid rgba(249,115,22,0.2)" : "1px solid transparent",
                color: active === item.id ? "#f97316" : "#94a3b8",
                cursor: "pointer", transition: "all 0.18s", textAlign: "left",
                fontWeight: active === item.id ? 600 : 400, fontSize: 14,
              }}
            >
              {item.icon}
              {item.label}
              {active === item.id && (
                <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#f97316" }} />
              )}
            </button>
          ))}
        </nav>

        {/* Bottom badge */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{
            background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)",
            borderRadius: 8, padding: "10px 12px",
          }}>
            <div style={{ color: "#f97316", fontSize: 11, fontWeight: 700 }}>BETA SÜRÜM</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>Elazığ MVP v1.0</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
        <header style={{
          background: "#fff", borderBottom: "1px solid #e2e8f0",
          padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#0f2644" }}>Aktif Fırsatlarım</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>Bugün, {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
          <button style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px",
            fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 4px 12px rgba(249,115,22,0.3)",
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Yeni Fırsat Ekle
          </button>
        </header>

        <div style={{ padding: "28px 32px", flex: 1 }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
            {STATS.map((s) => (
              <div key={s.label} style={{
                background: "#fff", borderRadius: 12, padding: "20px 24px",
                border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: s.bg, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: s.color, opacity: 0.8 }} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0f2644" }}>Fırsat Listesi</div>
              <div style={{
                background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6,
                padding: "6px 12px", fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6,
              }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Ara...
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Başlık", "Normal Fiyat", "İndirimli Fiyat", "Kalan Stok", "Bitiş", "Durum", "İşlem"].map((h) => (
                    <th key={h} style={{
                      padding: "12px 20px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, color: "#64748b",
                      letterSpacing: "0.5px", textTransform: "uppercase",
                      borderBottom: "1px solid #f1f5f9",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Empty state */}
                <tr>
                  <td colSpan={7} style={{ padding: "60px 20px", textAlign: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: "linear-gradient(135deg, #fff7ed, #fef3c7)",
                        border: "2px dashed #fed7aa",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24,
                      }}>🏷️</div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "#0f2644" }}>Henüz fırsat eklenmedi</div>
                      <div style={{ fontSize: 13, color: "#94a3b8", maxWidth: 280 }}>
                        İlk fırsatınızı ekleyerek atıl kapasitenizi öğrencilere sunmaya başlayın.
                      </div>
                      <button style={{
                        background: "linear-gradient(135deg, #f97316, #ea580c)",
                        color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px",
                        fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 4,
                        boxShadow: "0 4px 12px rgba(249,115,22,0.25)",
                      }}>+ İlk Fırsatı Ekle</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}