// utils/bluetoothPrinter.ts
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { generateEscPosReceipt } from './printHelper';

const PRINTER_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const PRINTER_CHARACTERISTIC = "0000ff02-0000-1000-8000-00805f9b34fb";

export async function printReceipt(transactionData: any) {
  try {
    await BleClient.initialize();

    const enabled = await BleClient.isEnabled();
    if (!enabled) {
      alert("Bluetooth belum aktif. Silakan aktifkan Bluetooth terlebih dahulu.");
      return;
    }

    alert("Mencari printer thermal terdekat...");
    
    let foundDevice: ScanResult | null = null;

    await BleClient.requestLEScan({}, (result) => {
      // Cari perangkat dengan nama mengandung printer atau service yang cocok
      if (result.device.name && (
          result.device.name.toLowerCase().includes("printer") || 
          result.device.name.toLowerCase().includes("pos") ||
          result.device.name.toLowerCase().includes(" MTP") ||
          result.device.name.toLowerCase().includes("MPT")
      )) {
        foundDevice = result;
      }
    });

    // Tunggu proses scanning selama 4 detik
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await BleClient.stopLEScan();

    if (!foundDevice) {
      // Jika tidak ketemu berdasarkan nama, fallback pakai requestDevice standar
      try {
        const device = await BleClient.requestDevice({});
        if (device) {
          foundDevice = { device } as any;
        }
      } catch {
        // Abaikan user cancel
      }
    }

    const targetDevice = (foundDevice as any)?.device || (foundDevice as any);
    if (!targetDevice || !targetDevice.deviceId) {
      alert("Tidak ada printer thermal yang ditemukan atau dipilih.");
      return;
    }

    alert("Menghubungkan ke " + (targetDevice.name || "Printer") + "...");
    await BleClient.connect(targetDevice.deviceId, (disconnectedDeviceId) => {
      console.log("Printer terputus:", disconnectedDeviceId);
    });

    const buffer = generateEscPosReceipt(transactionData);

    const CHUNK_SIZE = 512;
    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      const chunk = buffer.slice(i, i + CHUNK_SIZE);
      const dataView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      
      await BleClient.write(
        targetDevice.deviceId,
        PRINTER_SERVICE,
        PRINTER_CHARACTERISTIC,
        dataView
      );
    }

    await BleClient.disconnect(targetDevice.deviceId);
    alert("✅ Struk berhasil dicetak!");

  } catch (error: any) {
    console.error("Gagal mencetak via Capacitor BLE:", error);
    alert("Gagal mencetak: " + (error.message || "Terjadi kesalahan Bluetooth"));
  }
}