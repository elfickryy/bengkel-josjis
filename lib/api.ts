import { supabase } from "./supabase";

// 1. Ambil Stok Barang
export async function getStokBarang() {
  const { data, error } = await supabase
    .from("part")
    .select("*")
    .order("nama_part", { ascending: true });

  if (error) {
    console.error("Gagal ambil stok:", error.message);
    return [];
  }
  return data || [];
}

// 2. Tambah Part / Restock Barang Baru ke Supabase
export async function tambahPart(payload: any) {
  try {
    const { error } = await supabase.from("part").insert([
      {
        kode_part: payload.kodePart,
        nama_part: payload.namaPart,
        kategori: payload.kategori,
        harga_beli: Number(payload.hargaBeli),
        harga_jual: Number(payload.hargaJual),
        stok: Number(payload.stok),
      },
    ]);

    if (error) throw new Error(error.message);
    return { status: "success" };
  } catch (err: any) {
    console.error("Gagal tambah part:", err);
    return { status: "error", message: err.message };
  }
}

// 3. Ambil Rekap Transaksi + Detail Item-nya (Aman dari Error Kolom Tanggal/Created_at)
export async function getRekapTransaksi() {
  try {
    // Ambil seluruh transaksi tanpa sorting lewat .order() agar tidak error jika kolom waktu berbeda
    const { data: transaksi, error: errTrx } = await supabase
      .from("transaksi")
      .select("*");

    const { data: detail, error: errDetail } = await supabase
      .from("detail_transaksi")
      .select("*");

    if (errTrx || errDetail) {
      console.error("Gagal ambil rekap:", errTrx?.message || errDetail?.message);
      return [];
    }

    const combined = (transaksi || []).map((trx) => {
      const items = (detail || []).filter(
        (d) => 
          d.id_transaksi === trx.nomor_nota || 
          d.transaksi_id === trx.id || 
          d.transaksi_id === trx.nomor_nota
      );
      return { ...trx, items };
    });

    // Urutkan secara lokal berdasarkan kolom waktu yang tersedia (fallback ke id jika tidak ada)
    combined.sort((a, b) => {
      const timeA = new Date(a.created_at || a.tanggal || a.updated_at || 0).getTime();
      const timeB = new Date(b.created_at || b.tanggal || b.updated_at || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return Number(b.id || 0) - Number(a.id || 0);
    });

    return combined;
  } catch (err: any) {
    console.error("Error getRekapTransaksi:", err.message);
    return [];
  }
}

// 4. Simpan Transaksi Kasir (Otomatis Simpan Mekanik & Kurangi Stok)
export async function simpanTransaksi(payload: any) {
  try {
    // A. Simpan Header Transaksi (Termasuk Mekanik)
    const { error: errTrx } = await supabase.from("transaksi").insert([
      {
        nomor_nota: payload.nomorNota,
        nama_pelanggan: payload.namaPelanggan,
        plat_nomor: payload.platNomor,
        total_belanja: payload.totalBelanja,
        metode_bayar: payload.metodeBayar,
        status_bayar: "LUNAS",
        mekanik: payload.mekanik || "Budi", // 👈 Menyimpan nama mekanik ke database Supabase
      },
    ]);

    if (errTrx) throw new Error(errTrx.message);

    // B. Simpan Detail Item & Kurangi Stok Part
    for (const item of payload.items) {
      await supabase.from("detail_transaksi").insert([
        {
          id_transaksi: payload.nomorNota,
          jenis: item.jenis,
          nama_item: item.nama || item.nama_part,
          qty: item.qty,
          harga_satuan: item.harga_jual || item.harga || item.hargaSatuan,
          subtotal: item.subtotal,
        },
      ]);

      // Jika item berupa PART, kurangi stok di database Supabase
      if (item.jenis === "PART") {
        const partId = item.id || item.id_part;

        if (partId) {
          const { data: partData, error: errFetch } = await supabase
            .from("part")
            .select("stok")
            .eq("id", partId)
            .single();

          if (!errFetch && partData) {
            const stokBaru = Math.max(0, Number(partData.stok) - Number(item.qty));
            await supabase
              .from("part")
              .update({ stok: stokBaru })
              .eq("id", partId);
          }
        }
      }
    }

    return { status: "success" };
  } catch (err: any) {
    console.error("Error checkout:", err);
    return { status: "error", message: err.message };
  }
}