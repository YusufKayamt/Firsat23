"use client";

import { useState, useEffect } from "react";
import { createClient } from "./utils/supabase/client";

const supabase = createClient();

export default function HomePage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<{baslik: string, kod: string, bitis: string} | null>(null);
  const [now, setNow] = useState(Date.now()); 

  const [currentCustomer, setCurrentCustomer] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ ad_soyad: "", telefon: "", sifre: "" });
  const [authError, setAuthError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // YENİ: Müşteri Profili Modal State'leri
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);

  const fetchPublicData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const { data, error } = await supabase.from("opportunities").select("*").eq("aktif_mi", true).order("olusturma_zamani", { ascending: false });
      if (error) throw error;
      setOpportunities(data || []);
    } catch (e) { console.error("Vitrin hatası:", e); } 
    finally { if (!isSilent) setLoading(false); }
  };

  // YENİ: Müşterinin aldığı kodları veritabanından çeker
  const fetchMyOrders = async () => {
    if (!currentCustomer) return;
    try {
      const { data } = await supabase.from("siparisler").select("*, opportunities(baslik, dukkan_adi)").eq("musteri_id", currentCustomer.id).order("olusturma_zamani", { ascending: false });
      setMyOrders(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchPublicData();
    const savedCustomer = localStorage.getItem("firsatgo_musteri");
    if (savedCustomer) setCurrentCustomer(JSON.parse(savedCustomer));

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Profil modalı açılınca kodları çek
  useEffect(() => {
    if (showProfileModal) fetchMyOrders();
  }, [showProfileModal]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      let loggedInUser = null;
      if (authMode === 'register') {
        const { data, error } = await supabase.from("musteriler").insert([{ ad_soyad: authForm.ad_soyad, telefon: authForm.telefon, sifre: authForm.sifre }]).select();
        if (error) throw new Error("Bu numara zaten kayıtlı!");
        loggedInUser = data[0];
      } else {
        const { data, error } = await supabase.from("musteriler").select("*").eq("telefon", authForm.telefon).eq("sifre", authForm.sifre).single();
        if (error || !data) throw new Error("Telefon veya şifre hatalı!");
        loggedInUser = data;
      }
      
      setCurrentCustomer(loggedInUser);
      if (rememberMe) localStorage.setItem("firsatgo_musteri", JSON.stringify(loggedInUser));
      else localStorage.removeItem("firsatgo_musteri");
      
      setShowAuthModal(false);
    } catch (err: any) { setAuthError(err.message); }
  };

  const handleLogout = () => {
    localStorage.removeItem("firsatgo_musteri");
    setCurrentCustomer(null);
    setShowProfileModal(false); // Çıkış yapınca profili kapat
  };

  const handleYakala = async (opp: any) => {
    if (!currentCustomer) {
      setShowAuthModal(true);
      return;
    }

    if (opp.kalan_stok <= 0) return;
    setProcessingId(opp.id);

    try {
      // YENİ KOTA KONTROLÜ: Müşteri bu fırsattan daha önce kaç tane kod almış? (İptal edilenler hariç)
      const limit = opp.kisi_basi_limit || 1;
      const { data: userOrders } = await supabase.from("siparisler")
        .select("id")
        .eq("musteri_id", currentCustomer.id)
        .eq("firsat_id", opp.id)
        .neq("durum", "iptal");

      if (userOrders && userOrders.length >= limit) {
        alert(`Bu fırsattan kişi başı en fazla ${limit} adet yararlanabilirsiniz!`);
        setProcessingId(null);
        return;
      }

      // KOTA AŞILMADIYSA DEVAM ET
      const yeniStok = opp.kalan_stok - 1;
      const { error: updateError } = await supabase.from("opportunities").update({ kalan_stok: yeniStok }).eq("id", opp.id);
      if (updateError) throw updateError;

      const rastgeleKod = "FRS-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      const sonKullanma = new Date(Date.now() + 15 * 60 * 1000).toISOString(); 

      const { error: siparisError } = await supabase.from("siparisler").insert([{ 
        firsat_id: opp.id, 
        kod: rastgeleKod, 
        son_kullanma_zamani: sonKullanma,
        durum: 'bekliyor',
        musteri_id: currentCustomer.id 
      }]);
      if (siparisError) throw siparisError;

      setOpportunities((mevcut) => mevcut.map((item) => item.id === opp.id ? { ...item, kalan_stok: yeniStok } : item));
      setSuccessCode({ baslik: opp.baslik, kod: rastgeleKod, bitis: sonKullanma });
    } catch (error) {
      alert("Fırsat yakalanamadı, internetini kontrol et.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative pb-24">
      
      <div className="bg-orange-500 p-8 pb-20 rounded-b-[50px] shadow-2xl shadow-orange-100 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        
        {/* ÜST BAR (Giriş Yap / Profil) */}
        <div className="absolute top-4 right-6 z-20">
          {currentCustomer ? (
            // YENİ: Profile Tıklanabilir Yapı
            <div onClick={() => setShowProfileModal(true)} className="flex flex-col items-end bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-white cursor-pointer hover:bg-white/20 transition-all shadow-lg">
              <span className="text-sm font-black text-white flex items-center gap-2">{currentCustomer.ad_soyad} 👤</span>
              <span className="text-[10px] uppercase font-bold text-orange-200">Kodlarım & Profil</span>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="bg-white text-orange-600 font-black px-5 py-2.5 rounded-2xl shadow-lg hover:scale-105 transition-transform text-sm">GİRİŞ YAP</button>
          )}
        </div>

        <div className="flex flex-col items-center justify-center mt-6">
          <div className="relative z-10 w-24 h-24 mb-4 bg-white rounded-full p-2 shadow-xl flex items-center justify-center">
              <img src="/icon.png" alt="FırsatGo Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2 relative z-10">FIRSAT 23</h1>
          <p className="text-orange-100 font-bold uppercase tracking-widest text-xs relative z-10">Elazığ'ın Anlık İndirim Vitrini</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 -mt-12 space-y-8">
        {loading ? (
          <div className="bg-white p-10 rounded-[40px] text-center font-black text-slate-300 animate-pulse italic">VİTRİN HAZIRLANIYOR...</div>
        ) : opportunities.length === 0 ? (
          <div className="bg-white p-10 rounded-[40px] text-center shadow-sm border border-slate-100 font-bold text-slate-400">Şu an aktif fırsat yok. Esnafın fırını yakmasını bekliyoruz! 🥨</div>
        ) : (
          opportunities.map((opp) => {
            const bitis = new Date(opp.bitis_zamani).getTime();
            const kalanMilisaniye = bitis - now;
            const sureDoldu = kalanMilisaniye <= 0;
            const tukendiMi = opp.kalan_stok <= 0 || sureDoldu;
            const yuzdeKalan = (opp.kalan_stok / opp.toplam_stok) * 5;

            const saat = Math.floor(Math.max(0, kalanMilisaniye) / (1000 * 60 * 60));
            const dakika = Math.floor((Math.max(0, kalanMilisaniye) % (1000 * 60 * 60)) / (1000 * 60));
            const saniye = Math.floor((Math.max(0, kalanMilisaniye) % (1000 * 60)) / 1000);
            const zamanMetni = sureDoldu ? "SÜRE BİTTİ" : `${saat.toString().padStart(2, '0')}:${dakika.toString().padStart(2, '0')}:${saniye.toString().padStart(2, '0')}`;

            return (
              <div key={opp.id} className={`bg-white rounded-[40px] shadow-xl overflow-hidden border-2 transition-all duration-300 ${tukendiMi ? 'border-slate-100 opacity-75' : 'border-white hover:-translate-y-1 shadow-slate-200/50'}`}>
                {opp.foto_url && (
                  <div className="w-full h-56 bg-slate-100 relative overflow-hidden">
                    <img src={opp.foto_url} alt={opp.baslik} className={`w-full h-full object-cover transition-transform duration-700 hover:scale-110 ${tukendiMi ? 'grayscale' : ''}`} />
                    <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 border border-white/20 shadow-xl">
                      <span className={`${sureDoldu ? 'text-red-500' : 'text-orange-400 animate-pulse'}`}>⏳</span>
                      <span className="tracking-widest font-mono">{zamanMetni}</span>
                    </div>
                    {tukendiMi && (
                      <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center backdrop-blur-sm">
                        <span className="bg-white text-slate-900 font-black text-xl px-6 py-2 rounded-full tracking-widest uppercase shadow-2xl transform -rotate-12 border-4 border-white">{sureDoldu ? 'SÜRE DOLDU' : 'TÜKENDİ'}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-8 relative">
                  {!opp.foto_url && (
                    <div className="absolute top-6 right-8 bg-slate-100 text-slate-800 font-black px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
                      <span className={`${sureDoldu ? 'text-red-500' : 'text-orange-500 animate-pulse'}`}>⏳</span>
                      <span className="tracking-widest font-mono">{zamanMetni}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4 pr-24">
                    <span className="bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">
                      {opp.dukkan_adi || "FırsatGo Esnafı"}
                    </span>
                  </div>
                  <h3 className={`text-2xl font-black leading-tight mb-4 ${tukendiMi ? 'text-slate-400' : 'text-slate-800'}`}>{opp.baslik}</h3>
                  <div className="flex items-center gap-4 mb-6">
                    <span className={`font-black text-4xl ${tukendiMi ? 'text-slate-400' : 'text-orange-600'}`}>{opp.indirimli_fiyat} ₺</span>
                    <span className="text-slate-300 line-through text-lg font-bold">{opp.normal_fiyat} ₺</span>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tukendiMi ? 'STOK BİTTİ' : `KALAN STOK: ${opp.kalan_stok}`}</p>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (<div key={i} className={`h-1.5 w-6 rounded-full ${tukendiMi ? 'bg-slate-200' : (i < yuzdeKalan ? 'bg-emerald-500' : 'bg-slate-100')}`}></div>))}
                      </div>
                    </div>
                    <button onClick={() => handleYakala(opp)} disabled={tukendiMi || processingId === opp.id} className={`px-6 py-3 rounded-2xl font-black text-xs tracking-tighter transition-all ${tukendiMi ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : processingId === opp.id ? 'bg-orange-300 text-white animate-pulse' : 'bg-slate-900 text-white hover:bg-orange-600 shadow-lg shadow-slate-200 active:scale-95'}`}>
                      {processingId === opp.id ? 'BEKLEYİN...' : sureDoldu ? 'SÜRE BİTTİ' : tukendiMi ? 'TÜKENDİ' : 'FIRSATI YAKALA'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* YENİ: MÜŞTERİ PROFİLİ (KODLARIM) MODALI */}
      {showProfileModal && currentCustomer && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-xl font-black uppercase tracking-tight">Profil & Cüzdan</h3>
              <button onClick={() => setShowProfileModal(false)} className="bg-white/10 w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20">✕</button>
            </div>
            
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-2">{currentCustomer.ad_soyad.charAt(0)}</div>
              <h2 className="text-xl font-black text-center text-slate-800">{currentCustomer.ad_soyad}</h2>
              <p className="text-center text-slate-400 font-mono text-sm">{currentCustomer.telefon}</p>
              <button onClick={handleLogout} className="mt-4 w-full bg-red-50 text-red-600 font-black py-2 rounded-xl text-xs hover:bg-red-500 hover:text-white transition-colors">HESAPTAN ÇIKIŞ YAP</button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white flex-1">
              <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs mb-4">Aldığım Kodlar</h4>
              {myOrders.length === 0 ? (
                <div className="text-center text-slate-400 py-10 font-medium">Henüz hiç indirim kodu almadınız.</div>
              ) : (
                myOrders.map(order => {
                  const siparisBitis = new Date(order.son_kullanma_zamani).getTime();
                  const kalanSaniye = Math.floor((siparisBitis - now) / 1000);
                  const siparisSuresiDoldu = kalanSaniye <= 0;
                  const dk = Math.floor(Math.max(0, kalanSaniye) / 60).toString().padStart(2, '0');
                  const sn = (Math.max(0, kalanSaniye) % 60).toString().padStart(2, '0');

                  let durumGorunumu = "";
                  if (order.durum === 'kullanildi') durumGorunumu = "bg-emerald-50 border-emerald-200 opacity-60";
                  else if (order.durum === 'iptal' || siparisSuresiDoldu) durumGorunumu = "bg-red-50 border-red-100 opacity-60";
                  else durumGorunumu = "bg-orange-50 border-orange-300 shadow-md";

                  return (
                    <div key={order.id} className={`border-2 rounded-3xl p-5 relative overflow-hidden transition-all ${durumGorunumu}`}>
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-black text-slate-500 uppercase">{order.opportunities?.dukkan_adi}</p>
                        
                        {/* DURUM ROZETİ */}
                        {order.durum === 'kullanildi' ? (
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">KULLANILDI ✔️</span>
                        ) : order.durum === 'iptal' || siparisSuresiDoldu ? (
                          <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-1 rounded-md">SÜRE DOLDU ❌</span>
                        ) : (
                          <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-2 py-1 rounded-md flex items-center gap-1">
                            <span className="animate-pulse">⏳</span> KALAN: {dk}:{sn}
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-bold text-slate-800 text-sm mb-3">{order.opportunities?.baslik}</h4>
                      
                      <div className="bg-white/80 border border-slate-200 rounded-2xl p-3 text-center">
                         <span className={`text-2xl font-black tracking-widest ${order.durum === 'bekliyor' && !siparisSuresiDoldu ? 'text-orange-600' : 'text-slate-400 line-through'}`}>{order.kod}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MÜŞTERİ GİRİŞ MODALI */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 text-xl font-bold">✕</button>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Fırsatı Kaçırma!</h2>
              <p className="text-slate-500 text-sm mt-1">İndirimi yakalamak için giriş yapın.</p>
            </div>
            <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
              <button onClick={() => {setAuthMode('login'); setAuthError("");}} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${authMode === 'login' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Giriş Yap</button>
              <button onClick={() => {setAuthMode('register'); setAuthError("");}} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${authMode === 'register' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Kayıt Ol</button>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <input required placeholder="Adınız Soyadınız" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-orange-500 transition-all" value={authForm.ad_soyad} onChange={(e) => setAuthForm({...authForm, ad_soyad: e.target.value})} />
              )}
              <input required type="tel" placeholder="Telefon Numarası" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-orange-500 transition-all" value={authForm.telefon} onChange={(e) => setAuthForm({...authForm, telefon: e.target.value})} />
              <input required type="password" placeholder="Şifre" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-orange-500 transition-all" value={authForm.sifre} onChange={(e) => setAuthForm({...authForm, sifre: e.target.value})} />
              <div className="flex items-center gap-2 px-2 py-1">
                <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500" />
                <label htmlFor="rememberMe" className="text-sm font-bold text-slate-500">Beni Hatırla</label>
              </div>
              {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
              <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-[24px] shadow-xl text-lg hover:bg-orange-500 transition-all active:scale-95 mt-2">
                {authMode === 'login' ? 'GİRİŞ YAP' : 'HESAP OLUŞTUR'}
              </button>
            </form>
          </div>
        </div>
      )}

      {successCode && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm text-center shadow-2xl">
            {(() => {
              const kalanSureSaniye = Math.floor((new Date(successCode.bitis).getTime() - now) / 1000);
              const kodSureDoldu = kalanSureSaniye <= 0;
              const dk = Math.floor(Math.max(0, kalanSureSaniye) / 60).toString().padStart(2, '0');
              const sn = (Math.max(0, kalanSureSaniye) % 60).toString().padStart(2, '0');

              return (
                <>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl ${kodSureDoldu ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'}`}>
                    {kodSureDoldu ? '⏰' : '🎉'}
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2">Fırsatı Kaptın!</h2>
                  {kodSureDoldu ? (
                    <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 mb-6">
                      <p className="text-red-600 font-black text-lg mb-2">SÜRENİZ DOLDU!</p>
                      <p className="text-red-500 text-sm font-medium">Bu kodun geçerlilik süresi bittiği için geçersiz sayılmıştır.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-500 font-medium mb-4"><strong className="text-slate-800">{successCode.baslik}</strong> için kodun hazır. Kasada bu kodu göster:</p>
                      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-6 mb-4">
                        <span className="text-4xl font-black text-orange-600 tracking-widest">{successCode.kod}</span>
                      </div>
                      <div className="bg-orange-50 text-orange-600 font-black px-4 py-3 rounded-2xl flex items-center justify-center gap-2 mb-6">
                        <span className="animate-pulse">⏳</span> Geçerlilik Süresi: {dk}:{sn}
                      </div>
                    </>
                  )}
                  <button onClick={() => setSuccessCode(null)} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-colors">KAPAT VE VİTRİNE DÖN</button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-xl border border-white p-4 rounded-[32px] shadow-2xl flex justify-around items-center z-40">
        <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-orange-500 font-black text-xs uppercase tracking-widest flex flex-col items-center gap-1"><span className="text-lg">🏪</span> Vitrin</button>
        <div className="w-px h-6 bg-slate-200"></div>
        <button onClick={() => window.location.href='/dashboard'} className="text-slate-400 font-black text-xs uppercase tracking-widest flex flex-col items-center gap-1 hover:text-slate-600 transition-colors"><span className="text-lg opacity-50">⚙️</span> Esnaf</button>
      </div>
    </div>
  );
}