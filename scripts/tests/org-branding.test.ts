import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coachMayCustomizeBranding,
  mergeOrgBrandingIntoPdfBrand,
  orgBrandingToPdfBrand,
  shouldApplyOrgBranding,
} from "../../src/lib/settings/org-branding.ts";
import { DEFAULT_PDF_BRAND } from "../../src/lib/settings/pdf-branding.ts";
import type { TeamOrganization } from "../../src/types/team-org.ts";
import type { SessionUser } from "../../src/types/auth.ts";
import { ROLES } from "../../src/lib/config.ts";

function baseUser(): SessionUser {
  return {
    id: "user-1",
    email: "coach@club.com",
    displayName: "Coach",
    role: ROLES.coach,
    accessType: "trial",
    expiresAt: null,
    organizationId: "org-1",
    organizationName: "Athens BC",
  };
}

function baseOrg(): TeamOrganization {
  return {
    id: "org-1",
    name: "Athens BC",
    teamAdminEmail: "admin@club.com",
    coachSeats: 5,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    coaches: [],
    players: [],
    branding: {
      clubName: "Athens BC Official",
      headerColor: "#112233",
      allowCoachBranding: false,
    },
  };
}

describe("org branding", () => {
  it("converts org branding to pdf brand", () => {
    const brand = orgBrandingToPdfBrand(baseOrg().branding, "Athens BC");
    assert.equal(brand?.clubName, "Athens BC Official");
    assert.equal(brand?.headerColor, "#112233");
  });

  it("forces org branding when coaches cannot customize", () => {
    const org = baseOrg();
    assert.equal(coachMayCustomizeBranding(org), false);
    assert.equal(shouldApplyOrgBranding(baseUser(), org, false), true);
  });

  it("merges org branding over personal pdf settings when forced", () => {
    const merged = mergeOrgBrandingIntoPdfBrand(
      { ...DEFAULT_PDF_BRAND, clubName: "Personal" },
      baseOrg(),
      true,
    );
    assert.equal(merged.clubName, "Athens BC Official");
  });
});
