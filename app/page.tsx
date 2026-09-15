"use client";
import { useState, useEffect } from "react";
import { getStokBarang, simpanTransaksi } from "@/lib/api";
import { 
  ShoppingCart, Trash2, CheckCircle, RefreshCw, 
  Search, Package, BarChart3, Wrench, Database, Plus, Minus, Settings, CreditCard, QrCode, History, UserCheck, Printer 
} from "lucide-react";
import Link from "next/link";

export default function KasirPage() {
  const [stokList, setStokList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State Jasa & Konfigurasi Setting
  const [customJasaList, setCustomJasaList] = useState<any[]>([]);
  const [bankList, setBankList] = useState<any[]>([]);
  const [qrisImage, setQrisImage] = useState("");
  const [bengkelConfig, setBengkelConfig] = useState<any>({});

  // Keranjang & Pembayaran
  const [cart, setCart] = useState<any[]>([]);
  const [namaPelanggan, setNamaPelanggan] = useState("");
  const [platNomor, setPlatNomor] = useState("");
  const [metodeBayar, setMetodeBayar] = useState("CASH");
  
  // Input Mekanik & Opsi Cetak Struk
  const [mekanik, setMekanik] = useState("Budi");
  const [autoCetak, setAutoCetak] = useState(true);

  const [uangDiterima, setUangDiterima] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await getStokBarang();
    setStokList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    
    // Load Jasa Servis
    const savedJasa = localStorage.getItem("bengkel_custom_jasa");
    if (savedJasa) {
      setCustomJasaList(JSON.parse(savedJasa));
    } else {
      const defaults = [
        { nama: "Servis Ringan", harga: 35000 },
        { nama: "Ganti Oli", harga: 15000 },
        { nama: "Ganti Ban", harga: 25000 },
        { nama: "Turun Mesin", harga: 150000 }
      ];
      localStorage.setItem("bengkel_custom_jasa", JSON.stringify(defaults));
      setCustomJasaList(defaults);
    }

    // Load Konfigurasi Bank & QRIS dari Setting
    const savedConfig = localStorage.getItem("bengkel_config");
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setBengkelConfig(config);
      const banks = config.bankList || [];
      setBankList(banks);
      if (banks.length > 0) setSelectedBank(`${banks[0].bank} - ${banks[0].norek} (a/n ${banks[0].an})`);
      setQrisImage(config.qrisImage || "");
    } else {
      setBankList([{ bank: "BCA", norek: "1234567890", an: "Bengkel Jaya" }]);
      setSelectedBank("BCA - 1234567890 (a/n Bengkel Jaya)");
    }
  }, []);

  const filteredStok = stokList.filter(
    (item) =>
      item.nama_part?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode_part?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kategori?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (item: any, jenis: "PART" | "JASA", customHarga?: number) => {
    if (jenis === "PART" && item.stok <= 0) {
      alert("Stok barang ini habis!");
      return;
    }

    const hargaJual = customHarga !== undefined ? customHarga : Number(item.harga_jual || 0);
    const cartItemId = jenis === "JASA" ? `jasa-${Date.now()}-${Math.random()}` : item.id;

    const existing = cart.find((c) => (jenis === "PART" ? c.id === item.id : c.cartItemId === cartItemId));

    if (existing && jenis === "PART") {
      if (existing.qty >= item.stok) {
        alert("Jumlah melebihi stok gudang!");
        return;
      }
      setCart(
        cart.map((c) =>
          c.id === item.id
            ? { ...c, qty: c.qty + 1, subtotal: (c.qty + 1) * c.harga_jual }
            : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          cartItemId,
          id: jenis === "PART" ? item.id : null,
          jenis,
          nama: jenis === "PART" ? item.nama_part : item.nama,
          harga_jual: hargaJual,
          qty: 1,
          subtotal: hargaJual,
        },
      ]);
    }
  };

  const updateQty = (cartItemId: string, delta: number) => {
    setCart(
      cart.map((item) => {
        const key = item.jenis === "PART" ? item.id : item.cartItemId;
        if (key === cartItemId) {
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          return { ...item, qty: newQty, subtotal: newQty * item.harga_jual };
        }
        return item;
      }).filter(Boolean)
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter((item) => (item.jenis === "PART" ? item.id !== cartItemId : item.cartItemId !== cartItemId)));
  };

  const totalBelanja = cart.reduce((sum, item) => sum + item.subtotal, 0);
  
  const nominalUang = Number(uangDiterima) || 0;
  const kembalian = nominalUang >= totalBelanja ? nominalUang - totalBelanja : 0;

  // Fungsi Cetak Struk Thermal Khusus Printer Bluetooth / Thermal Browser (Mencakup Nama Mekanik)
  const cetakStrukThermal = (nomorNota: string, finalMetode: string, namaMekanik: string) => {
    const namaToko = bengkelConfig.namaBengkel || "KASIR BENGKEL MOTOR";
    const alamatToko = bengkelConfig.alamatBengkel || "Jl. Raya Bengkel No. 32";
    const telpToko = bengkelConfig.teleponBengkel || "08123456789";
    const pesanPenutup = bengkelConfig.pesanStruk || "Terima Kasih Atas Kunjungan Anda!";

    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan pop-up pada browser Anda.");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Struk - ${nomorNota}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 58mm;
              margin: 0;
              padding: 5px;
              color: #000;
              font-size: 11px;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            .flex { display: flex; justify-content: space-between; }
            table { width: 100%; font-size: 11px; border-collapse: collapse; }
            th, td { text-align: left; padding: 2px 0; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 13px;">${namaToko}</div>
          <div class="center">${alamatToko}</div>
          <div class="center">Telp: ${telpToko}</div>
          <div class="line"></div>
          <div>No. Nota: ${nomorNota}</div>
          <div>Tanggal: ${new Date().toLocaleString("id-ID")}</div>
          <div>Pelanggan: ${namaPelanggan.trim() || "Umum"}</div>
          <div>Plat No: ${platNomor.trim().toUpperCase() || "-"}</div>
          <div>Mekanik: ${namaMekanik}</div>
          <div class="line"></div>
          <table>
            ${cart.map(item => `
              <tr>
                <td colspan="2">${item.nama}</td>
              </tr>
              <tr>
                <td>${item.qty} x ${item.harga_jual.toLocaleString()}</td>
                <td class="right">${item.subtotal.toLocaleString()}</td>
              </tr>
            `).join('')}
          </table>
          <div class="line"></div>
          <div class="flex bold">
            <span>TOTAL:</span>
            <span>Rp ${totalBelanja.toLocaleString()}</span>
          </div>
          <div>Metode: ${finalMetode}</div>
          ${finalMetode.includes("CASH") ? `
            <div class="flex"><span>Tunai:</span><span>Rp ${nominalUang.toLocaleString()}</span></div>
            <div class="flex"><span>Kembalian:</span><span>Rp ${kembalian.toLocaleString()}</span></div>
          ` : ""}
          <div class="line"></div>
          <div class="center" style="margin-top: 8px;">${pesanPenutup}</div>
          <div class="center" style="font-size: 9px; margin-top: 4px;">Powered by EL Tech</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Keranjang masih kosong!");
      return;
    }

    if (metodeBayar === "CASH" && nominalUang < totalBelanja) {
      alert("Jumlah uang tunai yang diterima kurang dari total belanja!");
      return;
    }

    let finalMetodeBayar = "CASH";
    if (metodeBayar === "TRANSFER") {
      finalMetodeBayar = `TRANSFER (${selectedBank})`;
    } else if (metodeBayar === "QRIS") {
      finalMetodeBayar = "QRIS (All Payment)";
    }

    if (!confirm(`Konfirmasi pembayaran sebesar Rp ${totalBelanja.toLocaleString()} via ${finalMetodeBayar}?`)) return;

    setIsSubmitting(true);
    const nomorNota = "NOTA-" + Date.now().toString().slice(-6);
    const currentMekanik = mekanik.trim() || "-";

    const payload = {
      nomorNota,
      namaPelanggan: namaPelanggan.trim() || "Umum",
      platNomor: platNomor.trim().toUpperCase() || "-",
      totalBelanja,
      metodeBayar: finalMetodeBayar,
      items: cart,
      mekanik: currentMekanik, // Mekanik kini ikut dikirim ke database
    };

    const res = await simpanTransaksi(payload);
    setIsSubmitting(false);

    if (res.status === "success") {
      alert(`✅ Transaksi Berhasil! No. Nota: ${nomorNota}`);
      
      // Cetak struk otomatis & sertakan nama mekanik
      if (autoCetak) {
        cetakStrukThermal(nomorNota, finalMetodeBayar, currentMekanik);
      }

      setCart([]);
      setNamaPelanggan("");
      setPlatNomor("");
      setUangDiterima("");
      loadData();
    } else {
      alert("Gagal menyimpan transaksi: " + res.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-6 flex flex-col justify-between gap-6 font-sans">
      
      <div className="flex flex-col gap-6">
        {/* HEADER NAVIGASI */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Wrench className="text-blue-500" size={22} /> KASIR BENGKEL JOSJIS!!!
            </h1>
            <p className="text-xs text-slate-500">Sistem POS JOSJIS • by: <span className="text-blue-400 font-medium">EL Tech</span></p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/riwayat" className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium transition text-cyan-400">
              <History size={15} /> Riwayat
            </Link>
            <Link href="/pembelian" className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium transition text-slate-200">
              <Package size={15} className="text-emerald-400" /> Gudang
            </Link>
            <Link href="/rekap" className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium transition text-slate-200">
              <BarChart3 size={15} className="text-cyan-400" /> Rekap
            </Link>
            <Link href="/database" className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium transition text-slate-200">
              <Database size={15} className="text-blue-400" /> Database
            </Link>
            <Link href="/setting" className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium transition text-slate-200" title="Pengaturan Bengkel">
              <Settings size={15} className="text-orange-400" /> Setting
            </Link>
            <button onClick={loadData} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition text-slate-300" title="Refresh Stok">
              <RefreshCw size={15} className={loading ? "animate-spin text-blue-500" : ""} />
            </button>
          </div>
        </header>

        {/* GRID UTAMA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* KOLOM KIRI: KATALOG (TABEL RINGKAS) & JASA (7 Kolom) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col gap-4">
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <h2 className="font-semibold text-sm text-slate-200">Katalog Onderdil & Jasa Servis</h2>
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="text"
                  placeholder="Cari nama part / kode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Panel Jasa Servis Dinamis */}
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  🛠️ Jasa Servis Cepat:
                </span>
                <button
                  onClick={() => {
                    const namaBaru = prompt("Masukkan nama jasa servis baru (Cth: Las Knalpot):");
                    if (!namaBaru) return;
                    const hargaBaru = prompt(`Masukkan tarif default untuk "${namaBaru}" (Rp):`, "30000");
                    if (!hargaBaru || isNaN(Number(hargaBaru))) {
                      alert("Tarif tidak valid!");
                      return;
                    }
                    const updated = [...customJasaList, { nama: namaBaru.trim(), harga: Number(hargaBaru) }];
                    localStorage.setItem("bengkel_custom_jasa", JSON.stringify(updated));
                    setCustomJasaList(updated);
                  }}
                  className="text-[11px] bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-lg transition font-medium"
                >
                  + Tambah Jasa
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 items-center">
                {customJasaList.map((jasa, idx) => (
                  <div 
                    key={idx}
                    className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1.5 flex items-center gap-2.5 shrink-0 transition"
                  >
                    <button
                      onClick={() => addToCart({ nama: `Jasa: ${jasa.nama}`, id: null }, "JASA", jasa.harga)}
                      className="text-left flex flex-col"
                    >
                      <span className="text-xs font-medium text-slate-200">{jasa.nama}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">Rp {jasa.harga.toLocaleString()}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`Hapus jasa "${jasa.nama}"?`)) return;
                        const updated = customJasaList.filter((_, i) => i !== idx);
                        localStorage.setItem("bengkel_custom_jasa", JSON.stringify(updated));
                        setCustomJasaList(updated);
                      }}
                      className="text-slate-500 hover:text-red-400 text-xs transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* TABEL RINGKAS ONDERDIL */}
            <div className="flex-1 overflow-hidden border border-slate-800 rounded-xl bg-slate-950/40">
              {loading ? (
                <p className="text-center text-slate-500 py-12 text-xs animate-pulse">Memuat daftar onderdil...</p>
              ) : filteredStok.length === 0 ? (
                <p className="text-center text-slate-500 py-12 text-xs">Tidak ada onderdil ditemukan.</p>
              ) : (
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Nama Onderdil</th>
                        <th className="px-3 py-2.5 font-medium">Kategori</th>
                        <th className="px-3 py-2.5 font-medium text-center">Stok</th>
                        <th className="px-3 py-2.5 font-medium text-right">Harga (Rp)</th>
                        <th className="px-3 py-2.5 font-medium text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredStok.map((item) => {
                        const habis = item.stok <= 0;
                        return (
                          <tr key={item.id} className={`hover:bg-slate-800/40 transition ${habis ? "opacity-40" : ""}`}>
                            <td className="px-3 py-2.5 font-medium text-slate-200">{item.nama_part}</td>
                            <td className="px-3 py-2.5 text-slate-400"><span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">{item.kategori || "Umum"}</span></td>
                            <td className="px-3 py-2.5 text-center font-bold">
                              <span className={item.stok <= 3 ? "text-red-400" : "text-emerald-400"}>{item.stok}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-orange-400">Rp {Number(item.harga_jual).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                disabled={habis}
                                onClick={() => addToCart(item, "PART")}
                                className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-2.5 py-1 rounded-lg transition font-medium text-[11px] disabled:pointer-events-none"
                              >
                                + Masuk
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* KOLOM KANAN: KERANJANG & PEMBAYARAN OPTIMAL (5 Kolom) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <ShoppingCart size={16} className="text-blue-400" /> Keranjang & Pembayaran
              </h2>

              {/* Input Data Pelanggan, Plat & Mekanik */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nama Pelanggan"
                  value={namaPelanggan}
                  onChange={(e) => setNamaPelanggan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Plat Nomor"
                  value={platNomor}
                  onChange={(e) => setPlatNomor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 uppercase focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 mb-1 block flex items-center gap-1"><UserCheck size={11} /> Nama Mekanik:</label>
                <input
                  type="text"
                  placeholder="Cth: Budi / Joko"
                  value={mekanik}
                  onChange={(e) => setMekanik(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-medium text-cyan-400"
                />
              </div>

              {/* Daftar Item di Keranjang */}
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1 border-t border-b border-slate-800 py-2.5">
                {cart.length === 0 ? (
                  <p className="text-center text-slate-600 text-xs py-6">Keranjang masih kosong.</p>
                ) : (
                  cart.map((item, idx) => {
                    const key = item.jenis === "PART" ? item.id : item.cartItemId;
                    return (
                      <div key={idx} className="bg-slate-950/60 border border-slate-800 p-2 rounded-xl flex justify-between items-center text-xs">
                        <div className="max-w-[140px]">
                          <p className="font-medium text-slate-200 truncate">{item.nama}</p>
                          <p className="text-[10px] text-slate-500">{item.qty}x @Rp {Number(item.harga_jual).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-orange-400">Rp {Number(item.subtotal).toLocaleString()}</span>
                          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                            <button onClick={() => updateQty(key, -1)} className="hover:bg-slate-800 p-1 rounded text-slate-300"><Minus size={10} /></button>
                            <span className="font-bold w-4 text-center text-[11px]">{item.qty}</span>
                            <button onClick={() => updateQty(key, 1)} className="hover:bg-slate-800 p-1 rounded text-slate-300"><Plus size={10} /></button>
                          </div>
                          <button onClick={() => removeFromCart(key)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* METODE PEMBAYARAN */}
              <div className="space-y-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Metode Bayar:</span>
                  <div className="flex gap-1.5">
                    {["CASH", "TRANSFER", "QRIS"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMetodeBayar(m)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-medium transition ${
                          metodeBayar === m 
                            ? "bg-blue-600 text-white shadow-sm" 
                            : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {metodeBayar === "CASH" && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Uang Diterima (Rp):</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={uangDiterima}
                        onChange={(e) => setUangDiterima(e.target.value)}
                        className="w-36 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-right font-bold text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex gap-1 justify-end">
                      {[20000, 50000, 100000].map((nominal) => (
                        <button
                          key={nominal}
                          onClick={() => setUangDiterima(String(nominal))}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 px-2 py-0.5 rounded transition"
                        >
                          {nominal / 1000}k
                        </button>
                      ))}
                      <button
                        onClick={() => setUangDiterima(String(totalBelanja))}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-emerald-400 px-2 py-0.5 rounded transition font-medium"
                      >
                        Uang Pas
                      </button>
                    </div>
                  </div>
                )}

                {metodeBayar === "TRANSFER" && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <label className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                      <CreditCard size={13} /> Pilih Rekening Tujuan:
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {bankList.map((b, i) => (
                        <option key={i} value={`${b.bank} - ${b.norek} (a/n ${b.an})`}>
                          {b.bank} : {b.norek} ({b.an})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {metodeBayar === "QRIS" && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-purple-400 font-medium mb-1">
                      <QrCode size={13} /> Scan QRIS Pembayaran:
                    </div>
                    {qrisImage ? (
                      <div className="bg-white p-2 rounded-xl inline-block shadow-md">
                        <img src={qrisImage} alt="QRIS Code" className="w-32 h-32 object-contain mx-auto" />
                      </div>
                    ) : (
                      <p className="text-xs text-red-400 italic bg-slate-900 p-2 rounded-lg">
                        Gambar QRIS belum di-upload di menu Setting!
                      </p>
                    )}
                  </div>
                )}

                {/* Opsi Cetak Struk Ya / Tidak */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Printer size={13} className="text-emerald-400" /> Cetak Struk Otomatis?
                  </span>
                  <button
                    onClick={() => setAutoCetak(!autoCetak)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                      autoCetak 
                        ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" 
                        : "bg-slate-900 text-slate-500 border border-slate-800"
                    }`}
                  >
                    {autoCetak ? "YA (Cetak)" : "TIDAK"}
                  </button>
                </div>
              </div>

            </div>

            {/* TOTAL & TOMBOL CHECKOUT */}
            <div className="pt-4 border-t border-slate-800 space-y-3 mt-4">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Total Belanja:</span>
                  <span className="font-semibold text-slate-200">Rp {totalBelanja.toLocaleString()}</span>
                </div>
                
                {metodeBayar === "CASH" && (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Kembalian:</span>
                    <span className={`font-bold ${kembalian < 0 && nominalUang > 0 ? "text-red-400" : "text-cyan-400"}`}>
                      Rp {kembalian.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-300">Grand Total:</span>
                <span className="text-lg font-extrabold text-emerald-400">Rp {totalBelanja.toLocaleString()}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-xs"
              >
                <CheckCircle size={16} /> {isSubmitting ? "Memproses..." : "Proses Pembayaran (Checkout)"}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER BRANDS / COPYRIGHT */}
      <footer className="text-center border-t border-slate-900 pt-4 text-xs text-slate-600">
        POS Bengkel Enterprise System • Crafted with precision by <span className="text-slate-400 font-semibold">EL Tech</span>
      </footer>
    </main>
  );
}