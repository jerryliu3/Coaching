export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const parsed = await pdfParse.default(buffer);
    return parsed.text?.trim() || "";
  } catch {
    return buffer.toString("latin1").replace(/[^\n\r\t\x20-\x7E]/g, " ");
  }
}
