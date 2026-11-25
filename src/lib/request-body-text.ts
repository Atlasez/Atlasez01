export async function readRequestTextLimited(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const contentLength = request.headers.get("content-length");
  const declaredLength =
    contentLength && /^\d+$/.test(contentLength) ? Number(contentLength) : null;
  if (declaredLength !== null && declaredLength > maxBytes) {
    await request.body?.cancel().catch(() => undefined);
    return null;
  }

  const reader = request.body?.getReader();
  if (!reader) return "";
  let bytes = new Uint8Array(declaredLength ?? 0);
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const nextByteLength = byteLength + value.byteLength;
      if (nextByteLength > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      if (nextByteLength > bytes.byteLength) {
        const capacity = Math.min(
          maxBytes,
          Math.max(16_384, bytes.byteLength * 2, nextByteLength),
        );
        const grown = new Uint8Array(capacity);
        grown.set(bytes.subarray(0, byteLength));
        bytes = grown;
      }
      bytes.set(value, byteLength);
      byteLength = nextByteLength;
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(bytes.subarray(0, byteLength));
}
