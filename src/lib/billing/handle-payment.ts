import type { ActivePaymentMethod } from "@/types/payment-methods";
import { appNotice } from "@/stores/dialog-store";

export function handlePaymentMethod(method: ActivePaymentMethod): void {
  if (method.kind === "bank" && method.bank) {
    const lines = [
      method.bank.accountName ? `Account: ${method.bank.accountName}` : "",
      method.bank.bankName ? `Bank: ${method.bank.bankName}` : "",
      `IBAN: ${method.bank.iban}`,
      method.bank.referenceNote ? `Reference: ${method.bank.referenceNote}` : "",
    ].filter(Boolean);
    const text = lines.join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(method.bank.iban);
    }
    appNotice(
      method.label,
      `${text}\n\nIBAN copied to clipboard.`,
    );
    return;
  }
  if (method.url) {
    window.open(method.url, "_blank", "noopener,noreferrer");
  }
}
