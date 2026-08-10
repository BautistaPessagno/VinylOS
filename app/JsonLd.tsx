/**
 * Structured-data block.
 *
 * Titles and artist names come from Discogs and Last.fm, so `<` is escaped to
 * stop a stray `</script>` in third-party text from closing the tag early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
