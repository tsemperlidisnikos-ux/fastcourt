import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-[#0f172a]">
      <h1 className="mb-4 text-2xl font-semibold">Terms of Service</h1>
      <p className="mb-4 text-sm leading-relaxed text-[#475569]">
        FastCourt is provided for coaching and tactical diagramming. You are
        responsible for the content you create and share. Trial and subscription
        terms shown in the app apply to your account tier.
      </p>
      <p className="mb-4 text-sm leading-relaxed text-[#475569]">
        The service is provided as-is. For support contact{" "}
        <a href="mailto:admin@fastcourt.eu" className="text-[#2563eb] underline">
          admin@fastcourt.eu
        </a>
        .
      </p>
      <Link href="/login" className="text-sm text-[#2563eb] underline">
        Back to login
      </Link>
    </main>
  );
}
