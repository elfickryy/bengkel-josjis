"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Store, MapPin, Phone, MessageSquare, CreditCard, QrCode, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";

export default function SettingPage() {
  const [namaBengkel, setNamaBengkel] = useState("BENGKEL MOTOR");
  const [alamatBengkel, setAlamatBengkel] = useState("Jl. Raya Bengkel No. 32");
  const [teleponBengkel, setTeleponBengkel] = useState("08123456789");
  const [pesanStruk, setPesanStruk] = useState("Terima Kasih Atas Kunjungan Anda!");
  
  // State Bank & QRIS Gambar (Base64)
  const [bankList, setBankList] = useState<any[]>([]);
  const [qrisImage, setQrisImage] = useState("");
  
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem("bengkel_config");
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setNamaBengkel(config.namaBengkel || "");
      setAlamatBengkel(config.alamatBengkel || "");
      setTeleponBengkel(config.teleponBengkel || "");
      setPesanStruk(config.pesanStruk || "");
      setBankList(config.bankList || [
        { bank: "BCA", norek: "1234567890", an: "Bengkel Jaya" }
      ]);
      setQrisImage(config.qrisImage || "");
    } else {
      setBankList([
        { bank: "BCA", norek: "1234567890", an: "Bengkel Jaya" }
      ]);
    }
  }, []);

  const handleAddBank = () => {
    setBankList([...bankList, { bank: "", norek: "", an: "" }]);
  };

  const handleRemoveBank = (index: number) => {
    setBankList(bankList.filter((_, i) => i !== index));
  };

  const handleBankChange = (index: number, field: string, value: string) => {
    const updated = [...bankList];
    updated[index][field] = value;
    setBankList(updated);
  };

  // Handler Upload Gambar QRIS ke Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("Ukuran file terlalu besar! Maksimal 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setQrisImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      namaBengkel,
      alamatBengkel,
      teleponBengkel,
      pesanStruk,
      bankList,
      qrisImage
    };
    localStorage.setItem("bengkel_config", JSON.stringify(config));
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans flex flex-col justify-between">
      <div>
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 border border-slate-800 bg-slate-900 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Pengaturan Identitas & Pembayaran</h1>
            <p className="text-sm text-slate-500">Konfigurasi data bengkel, daftar rekening bank, dan unggah gambar QRIS.</p>
          </div>
        </div>

        {/* FORM SETTING */}
        <div className="max-w-2xl bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Informasi Umum */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Informasi Bengkel</h3>
              <div>
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <Store size={14} className="text-blue-400" /> Nama Bengkel / Usaha
                </label>
                <input
                  type="text"
                  value={namaBengkel}
                  onChange={(e) => setNamaBengkel(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
                    <MapPin size={14} className="text-emerald-400" /> Alamat Lengkap
                  </label>
                  <input
                    type="text"
                    value={alamatBengkel}
                    onChange={(e) => setAlamatBengkel(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
                    <Phone size={14} className="text-orange-400" /> Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={teleponBengkel}
                    onChange={(e) => setTeleponBengkel(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-800" />

            {/* PENGATURAN BANYAK REKENING BANK */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={15} /> Daftar Rekening Bank (Transfer)
                </h3>
                <button
                  type="button"
                  onClick={handleAddBank}
                  className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1"
                >
                  <Plus size={13} /> Tambah Bank
                </button>
              </div>

              <div className="space-y-3">
                {bankList.map((item, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nama Bank (Cth: BCA)"
                      value={item.bank}
                      onChange={(e) => handleBankChange(idx, "bank", e.target.value)}
                      required
                      className="w-1/4 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      placeholder="Nomor Rekening"
                      value={item.norek}
                      onChange={(e) => handleBankChange(idx, "norek", e.target.value)}
                      required
                      className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      placeholder="Atas Nama (a/n)"
                      value={item.an}
                      onChange={(e) => handleBankChange(idx, "an", e.target.value)}
                      required
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBank(idx)}
                      className="text-slate-500 hover:text-red-400 p-1.5 transition"
                      title="Hapus Bank"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-slate-800" />

            {/* PENGATURAN UPLOAD GAMBAR QRIS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode size={15} /> Upload Gambar QR Code QRIS
              </h3>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {qrisImage ? (
                  <div className="relative bg-white p-2 rounded-xl shadow-md shrink-0">
                    <img src={qrisImage} alt="QRIS Preview" className="w-28 h-28 object-contain" />
                    <button
                      type="button"
                      onClick={() => setQrisImage("")}
                      className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 text-[10px] shadow"
                      title="Hapus Gambar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-28 h-28 bg-slate-900 border border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 text-[11px] text-center p-2 shrink-0">
                    Belum ada QRIS
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-medium transition inline-flex items-center gap-2">
                    <Upload size={14} className="text-purple-400" /> Pilih File Gambar QRIS
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Format gambar (JPG, PNG). Gambar QR Code akan langsung tersimpan di sistem lokal dan siap ditampilkan saat kasir memilih metode QRIS.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-slate-800" />

            {/* Pesan Struk */}
            <div>
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
                <MessageSquare size={14} className="text-purple-400" /> Pesan Penutup Struk
              </label>
              <input
                type="text"
                value={pesanStruk}
                onChange={(e) => setPesanStruk(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-sm"
              >
                <Save size={16} /> Simpan Pengaturan
              </button>
            </div>

            {savedStatus && (
              <p className="text-center text-xs text-emerald-400 font-medium pt-2">
                ✅ Pengaturan berhasil disimpan ke memori perangkat!
              </p>
            )}
          </form>
        </div>
      </div>

      <footer className="mt-12 text-center border-t border-slate-900 pt-4 text-xs text-slate-600">
        POS Bengkel Enterprise System • Powered by <span className="text-slate-400 font-semibold">EL Tech</span>
      </footer>
    </main>
  );
}