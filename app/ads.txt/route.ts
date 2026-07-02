import { ADSENSE_CLIENT_ID } from "@/lib/site";

// Authorised-sellers file for AdSense. Derived from the publisher ID so there's
// one source of truth. Returns 404 until the ID is set, so we never publish a
// placeholder that would fail Google's ads.txt check.
export async function GET() {
  if (!ADSENSE_CLIENT_ID) {
    return new Response("Not found", { status: 404 });
  }

  // ads.txt uses the "pub-…" form (no "ca-" prefix). The trailing hash is
  // Google's fixed certification-authority ID, the same for every AdSense site.
  const pubId = ADSENSE_CLIENT_ID.replace(/^ca-/, "");
  const body = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;

  return new Response(body, {
    headers: { "content-type": "text/plain" },
  });
}
