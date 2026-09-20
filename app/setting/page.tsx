"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Store, MapPin, Phone, MessageSquare, CreditCard, QrCode, Plus, Trash2, Upload, Printer, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { printReceipt } from "@/utils/printer";

export default function SettingPage() {
  const [namaBengkel, setNamaBengkel] = useState("BENGKEL MOTOR");
  const [alamatBengkel, setAlamatBengkel] = useState("Jl. Raya Bengkel No. 32");
  const [teleponBengkel, setTeleponBengkel] = useState("08123456789");
  const [pesanStruk, setPesanStruk] = useState("Terima Kasih Atas Kunjungan Anda!");
  const [printerMode, setPrinterMode] = useState("auto");
  const [printerDeviceName, setPrinterDeviceName] = useState("Thermal Printer");
  const [printerPortName, setPrinterPortName] = useState("COM3 / USB 0x... / Bluetooth");
  const [autoCetak, setAutoCetak] = useState(true);
  const [bankList, setBankList] = useState<any[]>([]);
  const [qrisImage, setQrisImage] = useState("");
  const [savedStatus, setSavedStatus] = useState(false);
  const [testPrintStatus, setTestPrintStatus] = useState("Belum dicoba");

  useEffect(() => {
    const savedConfig = localStorage.getItem("bengkel_config");
    const savedPrinter = localStorage.getItem("bengkel_printer_config");

    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setNamaBengkel(config.namaBengkel || "");
      setAlamatBengkel(config.alamatBengkel || "");
      setTeleponBengkel(config.teleponBengkel || "");
      setPesanStruk(config.pesanStruk || "");
      setBankList(config.bankList || [{ bank: "BCA", norek: "1234567890", an: "Bengkel Jaya" }]);
      setQrisImage(config.qrisImage || "");
    } else {
      setBankList([{ bank: "BCA", norek: "1234567890", an: "Bengkel Jaya" }]);
    }

    if (savedPrinter) {
      const printerConfig = JSON.parse(savedPrinter);
      setPrinterMode(printerConfig.mode || "auto");
      setPrinterDeviceName(printerConfig.deviceName || "Thermal Printer");
      setPrinterPortName(printerConfig.portName || "COM3 / USB 0x... / Bluetooth");
      setAutoCetak(printerConfig.autoPrint !== false);
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
      qrisImage,
    };
    localStorage.setItem("bengkel_config", JSON.stringify(config));

    const printerConfig = {
      mode: printerMode,
      deviceName: printerDeviceName,
      portName: printerPortName,
      autoPrint: autoCetak,
    };
    localStorage.setItem("bengkel_printer_config", JSON.stringify(printerConfig));

    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  const handleTestPrint = async () => {
    setTestPrintStatus("Mencoba printer...");

    const previewData = {
      storeName: namaBengkel || "BENGKEL JOSJIS",
      storeAddress: alamatBengkel || "Jl. Raya",
      storePhone: teleponBengkel,
      notaNo: "TEST-PRINT",
      date: new Date().toLocaleString("id-ID"),
      cashier: "Admin",
      plateNumber: "TEST",
      items: [
        { name: "Tes Cetak Thermal", qty: 1, price: 50000, subtotal: 50000 },
        { name: "Tutup Struk", qty: 1, price: 0, subtotal: 0 },
      ],
      total: 50000,
      cash: 50000,
      change: 0,
      paymentMethod: "TEST PRINT",
      footerMessage: pesanStruk,
    };

    try {
      const success = await printReceipt(previewData);
      setTestPrintStatus(success ? "Print berhasil" : "Printer tidak terdeteksi");
    } catch {
      setTestPrintStatus("Print gagal");
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-stone-800 p-4 md:p-8 font-sans flex flex-col justify-between">
      <div>
        <div className="mb-8 flex items-center gap-4">
          <Link href="/" className="rounded-xl border border-stone-300 bg-white p-2.5 text-stone-700 shadow-sm transition hover:bg-stone-100">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Setelan Bengkel & Printer Thermal</h1>
            <p className="text-sm text-stone-500">Konfigurasi identitas usaha, rekening, QRIS, dan metode printer thermal.</p>
          </div>
        </div>

        <div className="max-w-3xl rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-[0_20px_55px_rgba(87,75,63,0.08)] backdrop-blur-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Informasi bengkel</h3>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-600">
                  <Store size={14} className="text-stone-600" /> Nama Bengkel / Usaha
                </label>
                <input
                  type="text"
                  value={namaBengkel}
                  onChange={(e) => setNamaBengkel(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition focus:border-stone-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-600">
                    <MapPin size={14} className="text-stone-600" /> Alamat Lengkap
                  </label>
                  <input
                    type="text"
                    value={alamatBengkel}
                    onChange={(e) => setAlamatBengkel(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-600">
                    <Phone size={14} className="text-stone-600" /> Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={teleponBengkel}
                    onChange={(e) => setTeleponBengkel(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition focus:border-stone-500"
                  />
                </div>
              </div>
            </div>

            <hr className="border-stone-200" />

            <div className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 flex items-center gap-2">
                <Printer size={14} /> Pengaturan printer thermal
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-600">Mode printer</label>
                  <select
                    value={printerMode}
                    onChange={(e) => setPrinterMode(e.target.value)}
                    className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 outline-none transition focus:border-stone-500"
                  >
                    <option value="auto">Auto detect</option>
                    <option value="bluetooth">Bluetooth thermal</option>
                    <option value="serial">USB serial / port</option>
                    <option value="usb">USB device</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-600">Nama perangkat</label>
                  <input
                    type="text"
                    value={printerDeviceName}
                    onChange={(e) => setPrinterDeviceName(e.target.value)}
                    placeholder="Thermal Printer"
                    className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 outline-none transition focus:border-stone-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-600">Port / koneksi</label>
                <input
                  type="text"
                  value={printerPortName}
                  onChange={(e) => setPrinterPortName(e.target.value)}
                  placeholder="COM3 / USB 0x... / Bluetooth"
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 outline-none transition focus:border-stone-500"
                />
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-stone-500">Status test print</div>
                  <div className="text-sm font-medium text-stone-700">{testPrintStatus}</div>
                </div>

                <button
                  type="button"
                  onClick={handleTestPrint}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-900 px-4 py-2.5 text-[11px] font-semibold text-stone-50 shadow-sm transition hover:bg-stone-800"
                >
                  <Printer size={14} /> Test Print Thermal
                </button>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-3 py-3">
                <div>
                  <div className="text-xs font-semibold text-stone-700">Cetak otomatis setelah transaksi</div>
                  <div className="text-[11px] text-stone-500">Struk langsung dikirim setelah pembayaran berhasil.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCetak(!autoCetak)}
                  className={`rounded-xl px-3 py-1.5 text-[10px] font-bold transition ${autoCetak ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" : "bg-stone-100 text-stone-600 ring-1 ring-stone-200"}`}
                >
                  {autoCetak ? "AKTIF" : "NONAKTIF"}
                </button>
              </div>
            </div>

            <hr className="border-stone-200" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 flex items-center gap-1.5">
                  <CreditCard size={15} /> Daftar rekening bank
                </h3>
                <button
                  type="button"
                  onClick={handleAddBank}
                  className="flex items-center gap-1 rounded-xl border border-stone-300 bg-stone-100 px-3 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-stone-200"
                >
                  <Plus size={13} /> Tambah Bank
                </button>
              </div>

              <div className="space-y-3">
                {bankList.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3 md:flex-row md:items-center">
                    <input
                      type="text"
                      placeholder="Bank"
                      value={item.bank}
                      onChange={(e) => handleBankChange(idx, "bank", e.target.value)}
                      required
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500 md:w-1/4"
                    />
                    <input
                      type="text"
                      placeholder="No. Rekening"
                      value={item.norek}
                      onChange={(e) => handleBankChange(idx, "norek", e.target.value)}
                      required
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500 md:w-1/3"
                    />
                    <input
                      type="text"
                      placeholder="Atas nama"
                      value={item.an}
                      onChange={(e) => handleBankChange(idx, "an", e.target.value)}
                      required
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500 md:flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBank(idx)}
                      className="rounded-xl border border-stone-300 bg-white p-2 text-stone-600 transition hover:border-red-300 hover:text-red-600"
                      title="Hapus Bank"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-stone-200" />

            <div className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 flex items-center gap-1.5">
                <QrCode size={15} /> QRIS pembayaran
              </h3>

              <div className="flex flex-col items-start gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:flex-row md:items-center">
                {qrisImage ? (
                  <div className="relative shrink-0 rounded-2xl bg-white p-2 shadow-sm">
                    <Image src={qrisImage} alt="QRIS Preview" width={112} height={112} unoptimized className="h-28 w-28 object-contain" />
                    <button
                      type="button"
                      onClick={() => setQrisImage("")}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-[10px] text-white"
                      title="Hapus QRIS"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white text-center text-[11px] text-stone-500">
                    Belum ada QRIS
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100">
                    <Upload size={14} /> Pilih File Gambar QRIS
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <p className="text-[11px] leading-relaxed text-stone-500">Format JPG, PNG. Ukuran maksimal 1MB.</p>
                </div>
              </div>
            </div>

            <hr className="border-stone-200" />

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-600">
                <MessageSquare size={14} /> Pesan penutup struk
              </label>
              <input
                type="text"
                value={pesanStruk}
                onChange={(e) => setPesanStruk(e.target.value)}
                required
                className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition focus:border-stone-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-50 shadow-[0_14px_30px_rgba(41,35,34,0.12)] transition hover:bg-stone-800"
              >
                <Save size={16} /> Simpan Pengaturan
              </button>
            </div>

            {savedStatus && (
              <p className="pt-1 text-center text-xs font-medium text-emerald-700">
                <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} /> Pengaturan berhasil disimpan</span>
              </p>
            )}
          </form>
        </div>
      </div>

      <footer className="mt-12 border-t border-stone-200 pt-4 text-center text-xs text-stone-500">
        POS Bengkel System • Powered by <span className="font-semibold text-stone-700">EL Tech</span>
      </footer>
    </main>
  );
}