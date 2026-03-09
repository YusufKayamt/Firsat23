"use client";

import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";

const supabase = createClient();
const ADMIN_PIN = "232323"; 

export default function AdminPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [pinError, setPinError] = useState(false);

  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [esnaflar, setEsnaflar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // DÜZENLEME İÇİN GEREKLİ STATE'LER
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ baslik: "", normal_fiyat: "", indirimli_fiyat: "", stok: "", foto_url: "" });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: oppData } = await supabase.from("opportunities").select("*").order("olusturma_zamani", { ascending: false });
      setOpportunities(oppData || []);

      const { data: esnafData } = await supabase.from("esnaflar").select("*").order("olusturma_zamani", { ascending: false });
      setEsnaflar(esnafData || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isUnlocked) fetchData();
  }, [isUnlocked]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode === ADMIN_PIN) {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinCode("");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("PATRON YETKİSİ: Bu fırsatı zorla silmek istediğine emin misin?")) {
      await supabase.from("opportunities").delete().eq("id", id);
      fetchData(); 
    }
  };

  // PATRON İÇİN DÜZENLEME PENCERESİNİ AÇMA
  const openEditModal = (opp: any) => {
    setEditingId(opp.id);
    setFormData({ baslik: opp.baslik, normal_fiyat: opp.normal_fiyat.toString(), indirimli_fiyat: opp.indirimli_fiyat.toString(), stok: opp.toplam_stok.toString(), foto_url: opp.foto_url || "" });
    setIsEditModalOpen(true);
  };

  // PATRON İÇİN KAYDETME
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from("opportunities").update({
        baslik: formData.baslik,
        normal_fiyat: parseFloat(formData.normal_fiyat),
        indirimli_fiyat: parseFloat(formData.indirimli_fiyat),
        toplam_stok: parseInt(formData.stok),
        kalan_stok: parseInt(formData.stok), // Stoğu sıfırlıyoruz gibi düşün, basit tutuyoruz
        foto_url: formData.foto_url
      }).eq("id", editingId);
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) { alert("Hata oluştu!"); }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-[40px] w-full max-w-sm text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">👑</div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Süper Admin</h2>
          <form onSubmit={handleLogin} className="space-y-4 mt-8">
            <input type="password" placeholder="PATRON ŞİFRESİ" className={`w-full text-center tracking-[1em] text-xl font-black bg-slate-50 border-2 rounded-3xl p-4 outline-none transition-all ${pinError ? 'border-red-500 text-red-500' : 'focus:border-red-500'}`} value={pinCode} onChange={(e) => setPinCode(e.target.value)} />
            <button type="submit" className="w-full bg-red-600 text-white font-black py-5 rounded-[25px] shadow-xl text-lg hover:bg-red-700 transition-all active:scale-95">SİSTEME GİR</button>
          </form>
          <button onClick={() => window.location.href='/'} className="mt-6 text-slate-400 text-xs font-bold hover:text-slate-800 transition-colors">← Vitrine Dön</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans text-slate-900 pb-24">
      <div className="flex justify-between items-center mb-10 bg-red-600 text-white p-8 rounded-[40px] shadow-xl">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Sistem Kontrol Merkezi</h1>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mt-1 opacity-80">Hoş Geldin Patron</p>
        </div>
        <button onClick={() => setIsUnlocked(false)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-slate-800 transition-all">KİLİTLE</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 mb-6 border-b pb-4">Tüm Fırsatlar ({opportunities.length})</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {opportunities.map(opp => (
              <div key={opp.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-xs font-black text-orange-500 uppercase">{opp.dukkan_adi}</span>
                  <h3 className="font-bold text-slate-800">{opp.baslik}</h3>
                  <p className="text-xs text-slate-500">Stok: {opp.kalan_stok}/{opp.toplam_stok} | Fiyat: {opp.indirimli_fiyat}₺</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(opp)} className="bg-blue-100 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-black text-xs">✎ DÜZENLE</button>
                  <button onClick={() => handleDelete(opp.id)} className="bg-red-100 text-red-600 px-3 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-all font-black text-xs">SİL</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 mb-6 border-b pb-4">Kayıtlı Esnaflar ({esnaflar.length})</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {esnaflar.map(esnaf => (
              <div key={esnaf.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h3 className="font-bold text-slate-800 text-lg">{esnaf.dukkan_adi}</h3>
                <p className="text-sm font-mono text-slate-500 mt-1">Tel: {esnaf.telefon}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PATRON DÜZENLEME MODALI */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 bg-red-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight">Fırsata Müdahale Et</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="bg-white/10 w-10 h-10 rounded-full flex items-center justify-center">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <input placeholder="Başlık" className="w-full bg-slate-50 border-2 rounded-2xl p-4 font-bold outline-none" value={formData.baslik} onChange={(e) => setFormData({...formData, baslik: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Eski Fiyat" type="number" className="w-full bg-slate-50 border-2 rounded-2xl p-4 font-bold outline-none" value={formData.normal_fiyat} onChange={(e) => setFormData({...formData, normal_fiyat: e.target.value})} />
                <input placeholder="Yeni Fiyat" type="number" className="w-full bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 font-black outline-none text-orange-600" value={formData.indirimli_fiyat} onChange={(e) => setFormData({...formData, indirimli_fiyat: e.target.value})} />
              </div>
              <input placeholder="Stok" type="number" className="w-full bg-slate-50 border-2 rounded-2xl p-4 font-bold outline-none" value={formData.stok} onChange={(e) => setFormData({...formData, stok: e.target.value})} />
              <button onClick={handleSave} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-red-700 mt-2">GÜNCELLE ✅</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}