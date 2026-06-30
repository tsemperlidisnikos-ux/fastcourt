"use client";



import { useMemo, useState } from "react";

import { DEFAULT_TRIAL_DAYS } from "@/lib/config";
import {
  withDefaultTrialDays,
} from "@/lib/settings/billing-config";
import { previewLandingPricing } from "@/lib/landing/pricing";
import {

  getActivePaymentMethodsForConfig,

  PAYMENT_METHOD_LABELS,

  PAYMENT_METHOD_ORDER,

  validatePaymentMethods,

} from "@/lib/settings/payment-methods";

import type { BillingConfig, LandingPricingConfig } from "@/types/billing-config";

import type { AdminUserRecord } from "@/types/admin-user";

import type {

  LinkPaymentMethodConfig,

  PaymentMethodId,

} from "@/types/payment-methods";



export function BillingSection({

  config,

  users,

  onChange,

}: {

  config: BillingConfig;

  users: AdminUserRecord[];

  onChange: (next: BillingConfig) => void;

}) {

  const coaches = users.filter((u) => u.role === "coach");

  const trials = users.filter((u) => u.accessType === "trial").length;

  const [previewInterval, setPreviewInterval] = useState<"annual" | "monthly">(

    "annual",

  );



  const validationErrors = useMemo(

    () => validatePaymentMethods(config.methods),

    [config.methods],

  );



  const previewMethods = useMemo(

    () => getActivePaymentMethodsForConfig(config.methods, previewInterval),

    [config.methods, previewInterval],

  );

  const landingPreview = useMemo(
    () => previewLandingPricing(config.landingPricing),
    [config.landingPricing],
  );



  function patch<K extends keyof BillingConfig>(key: K, value: BillingConfig[K]) {

    onChange({ ...config, [key]: value });

  }



  function patchLandingPricing(patchValue: Partial<LandingPricingConfig>) {
    onChange({
      ...config,
      landingPricing: { ...config.landingPricing, ...patchValue },
    });
  }



  function patchLinkMethod(

    id: Exclude<PaymentMethodId, "bank">,

    patch: Partial<LinkPaymentMethodConfig>,

  ) {

    onChange({

      ...config,

      methods: {

        ...config.methods,

        [id]: { ...config.methods[id], ...patch },

      },

    });

  }



  function patchBankMethod(

    patch: Partial<typeof config.methods.bank>,

  ) {

    onChange({

      ...config,

      methods: {

        ...config.methods,

        bank: { ...config.methods.bank, ...patch },

      },

    });

  }



  return (

    <div className="admin-billing-panel">

      <div className="admin-content-overview">

        <div className="admin-content-overview-title">Billing &amp; setup</div>

        <p className="admin-billing-help">

          Subscription defaults, payment methods, and device limits for coaches.

          Saved with Apply.

        </p>

      </div>



      <div className="admin-billing-stats">

        <div className="admin-stat-card">

          <span className="admin-stat-num">{users.length}</span>

          <span className="admin-stat-label">Total users</span>

        </div>

        <div className="admin-stat-card">

          <span className="admin-stat-num">{coaches.length}</span>

          <span className="admin-stat-label">Coaches</span>

        </div>

        <div className="admin-stat-card">

          <span className="admin-stat-num">{trials}</span>

          <span className="admin-stat-label">On trial</span>

        </div>

      </div>



      <div className="admin-billing-form">

        <div className="admin-billing-row">

          <label className="admin-billing-field">

            <span>Support email</span>

            <input

              type="email"

              value={config.supportEmail}

              onChange={(e) => patch("supportEmail", e.target.value)}

            />

          </label>

          <label className="admin-billing-field">

            <span>Default trial days</span>

            <input

              type="number"

              min={1}

              max={90}

              value={config.defaultTrialDays}

              onChange={(e) =>
                onChange(
                  withDefaultTrialDays(
                    config,
                    Number(e.target.value) || DEFAULT_TRIAL_DAYS,
                  ),
                )
              }

            />

          </label>

        </div>

        <label className="admin-billing-field">

          <span>Device limit per coach</span>

          <input

            type="number"

            min={1}

            max={10}

            value={config.deviceLimitPerCoach}

            onChange={(e) =>

              patch("deviceLimitPerCoach", Number(e.target.value) || 2)

            }

          />

        </label>



        <div className="org-settings-sublabel">Landing page pricing</div>

        <p className="admin-billing-help">

          Prices shown on the public homepage pricing section. Monthly amounts for

          yearly billing are calculated automatically (yearly total ÷ 12).

        </p>



        <div className="admin-billing-row">

          <label className="admin-billing-field">

            <span>Individual yearly (€)</span>

            <input

              type="number"

              min={0}

              step={1}

              value={config.landingPricing.individualYearlyEur}

              onChange={(e) =>

                patchLandingPricing({

                  individualYearlyEur: Number(e.target.value),

                })

              }

            />

          </label>

          <label className="admin-billing-field">

            <span>Individual monthly (€)</span>

            <input

              type="number"

              min={0}

              step={0.5}

              value={config.landingPricing.individualMonthlyEur}

              onChange={(e) =>

                patchLandingPricing({

                  individualMonthlyEur: Number(e.target.value),

                })

              }

            />

          </label>

        </div>



        <div className="admin-billing-row">

          <label className="admin-billing-field">

            <span>Club admin yearly (€)</span>

            <input

              type="number"

              min={0}

              step={1}

              value={config.landingPricing.clubAdminYearlyEur}

              onChange={(e) =>

                patchLandingPricing({ clubAdminYearlyEur: Number(e.target.value) })

              }

            />

          </label>

          <label className="admin-billing-field">

            <span>Yearly save badge (%)</span>

            <input

              type="number"

              min={0}

              max={90}

              value={config.landingPricing.yearlySavePercent}

              onChange={(e) =>

                patchLandingPricing({ yearlySavePercent: Number(e.target.value) })

              }

            />

          </label>

        </div>



        <div className="admin-billing-row">

          <label className="admin-billing-field">

            <span>Coach seat yearly (€)</span>

            <input

              type="number"

              min={0}

              step={1}

              value={config.landingPricing.clubCoachSeatYearlyEur}

              onChange={(e) =>

                patchLandingPricing({

                  clubCoachSeatYearlyEur: Number(e.target.value),

                })

              }

            />

          </label>

          <label className="admin-billing-field">

            <span>Coach seat monthly (€)</span>

            <input

              type="number"

              min={0}

              step={0.5}

              value={config.landingPricing.clubCoachSeatMonthlyEur}

              onChange={(e) =>

                patchLandingPricing({

                  clubCoachSeatMonthlyEur: Number(e.target.value),

                })

              }

            />

          </label>

        </div>



        <div className="admin-billing-row">

          <label className="admin-billing-field">

            <span>Club slider min coaches</span>

            <input

              type="number"

              min={1}

              max={50}

              value={config.landingPricing.clubCoachMin}

              onChange={(e) =>

                patchLandingPricing({ clubCoachMin: Number(e.target.value) })

              }

            />

          </label>

          <label className="admin-billing-field">

            <span>Club slider max coaches</span>

            <input

              type="number"

              min={1}

              max={100}

              value={config.landingPricing.clubCoachMax}

              onChange={(e) =>

                patchLandingPricing({ clubCoachMax: Number(e.target.value) })

              }

            />

          </label>

          <label className="admin-billing-field">

            <span>Default coach count</span>

            <input

              type="number"

              min={1}

              max={100}

              value={config.landingPricing.clubCoachDefault}

              onChange={(e) =>

                patchLandingPricing({ clubCoachDefault: Number(e.target.value) })

              }

            />

          </label>

        </div>



        <div className="admin-billing-preview admin-billing-preview-compact">

          <div className="admin-section-title">Landing preview</div>

          <p className="admin-billing-help">

            Individual yearly billing: €{landingPreview.individualYearlyMonthly.toFixed(2)}/mo ·

            Individual monthly billing: €{landingPreview.individualMonthly.toFixed(2)}/mo ·

            Club ({landingPreview.seats} coaches) yearly billing: €

            {landingPreview.clubYearlyMonthly.toFixed(2)}/mo

          </p>

        </div>



        <div className="org-settings-sublabel">Payment methods</div>

        <p className="admin-billing-help">

          Enable providers and add payment URLs. Coaches see active methods when

          subscribing. Bank transfer shows IBAN details instead of a link.

        </p>



        {validationErrors.length > 0 ? (

          <div className="admin-billing-validation" role="alert">

            {validationErrors.map((err) => (

              <p key={err}>{err}</p>

            ))}

          </div>

        ) : null}



        <div className="admin-payment-methods-grid">

          {PAYMENT_METHOD_ORDER.filter((id) => id !== "bank").map((id) => {

            const method = config.methods[id];

            return (

              <div key={id} className="admin-payment-method-card">

                <label className="admin-payment-enable">

                  <input

                    type="checkbox"

                    checked={method.enabled}

                    onChange={(e) =>

                      patchLinkMethod(id, { enabled: e.target.checked })

                    }

                  />

                  {PAYMENT_METHOD_LABELS[id]}

                </label>

                <label className="admin-billing-field">

                  <span>Annual payment URL</span>

                  <input

                    type="url"

                    value={method.url}

                    onChange={(e) => patchLinkMethod(id, { url: e.target.value })}

                    placeholder="https://"

                    autoComplete="off"

                  />

                </label>

                <label className="admin-billing-field">

                  <span>Monthly payment URL (optional)</span>

                  <input

                    type="url"

                    value={method.urlMonthly}

                    onChange={(e) =>

                      patchLinkMethod(id, { urlMonthly: e.target.value })

                    }

                    placeholder="Uses annual URL if empty"

                    autoComplete="off"

                  />

                </label>

              </div>

            );

          })}



          <div className="admin-payment-method-card admin-payment-method-card-wide">

            <label className="admin-payment-enable">

              <input

                type="checkbox"

                checked={config.methods.bank.enabled}

                onChange={(e) =>

                  patchBankMethod({ enabled: e.target.checked })

                }

              />

              {PAYMENT_METHOD_LABELS.bank}

            </label>

            <div className="admin-billing-row">

              <label className="admin-billing-field">

                <span>IBAN</span>

                <input

                  type="text"

                  value={config.methods.bank.iban}

                  onChange={(e) => patchBankMethod({ iban: e.target.value })}

                  placeholder="GRxx xxxx xxxx xxxx xxxx xxxx xxx"

                  autoComplete="off"

                />

              </label>

              <label className="admin-billing-field">

                <span>Account holder</span>

                <input

                  type="text"

                  value={config.methods.bank.accountName}

                  onChange={(e) =>

                    patchBankMethod({ accountName: e.target.value })

                  }

                  placeholder="Company / Name"

                  autoComplete="off"

                />

              </label>

            </div>

            <label className="admin-billing-field">

              <span>Bank name</span>

              <input

                type="text"

                value={config.methods.bank.bankName}

                onChange={(e) => patchBankMethod({ bankName: e.target.value })}

                placeholder="Bank name"

                autoComplete="off"

              />

            </label>

            <label className="admin-billing-field">

              <span>Reference note (shown to coach)</span>

              <input

                type="text"

                value={config.methods.bank.referenceNote}

                onChange={(e) =>

                  patchBankMethod({ referenceNote: e.target.value })

                }

                placeholder="Use your signup email as payment reference."

              />

            </label>

          </div>

        </div>



        <div className="admin-billing-preview">

          <div className="admin-billing-head">

            <div>

              <div className="admin-section-title">Coach preview</div>

              <p className="admin-billing-help">

                Payment buttons coaches see when their trial ends.

              </p>

            </div>

            <div className="admin-billing-preview-interval">

              <button

                type="button"

                className={previewInterval === "annual" ? "is-active" : ""}

                onClick={() => setPreviewInterval("annual")}

              >

                Annual

              </button>

              <button

                type="button"

                className={previewInterval === "monthly" ? "is-active" : ""}

                onClick={() => setPreviewInterval("monthly")}

              >

                Monthly

              </button>

            </div>

          </div>

          {previewMethods.length === 0 ? (

            <p className="admin-billing-preview-empty">

              No payment methods configured yet.

            </p>

          ) : (

            <div className="admin-billing-preview-methods">

              {previewMethods.map((method) => (

                <button

                  key={`${method.id}-${method.interval}`}

                  type="button"

                  className={`payment-method-btn payment-method-btn-${method.id}`}

                  disabled

                >

                  {method.label}

                </button>

              ))}

            </div>

          )}

        </div>



        <div className="admin-billing-plans">

          <div className="org-settings-sublabel">Plans</div>

          {config.plans.map((plan, idx) => (

            <div key={plan.id} className="admin-billing-row">

              <label className="admin-billing-field">

                <span>Plan label</span>

                <input

                  type="text"

                  value={plan.label}

                  onChange={(e) => {

                    const plans = [...config.plans];

                    plans[idx] = { ...plan, label: e.target.value };

                    patch("plans", plans);

                  }}

                />

              </label>

              <label className="admin-billing-field">

                <span>Price label</span>

                <input

                  type="text"

                  value={plan.priceLabel}

                  onChange={(e) => {

                    const plans = [...config.plans];

                    plans[idx] = { ...plan, priceLabel: e.target.value };

                    patch("plans", plans);

                  }}

                />

              </label>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}


