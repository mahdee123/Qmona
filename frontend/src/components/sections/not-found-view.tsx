import { ButtonLink } from "@/components/ui/button";

export function NotFoundView() {
  return (
    <section className="container-q flex flex-1 flex-col items-center justify-center py-28 text-center">
      <p className="text-[0.9375rem] font-medium text-accent">404</p>
      <h1 className="t-h1 mt-4">This page could not be found.</h1>
      <p className="t-lead mt-5 max-w-lg">The link may be outdated, or the page may have moved or not been published yet.</p>
      <div className="mt-10 flex flex-col gap-4 tablet:flex-row">
        <ButtonLink href="/" arrow>Back to home</ButtonLink>
        <ButtonLink href="/work" variant="secondary">See our work</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">Contact us</ButtonLink>
      </div>
    </section>
  );
}
