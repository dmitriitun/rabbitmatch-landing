/**
 * Renders a JSON-LD `<script>`.
 *
 * `dangerouslySetInnerHTML` is the documented way to emit structured data in
 * React — the payload is JSON we serialise ourselves, never user input, and
 * React would otherwise HTML-escape the quotes and break the parser.
 */
export function JsonLd({ data }: { data: string }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: data }}
    />
  );
}
