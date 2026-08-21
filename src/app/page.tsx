import { redirect } from "next/navigation";

/** App entry — no marketing landing; go straight into the product. */
export default function HomePage() {
  redirect("/library");
}
