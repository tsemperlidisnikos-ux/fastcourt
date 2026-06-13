export type PaymentMethodId = "stripe" | "paypal" | "viva" | "revolut" | "bank";

export interface LinkPaymentMethodConfig {
  enabled: boolean;
  url: string;
  urlMonthly: string;
}

export interface BankPaymentMethodConfig {
  enabled: boolean;
  iban: string;
  accountName: string;
  bankName: string;
  referenceNote: string;
}

export type PaymentMethodConfig =
  | LinkPaymentMethodConfig
  | BankPaymentMethodConfig;

export interface PaymentMethodsConfig {
  stripe: LinkPaymentMethodConfig;
  paypal: LinkPaymentMethodConfig;
  viva: LinkPaymentMethodConfig;
  revolut: LinkPaymentMethodConfig;
  bank: BankPaymentMethodConfig;
}

export interface ActivePaymentMethod {
  id: PaymentMethodId;
  label: string;
  kind: "link" | "bank";
  interval: "annual" | "monthly";
  url: string;
  bank: {
    iban: string;
    accountName: string;
    bankName: string;
    referenceNote: string;
  } | null;
}
