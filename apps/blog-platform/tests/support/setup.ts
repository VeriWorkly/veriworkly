import { vi } from "vitest";

// next/font/google is a build-time transform; outside Next the loaders are not functions.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "", variable: "", style: { fontFamily: "" } });

  return { Geist: font, Geist_Mono: font };
});
