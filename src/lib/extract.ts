import { MAX_FILE_BYTES, MAX_RESUME_CHARS } from "./schema.ts";
export async function extractResume(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Choose a file smaller than 3 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "pdf" && extension !== "docx") throw new Error("Choose a PDF or DOCX file, or paste your resume text.");
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let text = "";
  if (extension === "pdf") {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("This file is not a valid PDF.");
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const loading = pdfjs.getDocument({ data: bytes, useSystemFonts: true, disableFontFace: true });
    try {
      const pdf = await loading.promise;
      if (pdf.numPages > 20) throw new Error("Please use a resume with 20 pages or fewer.");
      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index);
        const content = await page.getTextContent();
        text += content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("") + "\n";
        page.cleanup();
        if (text.length > MAX_RESUME_CHARS) throw new Error("The extracted resume is too long. Paste a shorter version (8,000 characters maximum).");
      }
    } finally { await loading.destroy(); }
  } else {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("This file is not a valid DOCX document.");
    // Raw text only: never render user-supplied document HTML.
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    text = result.value;
  }
  text = text.replace(/\u0000/g, "").trim();
  if (text.length < 100) throw new Error("Not enough text was found. Scanned PDFs need OCR first; you can also paste your resume text.");
  if (text.length > MAX_RESUME_CHARS) throw new Error("The extracted resume is too long. Paste a shorter version (8,000 characters maximum).");
  return text;
}
