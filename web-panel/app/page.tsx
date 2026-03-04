"use client";

import { useState, useEffect } from "react";
import { createClient } from "./utils/supabase/client";

const supabase = createClient();

export default function HomePage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<{baslik: string, kod: string} | null>(null);

  const fetchPublicData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, shops(dukkan_adi)")
        .eq("aktif_mi", true)
        .order("olusturma_zamani", { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (e) {
      console.error("Vitrin hatası:", e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicData();
    const handleVisibility = () => fetchPublicData(true);
    window.addEventListener("focus", handleVisibility);
    window.addEventListener("pageshow", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleVisibility);
      window.removeEventListener("pageshow", handleVisibility);
    };
  }, []);

  const handleYakala = async (opp: any) => {
    if (opp.kalan_stok <= 0) return;
    setProcessingId(opp.id);
    const yeniStok = opp.kalan_stok - 1;

    try {
      // 1. Stoğu düşür
      const { error: updateError } = await supabase.from("opportunities").update({ kalan_stok: yeniStok }).eq("id", opp.id);
      if (updateError) throw updateError;

      // 2. Kodu üret
      const rastgeleKod = "FRS-" + Math.random().toString(36).substring(2, 6).toUpperCase();

      // 3. YENİLİK: Üretilen kodu ve hangi fırsata ait olduğunu "siparisler" defterine yaz!
      const { error: siparisError } = await supabase.from("siparisler").insert([{
        firsat_id: opp.id,
        kod: rastgeleKod
      }]);
      if (siparisError) throw siparisError;

      // 4. Ekranı güncelle ve müşteriye kodu göster
      setOpportunities((mevcut) => mevcut.map((item) => item.id === opp.id ? { ...item, kalan_stok: yeniStok } : item));
      setSuccessCode({ baslik: opp.baslik, kod: rastgeleKod });
    } catch (error) {
      console.error(error);
      alert("Fırsat yakalanamadı, internetini kontrol et.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative pb-24">
      <div className="bg-orange-500 p-8 pb-20 rounded-b-[50px] shadow-2xl shadow-orange-100 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2 relative z-10">FIRSAT 23</h1>
        <p className="text-orange-100 font-bold uppercase tracking-widest text-xs relative z-10">Elazığ'ın Anlık İndirim Vitrini</p>
      </div>

      <div className="max-w-xl mx-auto px-6 -mt-12 space-y-8">
        {loading ? (
          <div className="bg-white p-10 rounded-[40px] text-center font-black text-slate-300 animate-pulse italic">
            VİTRİN HAZIRLANIYOR...
          </div>
        ) : opportunities.length === 0 ? (
          <div className="bg-white p-10 rounded-[40px] text-center shadow-sm border border-slate-100 font-bold text-slate-400">
            Şu an aktif fırsat yok. Esnafın fırını yakmasını bekliyoruz! 🥨
          </div>
        ) : (
          opportunities.map((opp) => {
            const tukendiMi = opp.kalan_stok <= 0;
            const yuzdeKalan = (opp.kalan_stok / opp.toplam_stok) * 5;

            return (
              <div key={opp.id} className={`bg-white rounded-[40px] shadow-xl overflow-hidden border-2 transition-all duration-300 ${tukendiMi ? 'border-slate-100 opacity-75' : 'border-white hover:-translate-y-1 shadow-slate-200/50'}`}>
                
                {opp.foto_url && (
                  <div className="w-full h-56 bg-slate-100 relative overflow-hidden">
                    <img 
                      src={opp.foto_url} 
                      alt={opp.baslik} 
                      className={`w-full h-full object-cover transition-transform duration-700 hover:scale-110 ${tukendiMi ? 'grayscale' : ''}`} 
                    />
                    {tukendiMi && (
                      <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center backdrop-blur-sm">
                        <span className="bg-white text-slate-900 font-black text-xl px-6 py-2 rounded-full tracking-widest uppercase shadow-2xl transform -rotate-12 border-4 border-white">TÜKENDİ</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">
                      {opp.shops?.dukkan_adi || "Merkez Esnafı"}
                    </span>
                    <div className="text-right flex-shrink-0 ml-4">
                      <span className="text-slate-300 line-through text-sm block font-bold">{opp.normal_fiyat} ₺</span>
                      <span className={`font-black text-3xl ${tukendiMi ? 'text-slate-400' : 'text-orange-600'}`}>{opp.indirimli_fiyat} ₺</span>
                    </div>
                  </div>
                  
                  <h3 className={`text-2xl font-black leading-tight mb-6 ${tukendiMi ? 'text-slate-400' : 'text-slate-800'}`}>
                    {opp.baslik}
                  </h3>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {tukendiMi ? 'STOK BİTTİ' : `KALAN STOK: ${opp.kalan_stok}`}
                      </p>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`h-1.5 w-6 rounded-full ${tukendiMi ? 'bg-slate-200' : (i < yuzdeKalan ? 'bg-emerald-500' : 'bg-slate-100')}`}></div>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleYakala(opp)}
                      disabled={tukendiMi || processingId === opp.id}
                      className={`px-6 py-3 rounded-2xl font-black text-xs tracking-tighter transition-all ${
                        tukendiMi 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : processingId === opp.id
                            ? 'bg-orange-300 text-white animate-pulse'
                            : 'bg-slate-900 text-white hover:bg-orange-600 shadow-lg shadow-slate-200 active:scale-95'
                      }`}
                    >
                      {processingId === opp.id ? 'BEKLEYİN...' : tukendiMi ? 'TÜKENDİ' : 'FIRSATI YAKALA'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {successCode && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🎉</div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Fırsatı Kaptın!</h2>
            <p className="text-slate-500 font-medium mb-6">
              <strong className="text-slate-800">{successCode.baslik}</strong> için kodun hazır. Kasada bu kodu göster:
            </p>
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-6 mb-6">
              <span className="text-4xl font-black text-orange-600 tracking-widest">{successCode.kod}</span>
            </div>
            <button onClick={() => setSuccessCode(null)} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-colors">
              KAPAT VE VİTRİNE DÖN
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-xl border border-white p-4 rounded-[32px] shadow-2xl flex justify-around items-center z-40">
        <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-orange-500 font-black text-xs uppercase tracking-widest flex flex-col items-center gap-1">
          <span className="text-lg">🏪</span> Vitrin
        </button>
        <div className="w-px h-6 bg-slate-200"></div>
        <button onClick={() => window.location.href='/dashboard'} className="text-slate-400 font-black text-xs uppercase tracking-widest flex flex-col items-center gap-1 hover:text-slate-600 transition-colors">
          <span className="text-lg opacity-50">⚙️</span> Esnaf
        </button>
      </div>
    </div>
  );
}