import { trustItems } from "../data/trustItems";

const TrustBar = () => {
  return (
    <section
      aria-label="Key product highlights"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      {trustItems.map((item) => (
        <div
          key={item}
          className="border-border bg-card/75 text-muted rounded-full border px-4 py-2 text-center text-xs font-semibold tracking-[0.16em] uppercase"
        >
          {item}
        </div>
      ))}
    </section>
  );
};

export default TrustBar;
