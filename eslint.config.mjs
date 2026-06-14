import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: [
      "src/components/library/PlaybookPrintDocument.tsx",
      "src/components/library/PlaybookPrintSettingsPanel.tsx",
      "src/components/library/PlayDetailsModal.tsx",
      "src/components/library/FdAppHeader.tsx",
      "src/components/library/PracticePrintDocument.tsx",
      "src/components/library/PracticeSheetDocument.tsx",
      "src/components/settings/AppearanceSettingsSection.tsx",
      "src/components/settings/ClubLogoUpload.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/pdf.worker.min.mjs",
    "server.js",
    "src/lib/fastdraw/legacy/**",
    "lint-report.json",
    "project-analysis.json",
  ]),
]);

export default eslintConfig;
