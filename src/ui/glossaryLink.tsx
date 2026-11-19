/** Glossary auto-linking. Phase 8 fills in the term index; until then text passes through unchanged. */
export function GlossaryAutoLink({ text }: { text: string; seen: Set<string> }) {
  return <>{text}</>;
}
