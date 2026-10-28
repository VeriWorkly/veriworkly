/** textkit's entry file, which `templates/pdf/textkit.ts` re-exports past the alias. */
declare module "@react-pdf/textkit/lib/textkit.js" {
  export * from "@react-pdf/textkit";
  export { default } from "@react-pdf/textkit";
}
