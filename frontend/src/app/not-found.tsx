import type { Metadata } from "next";
import PublicLayout from "./(public)/layout";
import { NotFoundView } from "@/components/sections/not-found-view";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Unmatched URLs: render the 404 inside the public header/footer. */
export default function RootNotFound() {
  return (
    <PublicLayout>
      <NotFoundView />
    </PublicLayout>
  );
}
