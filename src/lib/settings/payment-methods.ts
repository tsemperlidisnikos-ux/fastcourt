import type {
  ActivePaymentMethod,
  BankPaymentMethodConfig,
  LinkPaymentMethodConfig,
  PaymentMethodId,
  PaymentMethodsConfig,
} from "@/types/payment-methods";

export const PAYMENT_METHOD_ORDER: PaymentMethodId[] = [
  "stripe",
  "paypal",
  "viva",
  "revolut",
  "bank",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  stripe: "Card (Stripe)",
  paypal: "PayPal",
  viva: "Viva Wallet",
  revolut: "Revolut",
  bank: "Bank transfer",
};

export function getDefaultPaymentMethods(): PaymentMethodsConfig {
  return {
    stripe: { enabled: false, url: "", urlMonthly: "" },
    paypal: { enabled: false, url: "", urlMonthly: "" },
    viva: { enabled: false, url: "", urlMonthly: "" },
    revolut: { enabled: false, url: "", urlMonthly: "" },
    bank: {
      enabled: false,
      iban: "",
      accountName: "",
      bankName: "",
      referenceNote: "Use your signup email as the payment reference.",
    },
  };
}

export function normalizePaymentMethods(
  raw: Partial<PaymentMethodsConfig> | undefined,
): PaymentMethodsConfig {
  const base = getDefaultPaymentMethods();
  if (!raw || typeof raw !== "object") return base;
  const out = { ...base };
  for (const id of PAYMENT_METHOD_ORDER) {
    const input = raw[id];
    if (!input || typeof input !== "object") continue;
    if (id === "bank") {
      const bank = input as BankPaymentMethodConfig;
      out.bank = {
        enabled: !!bank.enabled,
        iban: String(bank.iban ?? "").trim(),
        accountName: String(bank.accountName ?? "").trim(),
        bankName: String(bank.bankName ?? "").trim(),
        referenceNote:
          String(bank.referenceNote ?? "").trim() || base.bank.referenceNote,
      };
    } else {
      const link = input as LinkPaymentMethodConfig;
      out[id] = {
        enabled: !!link.enabled,
        url: String(link.url ?? "").trim(),
        urlMonthly: String(link.urlMonthly ?? "").trim(),
      };
    }
  }
  return out;
}

export function resolvePaymentMethodUrl(
  method: LinkPaymentMethodConfig | undefined,
  interval: "annual" | "monthly" = "annual",
): string {
  if (!method) return "";
  if (interval === "monthly") {
    const monthly = String(method.urlMonthly || "").trim();
    if (monthly) return monthly;
  }
  return String(method.url || "").trim();
}

export function isPaymentMethodConfigured(
  id: PaymentMethodId,
  method: LinkPaymentMethodConfig | BankPaymentMethodConfig | undefined,
  interval: "annual" | "monthly" = "annual",
): boolean {
  if (!method?.enabled) return false;
  if (id === "bank") {
    return !!(method as BankPaymentMethodConfig).iban?.trim();
  }
  return !!resolvePaymentMethodUrl(method as LinkPaymentMethodConfig, interval);
}

export function getActivePaymentMethodsForConfig(
  methods: PaymentMethodsConfig,
  interval: "annual" | "monthly" = "annual",
): ActivePaymentMethod[] {
  return PAYMENT_METHOD_ORDER.filter((id) =>
    isPaymentMethodConfigured(id, methods[id], interval),
  ).map((id) => ({
    id,
    label: PAYMENT_METHOD_LABELS[id],
    kind: id === "bank" ? "bank" : "link",
    interval,
    url:
      id === "bank"
        ? ""
        : resolvePaymentMethodUrl(methods[id] as LinkPaymentMethodConfig, interval),
    bank:
      id === "bank"
        ? {
            iban: methods.bank.iban,
            accountName: methods.bank.accountName,
            bankName: methods.bank.bankName,
            referenceNote: methods.bank.referenceNote,
          }
        : null,
  }));
}

export function validatePaymentMethods(
  methods: PaymentMethodsConfig,
): string[] {
  const errors: string[] = [];
  for (const id of ["stripe", "paypal", "viva", "revolut"] as const) {
    const method = methods[id];
    if (method.enabled && !resolvePaymentMethodUrl(method, "annual")) {
      errors.push(
        `${PAYMENT_METHOD_LABELS[id]} is enabled but missing an annual payment URL.`,
      );
    }
  }
  if (methods.bank.enabled && !methods.bank.iban.trim()) {
    errors.push("Bank transfer is enabled but IBAN is missing.");
  }
  return errors;
}
