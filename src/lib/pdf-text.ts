import type { PDFFont } from "pdf-lib";

const PDF_CHAR_REPLACEMENTS: Record<string, string> = {
  "\u00A0": " ",
  "\u2007": " ",
  "\u202F": " ",
  "\u200B": "",
  "\u200C": "",
  "\u200D": "",
  "\u2060": "",
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2212": "-",
  "\u2026": "...",
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": ",",
  "\u201B": "'",
  "\u201C": "\"",
  "\u201D": "\"",
  "\u201E": "\"",
  "\u00AB": "\"",
  "\u00BB": "\"",
  "\u2022": "-",
  "\u00B7": "-",
  "\u2023": "-",
  "\u2043": "-",
  "\u2219": "-",
  "\u00B9": "1",
  "\u00B2": "2",
  "\u00B3": "3",
  "\u2070": "0",
  "\u2071": "i",
  "\u2074": "4",
  "\u2075": "5",
  "\u2076": "6",
  "\u2077": "7",
  "\u2078": "8",
  "\u2079": "9",
  "\u2080": "0",
  "\u2081": "1",
  "\u2082": "2",
  "\u2083": "3",
  "\u2084": "4",
  "\u2085": "5",
  "\u2086": "6",
  "\u2087": "7",
  "\u2088": "8",
  "\u2089": "9",
  "\u20AC": "EUR",
  "\u2122": "TM",
  "\u00AE": "(R)",
  "\u00A9": "(C)"
};

export function sanitizeForPdfText(text: string, font: PDFFont) {
  const normalized = text.replace(/\r\n?/g, "\n");
  let output = "";

  for (const character of normalized) {
    const candidate = PDF_CHAR_REPLACEMENTS[character] ?? character;

    for (const piece of candidate) {
      try {
        font.encodeText(piece);
        output += piece;
      } catch {
        output += "?";
      }
    }
  }

  return output;
}
