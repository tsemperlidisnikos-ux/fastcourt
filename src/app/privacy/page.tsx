import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-[#0f172a]">
      <h1 className="mb-4 text-2xl font-semibold">Privacy Policy</h1>
      <p className="mb-4 text-sm leading-relaxed text-[#475569]">
        FastCourt stores your plays and account data locally in your browser
        (IndexedDB) unless you enable cloud mode with Supabase. When cloud mode is
        on, library data may sync to your organization&apos;s Supabase project.
      </p>
      <p className="mb-4 text-sm leading-relaxed text-[#475569]">
        We do not sell personal data. Contact{" "}
        <a href="mailto:admin@fastcourt.eu" className="text-[#2563eb] underline">
          admin@fastcourt.eu
        </a>{" "}
        for privacy requests.
      </p>
      <Link href="/" className="text-sm text-[#2563eb] underline">
        Home
      </Link>
    </main>
  );
}
