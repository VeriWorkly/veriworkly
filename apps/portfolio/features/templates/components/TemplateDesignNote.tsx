import Image from "next/image";

const TemplateDesignNote = () => {
  return (
    <section className="mx-auto mb-16 w-[min(1280px,calc(100%-48px))] max-sm:w-[min(calc(100%-30px),1280px)]">
      <div className="border-ink-2 bg-panel/70 relative overflow-hidden rounded-3xl border-2 p-6 shadow-[10px_12px_0_rgba(37,99,235,0.06)] md:p-10 dark:border-white/12">
        <div className="bg-accent/5 pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-bl-full" />

        <div className="max-w-3xl">
          <span className="text-accent text-[11px] font-bold tracking-[0.16em] uppercase">
            A Note on Design Taste
          </span>

          <h3 className="text-ink-2 mt-4 text-2xl leading-tight font-bold tracking-[-0.04em] md:text-3xl">
            No cards-inside-cards slop. Just clean presentation.
          </h3>

          <p className="text-ink-2/70 mt-4 text-sm leading-7">
            Most website builders overwhelm your content with heavy drop shadows, overdesigned card
            patterns, and generic layout noise. We designed VeriWorkly templates with a strict
            typographic focus: wide editorial margins, high-contrast readability, and balanced line
            lengths. Your accomplishments are the star; the template is just the stage.
          </p>

          <div className="mt-8 flex items-center gap-3.5">
            <div className="border-ink flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold text-white shadow-md">
              <Image
                priority
                width={28}
                height={28}
                alt="VeriWorkly Logo"
                src="/veriworkly-logo.png"
              />
            </div>

            <div>
              <p className="text-ink-2 text-xs font-bold">VeriWorkly Team</p>
              <p className="text-ink-2/80 text-[10px]">Crafted with care 💝</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TemplateDesignNote;
