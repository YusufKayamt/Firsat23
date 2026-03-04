"use client";

import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";

const supabase = createClient();
const TEST_SHOP_ID = "00000000-0000-0000-0000-000000000000";
const SECRET_PIN = "2323";

export default function DashboardPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [pinError, setPinError] = useState(false);

  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ baslik: "", normal_fiyat: "", indirimli_fiyat: "", stok: "", foto_url: "" });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: oppData, error: oppError } = await supabase.from("opportunities").select("*").order("olusturma_zamani", { ascending: false });
      if (oppError) throw oppError;
      setOpportunities(oppData || []);

      const { data: orderData, error: orderError } = await supabase.from("siparisler").select("*, opportunities(baslik)").order("olusturma_zamani", { ascending: false });
      if (orderError) throw orderError;
      setOrders(orderData || []);

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isUnlocked) fetchData();
  }, [isUnlocked]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode === SECRET_PIN) {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinCode("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      shop_id: TEST_SHOP_ID,
      baslik: formData.baslik,
      normal_fiyat: parseFloat(formData.normal_fiyat),
      indirimli_fiyat: parseFloat(formData.indirimli_fiyat),
      toplam_stok: parseInt(formData.stok),
      kalan_stok: parseInt(formData.stok),
      foto_url: formData.foto_url,
      bitis_zamani: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      aktif_mi: true
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("opportunities").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("opportunities").insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ baslik: "", normal_fiyat: "", indirimli_fiyat: "", stok: "", foto_url: "" });
      fetchData();
    } catch (e) { alert("Hata oluştu!"); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bu fırsatı silmek istediğine emin misin?")) {
      try {
        const { error } = await supabase.from("opportunities").delete().eq("id", id);
        if (error) throw error;
        fetchData();
      } catch (e) { alert("Silinemedi!"); }
    }
  };

  const openEditModal = (opp: any) => {
    setEditingId(opp.id);
    setFormData({ baslik: opp.baslik, normal_fiyat: opp.normal_fiyat.toString(), indirimli_fiyat: opp.indirimli_fiyat.toString(), stok: opp.toplam_stok.toString(), foto_url: opp.foto_url || "" });
    setIsModalOpen(true);
  };

  const handleApproveCode = async (orderId: string) => {
    if (confirm("Bu kodu onaylayıp satışı tamamlamak istiyor musunuz?")) {
      try {
        const { error } = await supabase.from("siparisler").update({ durum: 'kullanildi' }).eq("id", orderId);
        if (error) throw error;
        fetchData(); // Listeyi yenile
      } catch (e) {
        alert("Kod onaylanamadı!");
      }
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-[40px] w-full max-w-sm text-center shadow-2xl">
          <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🔒</div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Esnaf Girişi</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-8">Sadece Yetkililer</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" maxLength={4} placeholder="PIN" className={`w-full text-center tracking-[1em] text-2xl font-black bg-slate-50 border-2 rounded-3xl p-4 outline-none transition-all ${pinError ? 'border-red-500 text-red-500 bg-red-50' : 'border-slate-100 focus:border-orange-500'}`} value={pinCode} onChange={(e) => setPinCode(e.target.value)} />
            {pinError && <p className="text-red-500 text-xs font-bold uppercase">Hatalı Şifre!</p>}
            <button type="submit" className="w-full bg-orange-500 text-white font-black py-5 rounded-[25px] shadow-xl shadow-orange-100 text-lg hover:bg-orange-600 transition-all active:scale-95">KİLİDİ AÇ</button>
          </form>
          <button onClick={() => window.location.href='/'} className="mt-6 text-slate-400 text-xs font-bold hover:text-slate-800 transition-colors">← Vitrine Dön</button>
        </div>
      </div>
    );
  }

  const bekleyenSiparisler = orders.filter(o => o.durum === 'bekliyor');

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      
      {/* MOBİL UYUMLU TEPE KUTUSU */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 bg-white p-6 sm:p-8 rounded-[40px] shadow-sm border border-slate-100 text-center sm:text-left">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-800">Fırsat 23</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Esnaf Yönetim Merkezi</p>
        </div>
        <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => { setEditingId(null); setFormData({baslik:"", normal_fiyat:"", indirimli_fiyat:"", stok:"", foto_url:""}); setIsModalOpen(true); }} 
            className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 text-white px-2 sm:px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center h-12 text-xs sm:text-sm"
          >
            + YENİ FIRSAT
          </button>
          <button 
            onClick={() => setIsUnlocked(false)} 
            className="flex-none bg-slate-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-slate-800 transition-all whitespace-nowrap flex items-center justify-center h-12 text-xs sm:text-sm"
          >
            ÇIKIŞ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SOL TARAF: FIRSATLAR LİSTESİ */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-black text-slate-800 ml-4 mb-4">Yayındaki Fırsatlar</h2>
          {loading ? (
            <div className="py-20 text-center font-black text-slate-200 text-2xl animate-pulse uppercase">Yükleniyor...</div>
          ) : opportunities.length === 0 ? (
            <div className="bg-white p-10 rounded-[40px] text-center font-bold text-slate-400 border border-slate-100">Henüz fırsat eklemediniz.</div>
          ) : (
            opportunities.map((opp) => (
              <div key={opp.id} className="bg-white p-5 sm:p-6 rounded-[40px] shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 hover:shadow-md transition-shadow group">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left w-full sm:w-auto">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-slate-50">
                    {opp.foto_url ? (
                      <img src={opp.foto_url} alt={opp.baslik} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">📷</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{opp.baslik}</h3>
                    <div className="flex items-center justify-center sm:justify-start gap-4 mt-2">
                      <span className="text-orange-600 font-black text-lg">{opp.indirimli_fiyat} ₺</span>
                      <span className="text-slate-300 line-through font-bold text-xs">{opp.normal_fiyat} ₺</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-8 mt-2 sm:mt-0 border-t sm:border-0 border-slate-100 pt-4 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Kalan Stok</p>
                    <p className="text-xl font-black text-slate-700">{opp.kalan_stok} / {opp.toplam_stok}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(opp)} className="bg-blue-50 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">✎</button>
                    <button onClick={() => handleDelete(opp.id)} className="bg-red-50 text-red-600 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">🗑</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* SAĞ TARAF: BEKLEYEN KODLAR */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-slate-800 ml-4 mb-4 flex items-center gap-2">
            Bekleyen Kodlar 
            {bekleyenSiparisler.length > 0 && (
              <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">{bekleyenSiparisler.length}</span>
            )}
          </h2>
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-6">
            {bekleyenSiparisler.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold">
                <span className="text-4xl block mb-2">😴</span>
                Şu an bekleyen müşteri yok.
              </div>
            ) : (
              <div className="space-y-4">
                {bekleyenSiparisler.map((order) => (
                  <div key={order.id} className="bg-slate-50 border border-slate-100 rounded-3xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{order.opportunities?.baslik}</p>
                    <p className="text-2xl font-black text-slate-800 tracking-widest mb-4">{order.kod}</p>
                    <button 
                      onClick={() => handleApproveCode(order.id)}
                      className="w-full bg-emerald-50 text-emerald-600 font-black py-3 rounded-xl text-sm hover:bg-emerald-500 hover:text-white transition-colors"
                    >
                      KODU ONAYLA ✔️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Formu (Yeni Fırsat Ekleme Ekranı) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[50px] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 sm:p-8 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">{editingId ? "Güncelle" : "Yeni Fırsat"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/10 w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 sm:p-10 space-y-4 sm:space-y-5">
              <input required placeholder="Fırsat Başlığı" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 font-bold outline-none focus:border-orange-500 transition-all text-sm sm:text-base" value={formData.baslik} onChange={(e) => setFormData({...formData, baslik: e.target.value})} />
              <input placeholder="Fotoğraf Linki (İsteğe Bağlı)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 font-bold outline-none focus:border-orange-500 transition-all text-sm" value={formData.foto_url} onChange={(e) => setFormData({...formData, foto_url: e.target.value})} />
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <input required type="number" placeholder="Eski Fiyat" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 font-bold outline-none focus:border-orange-500 text-sm sm:text-base" value={formData.normal_fiyat} onChange={(e) => setFormData({...formData, normal_fiyat: e.target.value})} />
                <input required type="number" placeholder="Fırsat Fiyatı" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 font-bold outline-none focus:border-orange-500 text-orange-600 text-sm sm:text-base" value={formData.indirimli_fiyat} onChange={(e) => setFormData({...formData, indirimli_fiyat: e.target.value})} />
              </div>
              <input required type="number" placeholder="Toplam Stok" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 font-bold outline-none focus:border-orange-500 text-sm sm:text-base" value={formData.stok} onChange={(e) => setFormData({...formData, stok: e.target.value})} />
              <button type="submit" className="w-full bg-orange-500 text-white font-black py-4 sm:py-6 rounded-[24px] sm:rounded-[32px] shadow-xl shadow-orange-100 text-lg sm:text-xl hover:bg-orange-600 transition-all active:scale-95 mt-2">
                {editingId ? "KAYDET" : "YAYINLA 🚀"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}