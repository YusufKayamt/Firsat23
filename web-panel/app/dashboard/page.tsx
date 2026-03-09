"use client";

import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";

const supabase = createClient();

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ dukkan_adi: "", telefon: "", sifre: "" });
  const [authError, setAuthError] = useState("");
  const [rememberMe, setRememberMe] = useState(true); // YENİ: Beni Hatırla state'i

  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ baslik: "", normal_fiyat: "", indirimli_fiyat: "", stok: "", foto_url: "", sure_saat: "24" });
  
  const [now, setNow] = useState(Date.now());

  // YENİ: Sayfa açıldığında hafızada esnaf var mı diye kontrol et
  useEffect(() => {
    const savedUser = localStorage.getItem("firsatgo_esnaf");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const { data: oppData, error: oppError } = await supabase.from("opportunities").select("*").eq("esnaf_id", currentUser.id).order("olusturma_zamani", { ascending: false });
      if (oppError) throw oppError;
      setOpportunities(oppData || []);

      const { data: orderData, error: orderError } = await supabase.from("siparisler").select("*, opportunities!inner(baslik, esnaf_id, kalan_stok)").eq("opportunities.esnaf_id", currentUser.id).order("olusturma_zamani", { ascending: false });
      if (orderError) throw orderError;
      setOrders(orderData || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (currentUser) fetchData();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [currentUser]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      let loggedInUser = null;
      if (authMode === 'register') {
        const { data, error } = await supabase.from("esnaflar").insert([{ dukkan_adi: authForm.dukkan_adi, telefon: authForm.telefon, sifre: authForm.sifre }]).select();
        if (error) throw new Error("Bu telefon numarası zaten kayıtlı olabilir!");
        loggedInUser = data[0];
      } else {
        const { data, error } = await supabase.from("esnaflar").select("*").eq("telefon", authForm.telefon).eq("sifre", authForm.sifre).single();
        if (error || !data) throw new Error("Telefon numarası veya şifre hatalı!");
        loggedInUser = data;
      }
      
      setCurrentUser(loggedInUser);
      // YENİ: Beni Hatırla seçiliyse tarayıcıya kaydet
      if (rememberMe) {
        localStorage.setItem("firsatgo_esnaf", JSON.stringify(loggedInUser));
      } else {
        localStorage.removeItem("firsatgo_esnaf");
      }

    } catch (err: any) { setAuthError(err.message); }
  };

  // YENİ: Çıkış yaparken hafızayı temizle
  const handleLogout = () => {
    localStorage.removeItem("firsatgo_esnaf");
    setCurrentUser(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      esnaf_id: currentUser.id,
      dukkan_adi: currentUser.dukkan_adi,
      baslik: formData.baslik,
      normal_fiyat: parseFloat(formData.normal_fiyat),
      indirimli_fiyat: parseFloat(formData.indirimli_fiyat),
      toplam_stok: parseInt(formData.stok),
      kalan_stok: parseInt(formData.stok),
      foto_url: formData.foto_url,
      bitis_zamani: new Date(Date.now() + parseFloat(formData.sure_saat) * 60 * 60 * 1000).toISOString(),
      aktif_mi: true
    };
    try {
      if (editingId) await supabase.from("opportunities").update(payload).eq("id", editingId);
      else await supabase.from("opportunities").insert([payload]);
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ baslik: "", normal_fiyat: "", indirimli_fiyat: "", stok: "", foto_url: "", sure_saat: "24" });
      fetchData();
    } catch (e) { alert("Hata oluştu!"); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bu fırsatı kalıcı olarak silmek istediğinize emin misiniz?")) {
      await supabase.from("opportunities").delete().eq("id", id);
      fetchData();
    }
  };

  const openEditModal = (opp: any) => {
    setEditingId(opp.id);
    setFormData({ baslik: opp.baslik, normal_fiyat: opp.normal_fiyat.toString(), indirimli_fiyat: opp.indirimli_fiyat.toString(), stok: opp.toplam_stok.toString(), foto_url: opp.foto_url || "", sure_saat: "24" });
    setIsModalOpen(true);
  };

  const handleApproveCode = async (orderId: string) => {
    if (confirm("Bu kodu onaylayıp satışı tamamlamak istiyor musunuz?")) {
      await supabase.from("siparisler").update({ durum: 'kullanildi' }).eq("id", orderId);
      fetchData();
    }
  };

  const handleCancelExpiredCode = async (orderId: string, firsatId: string, guncelKalanStok: number) => {
    if (confirm("Bu kodun süresi dolmuş. İptal edip ürünü tekrar vitrine (stoğa) eklemek istiyor musunuz?")) {
      try {
        await supabase.from("siparisler").update({ durum: 'iptal' }).eq("id", orderId);
        await supabase.from("opportunities").update({ kalan_stok: guncelKalanStok + 1 }).eq("id", firsatId);
        fetchData();
      } catch (e) { alert("İşlem sırasında hata oluştu!"); }
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 sm:p-10 rounded-[40px] w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="text-center mb-8">
            <img src="/icon.png" alt="Logo" className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full p-2" />
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">FırsatGo Esnaf</h2>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">İş Ortağı Portalı</p>
          </div>
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-8">
            <button onClick={() => {setAuthMode('login'); setAuthError("");}} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${authMode === 'login' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Giriş Yap</button>
            <button onClick={() => {setAuthMode('register'); setAuthError("");}} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${authMode === 'register' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Kayıt Ol</button>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <input required placeholder="Dükkan Adı (Örn: Has Fırın)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-orange-500 transition-all" value={authForm.dukkan_adi} onChange={(e) => setAuthForm({...authForm, dukkan_adi: e.target.value})} />
            )}
            <input required type="tel" placeholder="Telefon Numarası" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-orange-500 transition-all" value={authForm.telefon} onChange={(e) => setAuthForm({...authForm, telefon: e.target.value})} />
            <input required type="password" placeholder="Şifre" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-orange-500 transition-all" value={authForm.sifre} onChange={(e) => setAuthForm({...authForm, sifre: e.target.value})} />
            
            {/* YENİ: Beni Hatırla Kutucuğu */}
            <div className="flex items-center gap-2 px-2 py-1">
              <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"/>
              <label htmlFor="remember" className="text-sm font-bold text-slate-500">Beni Hatırla</label>
            </div>

            {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
            <button type="submit" className="w-full bg-orange-500 text-white font-black py-4 rounded-[24px] shadow-xl shadow-orange-100 text-lg hover:bg-orange-600 transition-all active:scale-95 mt-4">
              {authMode === 'login' ? 'GİRİŞ YAP' : 'HESAP OLUŞTUR'}
            </button>
          </form>
          <button onClick={() => window.location.href='/'} className="w-full text-center mt-6 text-slate-400 text-xs font-bold hover:text-slate-800 transition-colors">← Vitrine Dön</button>
        </div>
      </div>
    );
  }

  const bekleyenSiparisler = orders.filter(o => o.durum === 'bekliyor');
  const sureSecenekleri = [0.5, 1, 1.5, 2, 3, 5, 12, 24]; 

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-screen font-sans text-slate-900 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 bg-white p-6 sm:p-8 rounded-[40px] shadow-sm border border-slate-100 text-center sm:text-left">
        <div className="flex items-center gap-4 flex-col sm:flex-row">
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-2xl font-black">{currentUser.dukkan_adi.charAt(0)}</div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-800">{currentUser.dukkan_adi}</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Esnaf Yönetim Merkezi</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
          <button onClick={() => { setEditingId(null); setFormData({baslik:"", normal_fiyat:"", indirimli_fiyat:"", stok:"", foto_url:"", sure_saat:"24"}); setIsModalOpen(true); }} className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 transition-all active:scale-95 h-12 text-sm whitespace-nowrap">
            + YENİ FIRSAT
          </button>
          {/* ÇIKIŞ YAPILDIĞINDA HAFIZAYI TEMİZLE */}
          <button onClick={handleLogout} className="flex-none bg-slate-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-slate-800 transition-all h-12 text-sm whitespace-nowrap">ÇIKIŞ</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-black text-slate-800 ml-4 mb-4">Yayındaki Fırsatların</h2>
          {loading ? (
             <div className="py-20 text-center font-black text-slate-200 text-2xl animate-pulse">YÜKLENİYOR...</div>
          ) : opportunities.length === 0 ? (
            <div className="bg-white p-10 rounded-[40px] text-center font-bold text-slate-400 border border-slate-100">Henüz fırsat eklemedin. Müşteriler seni bekliyor!</div>
          ) : (
            opportunities.map((opp) => (
              <div key={opp.id} className="bg-white p-5 sm:p-6 rounded-[40px] shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 group hover:border-orange-200 transition-colors">
                <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {opp.foto_url ? <img src={opp.foto_url} alt={opp.baslik} className="w-full h-full object-cover" /> : <span className="text-3xl">📷</span>}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-800 uppercase leading-tight">{opp.baslik}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-orange-600 font-black text-lg">{opp.indirimli_fiyat} ₺</span>
                      <span className="text-slate-300 line-through font-bold text-xs">{opp.normal_fiyat} ₺</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-8 border-t sm:border-0 border-slate-100 pt-4 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Kalan Stok</p>
                    <p className="text-xl font-black text-slate-700">{opp.kalan_stok} / {opp.toplam_stok}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(opp)} className="bg-blue-50 text-blue-600 w-12 h-12 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm"><span className="text-lg">✎</span></button>
                    <button onClick={() => handleDelete(opp.id)} className="bg-red-50 text-red-600 w-12 h-12 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><span className="text-lg">🗑</span></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-black text-slate-800 ml-4 mb-4 flex items-center gap-2">Bekleyen Kodlar {bekleyenSiparisler.length > 0 && <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">{bekleyenSiparisler.length}</span>}</h2>
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-6">
            {bekleyenSiparisler.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold">Şu an bekleyen müşteri yok.</div>
            ) : (
              <div className="space-y-4">
                {bekleyenSiparisler.map((order) => {
                  const siparisBitis = new Date(order.son_kullanma_zamani).getTime();
                  const kalanSaniye = Math.floor((siparisBitis - now) / 1000);
                  const siparisSuresiDoldu = kalanSaniye <= 0;
                  const dk = Math.floor(Math.max(0, kalanSaniye) / 60).toString().padStart(2, '0');
                  const sn = (Math.max(0, kalanSaniye) % 60).toString().padStart(2, '0');

                  return (
                    <div key={order.id} className={`border rounded-3xl p-5 relative overflow-hidden group transition-all ${siparisSuresiDoldu ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className={`absolute top-0 left-0 w-1 h-full ${siparisSuresiDoldu ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{order.opportunities?.baslik}</p>
                        {siparisSuresiDoldu ? (
                          <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-1 rounded-md">SÜRESİ DOLDU</span>
                        ) : (
                          <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-2 py-1 rounded-md flex items-center gap-1">
                            <span className="animate-pulse">⏳</span> {dk}:{sn}
                          </span>
                        )}
                      </div>
                      <p className={`text-2xl font-black tracking-widest mb-4 ${siparisSuresiDoldu ? 'text-red-800/50 line-through' : 'text-slate-800'}`}>{order.kod}</p>
                      {siparisSuresiDoldu ? (
                        <button onClick={() => handleCancelExpiredCode(order.id, order.firsat_id, order.opportunities?.kalan_stok)} className="w-full bg-red-600 text-white font-black py-3 rounded-xl text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-200">
                          SİL & STOĞA GERİ EKLE 🔄
                        </button>
                      ) : (
                        <button onClick={() => handleApproveCode(order.id)} className="w-full bg-emerald-50 text-emerald-600 font-black py-3 rounded-xl text-sm hover:bg-emerald-500 hover:text-white transition-colors">
                          KODU ONAYLA ✔️
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-xl font-black uppercase tracking-tight">{editingId ? "Fırsatı Düzenle" : "Yeni Fırsat Ekle"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/10 w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20">✕</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <input required placeholder="Fırsat Başlığı (Örn: Gece Lahmacunu)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-orange-500 transition-all text-slate-800" value={formData.baslik} onChange={(e) => setFormData({...formData, baslik: e.target.value})} />
              <input placeholder="Fotoğraf Linki (İsteğe Bağlı)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-orange-500 transition-all text-slate-800" value={formData.foto_url} onChange={(e) => setFormData({...formData, foto_url: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" placeholder="Eski Fiyat (₺)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-orange-500 text-slate-800" value={formData.normal_fiyat} onChange={(e) => setFormData({...formData, normal_fiyat: e.target.value})} />
                <input required type="number" placeholder="Fırsat Fiyatı (₺)" className="w-full bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 font-black outline-none focus:border-orange-500 text-orange-600" value={formData.indirimli_fiyat} onChange={(e) => setFormData({...formData, indirimli_fiyat: e.target.value})} />
              </div>
              
              <input required type="number" placeholder="Toplam Stok Adedi" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-orange-500 text-slate-800" value={formData.stok} onChange={(e) => setFormData({...formData, stok: e.target.value})} />

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Fırsat Süresi Seçin</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {sureSecenekleri.map((val) => (
                    <button key={val} type="button" onClick={() => setFormData({...formData, sure_saat: val.toString()})} className={`flex-none px-5 py-3 rounded-2xl font-black text-sm transition-all border-2 ${formData.sure_saat === val.toString() ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white border-slate-100 text-slate-500 hover:border-orange-300'}`}>
                      {val === 0.5 ? "30 Dk" : val % 1 === 0 ? `${val} Saat` : `${Math.floor(val)} Saat 30 Dk`}
                    </button>
                  ))}
                </div>
              </div>
              
              <button type="button" onClick={handleSave} className="w-full bg-slate-900 text-white font-black py-5 rounded-[24px] shadow-xl text-lg hover:bg-slate-800 transition-all active:scale-95 mt-4">
                {editingId ? "GÜNCELLE ✅" : "YAYINLA 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}