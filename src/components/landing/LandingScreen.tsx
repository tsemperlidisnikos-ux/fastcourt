"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { APP_NAME } from "@/lib/config";
import { usePublicBillingConfig } from "@/hooks/usePublicBillingConfig";
import {
  formatLandingTrialNote,
  LANDING_AUDIENCE,
  LANDING_FAQ,
  LANDING_FINAL_CTA,
  LANDING_HERO,
  LANDING_HERO_BG,
  LANDING_PILLARS,
} from "@/lib/landing/content";
import { LandingPricingSection } from "@/components/landing/LandingPricingSection";
import { LandingHeroLogoSync } from "@/components/landing/LandingHeroLogoSync";
import "@/styles/landing.css";

export function LandingScreen({ heroLogo }: { heroLogo: ReactNode }) {
  const billing = usePublicBillingConfig();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const trialDays = billing.defaultTrialDays;
  const trialNote = formatLandingTrialNote(trialDays);
  const contactHref = `mailto:${billing.supportEmail}?subject=${encodeURIComponent("FastCourt team inquiry")}`;

  useEffect(() => {
    if (!mobileNavOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen]);

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  return (
    <div className="fc-landing">
      <LandingHeroLogoSync />
      <header className="fc-landing-header">
        <button
          type="button"
          className="fc-landing-menu-btn"
          aria-expanded={mobileNavOpen}
          aria-controls="fc-landing-mobile-nav"
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          <span className="visually-hidden">{mobileNavOpen ? "Close menu" : "Open menu"}</span>
          <span className="fc-landing-menu-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <nav className="fc-landing-nav fc-landing-nav--desktop" aria-label="Primary">
          <a href="#features" className="fc-landing-nav-link">
            Features
          </a>
          <a href="#pricing" className="fc-landing-nav-link">
            Pricing
          </a>
          <a href="#faq" className="fc-landing-nav-link">
            FAQ
          </a>
        </nav>

        <div
          id="fc-landing-mobile-nav"
          className={`fc-landing-mobile-nav${mobileNavOpen ? " is-open" : ""}`}
          aria-hidden={!mobileNavOpen}
        >
          <button
            type="button"
            className="fc-landing-mobile-nav-backdrop"
            aria-label="Close menu"
            onClick={closeMobileNav}
          />
          <nav className="fc-landing-mobile-nav-panel" aria-label="Mobile">
            <div className="fc-landing-mobile-nav-head">
              <span className="fc-landing-mobile-nav-title">{APP_NAME}</span>
              <button
                type="button"
                className="fc-landing-mobile-nav-close"
                aria-label="Close menu"
                onClick={closeMobileNav}
              >
                ×
              </button>
            </div>
            <a href="#features" className="fc-landing-mobile-nav-link" onClick={closeMobileNav}>
              Features
            </a>
            <a href="#pricing" className="fc-landing-mobile-nav-link" onClick={closeMobileNav}>
              Pricing
            </a>
            <a href="#faq" className="fc-landing-mobile-nav-link" onClick={closeMobileNav}>
              FAQ
            </a>
            <Link
              href="/login"
              className="fc-landing-btn fc-landing-btn--outline fc-landing-btn--block"
              onClick={closeMobileNav}
            >
              Log in
            </Link>
            <Link
              href="/login?signup=1"
              className="fc-landing-btn fc-landing-btn--primary fc-landing-btn--block"
              onClick={closeMobileNav}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="fc-landing-main">
        <section className="fc-landing-hero" aria-labelledby="hero-heading">
          <div
            className="fc-landing-hero-bg"
            style={{ backgroundImage: `url(${LANDING_HERO_BG})` }}
            aria-hidden="true"
          />
          <div className="fc-landing-hero-inner">
            {heroLogo}
            <h1 id="hero-heading" className="fc-landing-hero-title">
              <span>{LANDING_HERO.headline[0]}</span>
              <span className="fc-landing-hero-title-accent">{LANDING_HERO.headline[1]}</span>
            </h1>
            <p className="fc-landing-hero-lead">{LANDING_HERO.subtitle}</p>
            <div className="fc-landing-hero-actions">
              <Link href="/login?signup=1" className="fc-landing-btn fc-landing-btn--primary fc-landing-btn--lg">
                {LANDING_HERO.ctaPrimary}
              </Link>
              <Link href="/login" className="fc-landing-btn fc-landing-btn--outline fc-landing-btn--lg">
                {LANDING_HERO.ctaSecondary}
              </Link>
            </div>
            <p className="fc-landing-hero-note">{trialNote}</p>
          </div>
        </section>

        <section className="fc-landing-section" id="features" aria-labelledby="features-heading">
          <div className="fc-landing-section-head">
            <h2 id="features-heading">Everything you need from draw to practice</h2>
            <p>One workflow for coaches who plan on the bench, in the office, and on the road.</p>
          </div>
          <div className="fc-landing-pillars">
            {LANDING_PILLARS.map((pillar) => (
              <article key={pillar.id} className="fc-landing-pillar">
                <div className="fc-landing-pillar-frame">
                  <Image
                    src={pillar.image}
                    alt={pillar.imageAlt}
                    width={760}
                    height={420}
                    className="fc-landing-pillar-image"
                  />
                </div>
                <h3>{pillar.title}</h3>
                <p>{pillar.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="fc-landing-section fc-landing-section--muted" aria-labelledby="audience-heading">
          <div className="fc-landing-section-head">
            <p className="fc-landing-eyebrow">Who it&apos;s for</p>
            <h2 id="audience-heading">{LANDING_AUDIENCE.title}</h2>
            <p>{LANDING_AUDIENCE.lead}</p>
          </div>
          <div className="fc-landing-audience">
            {LANDING_AUDIENCE.items.map((item) => (
              <article key={item.title} className="fc-landing-audience-card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <LandingPricingSection billing={billing} />

        <section className="fc-landing-section fc-landing-section--muted" id="faq" aria-labelledby="faq-heading">
          <div className="fc-landing-section-head">
            <p className="fc-landing-eyebrow">FAQ</p>
            <h2 id="faq-heading">Common questions</h2>
          </div>
          <div className="fc-landing-faq">
            {LANDING_FAQ.map((item) => (
              <details key={item.question} className="fc-landing-faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="fc-landing-cta-band" aria-labelledby="final-cta-heading">
          <h2 id="final-cta-heading">{LANDING_FINAL_CTA.title}</h2>
          <p>{LANDING_FINAL_CTA.subtitle}</p>
          <div className="fc-landing-cta-actions">
            <Link href="/login?signup=1" className="fc-landing-btn fc-landing-btn--primary fc-landing-btn--lg">
              {LANDING_FINAL_CTA.primary}
            </Link>
            <a href={contactHref} className="fc-landing-btn fc-landing-btn--outline fc-landing-btn--lg">
              {LANDING_FINAL_CTA.secondary}
            </a>
          </div>
        </section>
      </main>

      <footer className="fc-landing-footer">
        <div className="fc-landing-footer-inner">
          <p className="fc-landing-footer-copy">
            © {new Date().getFullYear()} {APP_NAME}. Basketball play designer for coaches.
          </p>
          <div className="fc-landing-footer-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/login">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
