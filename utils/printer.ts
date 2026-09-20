// utils/printer.ts
import { Capacitor } from "@capacitor/core";
import { printViaBluetoothSerial } from "./bluetoothSerialPrinter";

function isCapacitorEnvironment() {
  return Capacitor.isNativePlatform();
}

export async function printReceipt(transactionData: any): Promise<boolean> {
  try {
    if (isCapacitorEnvironment()) {
      // Android APK - gunakan Bluetooth Serial (Bluetooth Classic SPP)
      return await printViaBluetoothSerial(transactionData);
    }

    // Web/Desktop - tidak mendukung printer thermal langsung
    alert("Pencetakan thermal hanya didukung di aplikasi Android APK. Gunakan browser print untuk alternatif.");
    return false;
  } catch (error: any) {
    console.error("Gagal mencetak struk:", error);
    alert("Gagal mencetak: " + (error?.message || "Kesalahan printer"));
    return false;
  }
}