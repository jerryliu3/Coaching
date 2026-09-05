import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { RevisionTree } from "./types";

function contactLine(tree: RevisionTree) {
  const c = tree.contact;
  return [c.email, c.phone, c.linkedin, c.github, [c.location_city, c.location_region].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" | ");
}

function dateRange(start: string | null, end: string | null, current: boolean) {
  if (!start && !end) return "";
  return `${start ?? ""} - ${current ? "Present" : end ?? ""}`.trim();
}

export async function exportDocx(tree: RevisionTree) {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun(tree.contact.full_name || "Resume")],
    }),
    new Paragraph({ children: [new TextRun({ text: contactLine(tree), size: 20 })] }),
  ];

  const comments: string[] = [];
  for (const section of tree.sections) {
    if (section.kind === "contact") continue;
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(section.heading || section.kind)],
      }),
    );
    for (const entry of section.entries) {
      const left = [entry.org_name, entry.role_title].filter(Boolean).join(" — ");
      const right = dateRange(entry.start_date, entry.end_date, entry.is_current);
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: left, bold: true }),
            new TextRun({ text: right ? `    ${right}` : "" }),
          ],
        }),
      );
      if (entry.location || entry.url) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: [entry.location, entry.url].filter(Boolean).join(" · ") })],
          }),
        );
      }
      if (entry.gpa || entry.courses) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: [entry.gpa && `GPA: ${entry.gpa}`, entry.courses && `Relevant Courses: ${entry.courses}`]
                  .filter(Boolean)
                  .join(" | "),
              }),
            ],
          }),
        );
      }
      for (const bullet of entry.bullets) {
        children.push(new Paragraph({ text: bullet.current_text, bullet: { level: 0 } }));
      }
      for (const comment of entry.comments.concat(tree.comments).filter((c) => c.status === "open" && (c.entry_id === entry.id || c.bullet_id && entry.bullets.some((b) => b.id === c.bullet_id)))) {
        comments.push(`${left}: ${comment.body}`);
      }
    }
  }

  if (comments.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Reviewer comments")] }));
    for (const c of comments) children.push(new Paragraph({ text: c, bullet: { level: 0 } }));
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export async function exportPdf(tree: RevisionTree) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage();
  let y = page.getHeight() - 48;
  const write = (text: string, size = 11, isBold = false) => {
    if (y < 48) {
      page = pdf.addPage();
      y = page.getHeight() - 48;
    }
    page.drawText(text.slice(0, 110), { x: 48, y, size, font: isBold ? bold : font });
    y -= size + 6;
  };
  write(tree.contact.full_name || "Resume", 18, true);
  write(contactLine(tree), 10);
  for (const section of tree.sections) {
    if (section.kind === "contact") continue;
    y -= 8;
    write(section.heading || section.kind, 14, true);
    for (const entry of section.entries) {
      write([entry.org_name, entry.role_title].filter(Boolean).join(" — "), 12, true);
      for (const bullet of entry.bullets) write(`• ${bullet.current_text}`, 10);
    }
  }
  return Buffer.from(await pdf.save());
}
