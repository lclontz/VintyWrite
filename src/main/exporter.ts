import fs from 'node:fs/promises'
import path from 'node:path'
import { BrowserWindow, app } from 'electron'
import { marked, type Token, type Tokens } from 'marked'
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  BorderStyle,
  UnderlineType,
  type IParagraphOptions,
  NumberFormat
} from 'docx'

// ─── Shared types ────────────────────────────────────────────────────────────

export interface ExportManifest {
  title: string
  files: Array<{ id: string; filename: string; title: string }>
}

// ─── HTML builder (used for PDF) ─────────────────────────────────────────────

function buildExportHtml(manifest: ExportManifest, fileContents: Record<string, string>): string {
  const sections = manifest.files
    .map((file) => {
      const md = fileContents[file.id] ?? ''
      const html = marked.parse(md) as string
      return `
        <div class="chapter">
          <h2 class="chapter-title">${escapeHtml(file.title)}</h2>
          <div class="chapter-body">${html}</div>
        </div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(manifest.title)}</title>
  <style>
    @media print {
      .chapter { page-break-before: always; }
      .chapter:first-child { page-break-before: avoid; }
    }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.7;
      color: #1a1a1a;
      max-width: 680px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1.book-title {
      font-size: 28pt;
      text-align: center;
      margin-bottom: 0.2em;
      border-bottom: 2px solid #333;
      padding-bottom: 0.4em;
    }
    h2.chapter-title {
      font-size: 18pt;
      margin-top: 2em;
      margin-bottom: 1em;
      border-bottom: 1px solid #ccc;
      padding-bottom: 0.3em;
    }
    h1, h2, h3, h4, h5, h6 { line-height: 1.3; margin-bottom: 0.5em; }
    h1 { font-size: 22pt; }
    h2 { font-size: 18pt; }
    h3 { font-size: 14pt; }
    p { margin: 0 0 0.9em; }
    code {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      background: #f4f4f4;
      padding: 1px 4px;
      border-radius: 2px;
    }
    pre {
      background: #f4f4f4;
      padding: 12px;
      overflow-x: auto;
      font-size: 10pt;
      border-left: 3px solid #ccc;
    }
    pre code { background: none; padding: 0; }
    blockquote {
      border-left: 3px solid #aaa;
      padding-left: 16px;
      margin-left: 0;
      color: #555;
      font-style: italic;
    }
    ul, ol { padding-left: 24px; margin-bottom: 0.9em; }
    li { margin-bottom: 0.2em; }
    hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
    a { color: #0066cc; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; }
    th { background: #f0f0f0; font-weight: bold; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  <h1 class="book-title">${escapeHtml(manifest.title)}</h1>
  ${sections}
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── PDF export ───────────────────────────────────────────────────────────────

export async function exportToPdf(
  manifest: ExportManifest,
  fileContents: Record<string, string>,
  outputPath: string
): Promise<void> {
  const html = buildExportHtml(manifest, fileContents)

  // Write to temp HTML file
  const tmpPath = path.join(app.getPath('temp'), `vintywrite-${Date.now()}.html`)
  await fs.writeFile(tmpPath, html, 'utf-8')

  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } })

  try {
    await win.loadFile(tmpPath)
    // Give CSS/fonts a moment to apply
    await new Promise<void>((r) => setTimeout(r, 600))

    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: false,
      margins: { marginType: 'custom', top: 0.75, bottom: 0.75, left: 0.75, right: 0.75 }
    })

    await fs.writeFile(outputPath, pdfBuffer)
  } finally {
    win.close()
    await fs.unlink(tmpPath).catch(() => {})
  }
}

// ─── DOCX export ──────────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
}

function inlineTokensToRuns(tokens: Token[]): TextRun[] {
  return tokens.flatMap((tok): TextRun[] => {
    if (tok.type === 'text') {
      return [new TextRun({ text: decodeHtmlEntities((tok as Tokens.Text).text) })]
    }
    if (tok.type === 'strong') {
      return inlineTokensToRuns((tok as Tokens.Strong).tokens ?? []).map(
        (r) => new TextRun({ ...r.prepForXml?.() as object, bold: true })
      )
    }
    if (tok.type === 'em') {
      return inlineTokensToRuns((tok as Tokens.Em).tokens ?? []).map(
        (r) => new TextRun({ ...r.prepForXml?.() as object, italics: true })
      )
    }
    if (tok.type === 'codespan') {
      return [new TextRun({ text: decodeHtmlEntities((tok as Tokens.Codespan).text), font: 'Courier New', size: 20 })]
    }
    if (tok.type === 'del') {
      return inlineTokensToRuns((tok as Tokens.Del).tokens ?? []).map(
        (r) => new TextRun({ ...r.prepForXml?.() as object, strike: true })
      )
    }
    if (tok.type === 'link') {
      const link = tok as Tokens.Link
      const text = link.tokens ? inlineTokensToRuns(link.tokens).map(r => r.prepForXml?.() as { text?: string }).map(r => r?.text ?? '').join('') : decodeHtmlEntities(link.text)
      return [new TextRun({ text: `${text} (${link.href})`, underline: { type: UnderlineType.SINGLE }, color: '0066CC' })]
    }
    if (tok.type === 'escape') {
      return [new TextRun({ text: decodeHtmlEntities((tok as Tokens.Escape).text) })]
    }
    if (tok.type === 'br') {
      return [new TextRun({ break: 1 })]
    }
    // Fallback: render raw
    return 'raw' in tok ? [new TextRun({ text: decodeHtmlEntities((tok as { raw: string }).raw) })] : []
  })
}

function headingLevel(depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  const map: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6
  }
  return map[depth] ?? HeadingLevel.HEADING_6
}

function tokensToDocxParagraphs(tokens: Token[]): Paragraph[] {
  const paragraphs: Paragraph[] = []

  for (const token of tokens) {
    if (token.type === 'heading') {
      const tok = token as Tokens.Heading
      paragraphs.push(
        new Paragraph({
          heading: headingLevel(tok.depth),
          children: inlineTokensToRuns(tok.tokens ?? [{ type: 'text', text: tok.text, raw: tok.text }])
        })
      )
    } else if (token.type === 'paragraph') {
      const tok = token as Tokens.Paragraph
      paragraphs.push(new Paragraph({ children: inlineTokensToRuns(tok.tokens ?? []) }))
    } else if (token.type === 'code') {
      const tok = token as Tokens.Code
      for (const line of tok.text.split('\n')) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line, font: 'Courier New', size: 20 })],
            indent: { left: 720 }
          })
        )
      }
    } else if (token.type === 'blockquote') {
      const tok = token as Tokens.Blockquote
      const inner = tokensToDocxParagraphs(tok.tokens ?? [])
      for (const p of inner) {
        paragraphs.push(
          new Paragraph({
            children: (p as unknown as { options: { children: TextRun[] } }).options.children,
            indent: { left: 720 },
            border: {
              left: { style: BorderStyle.THICK, size: 8, color: 'AAAAAA', space: 8 }
            }
          })
        )
      }
    } else if (token.type === 'list') {
      const tok = token as Tokens.List
      tok.items.forEach((item, idx) => {
        const itemParagraphs = tokensToDocxParagraphs(item.tokens ?? [])
        const firstP = itemParagraphs[0]
        const opts: IParagraphOptions = {
          children: firstP
            ? (firstP as unknown as { options: { children: TextRun[] } }).options.children
            : [new TextRun({ text: item.text })],
          numbering: tok.ordered
            ? { reference: 'ordered-list', level: 0 }
            : { reference: 'bullet-list', level: 0 }
        }
        paragraphs.push(new Paragraph(opts))
        // Additional paragraphs in list item (rare)
        for (let i = 1; i < itemParagraphs.length; i++) {
          paragraphs.push(itemParagraphs[i])
        }
        void idx // suppress unused warning
      })
    } else if (token.type === 'hr') {
      paragraphs.push(
        new Paragraph({
          children: [],
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 1 } }
        })
      )
    } else if (token.type === 'space') {
      paragraphs.push(new Paragraph({ children: [] }))
    }
    // table: skip for now (complex)
  }

  return paragraphs
}

export async function exportToDocx(
  manifest: ExportManifest,
  fileContents: Record<string, string>,
  outputPath: string
): Promise<void> {
  const allParagraphs: Paragraph[] = [
    // Book title
    new Paragraph({
      text: manifest.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({ children: [] })
  ]

  for (const file of manifest.files) {
    // Chapter divider heading
    allParagraphs.push(
      new Paragraph({
        text: file.title,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: allParagraphs.length > 2
      })
    )

    const md = fileContents[file.id] ?? ''
    const tokens = marked.lexer(md)
    allParagraphs.push(...tokensToDocxParagraphs(tokens))
    allParagraphs.push(new Paragraph({ children: [] }))
  }

  const doc = new Document({
    title: manifest.title,
    numbering: {
      config: [
        {
          reference: 'bullet-list',
          levels: [
            {
              level: 0,
              format: NumberFormat.BULLET,
              text: '\u2022',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } }
              }
            }
          ]
        },
        {
          reference: 'ordered-list',
          levels: [
            {
              level: 0,
              format: NumberFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } }
              }
            }
          ]
        }
      ]
    },
    sections: [
      {
        properties: {},
        children: allParagraphs
      }
    ]
  })

  const buffer = await Packer.toBuffer(doc)
  await fs.writeFile(outputPath, buffer)
}
