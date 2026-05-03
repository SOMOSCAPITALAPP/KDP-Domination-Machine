import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import JSZip from "jszip";

const baseUrl = "https://kdp-domination-machine.vercel.app";
const password = "olivostephane@gmail.com";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();
const apiEvents = [];

page.on("response", (response) => {
  const url = response.url();
  if (
    url.includes("/api/auth/login") ||
    url.includes("/api/generate") ||
    url.includes("/api/export") ||
    url.includes("/api/export/pdf")
  ) {
    apiEvents.push({
      url,
      method: response.request().method(),
      status: response.status()
    });
  }
});

const result = {
  story:
    "Login admin -> front matter -> concept -> outline with illustration prompts -> chapter -> manuscript-only PDF -> ZIP export",
  checks: {}
};

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Mot de passe admin").fill(password);
  await page.getByRole("button", { name: /Entrer/i }).click();
  await page.waitForSelector("text=Nouveau livre", { timeout: 20000 });
  result.checks.login = { ok: true, url: page.url() };
  result.checks.modelLockVisible = (await page.getByText("gpt-4.1-mini", { exact: false }).count()) > 0;

  await page.getByRole("button", { name: "Nouveau livre" }).click();
  await page.getByPlaceholder("Titre de travail").fill("KDP Editorial QA");
  await page.getByPlaceholder("Langue").fill("Francais");
  await page.getByPlaceholder("Niche").fill("Productivite");
  await page.getByPlaceholder("Public cible").fill("Entrepreneurs francophones");
  await page.getByPlaceholder("Objectif commercial").fill("Verifier le flux editorial KDP");
  await page.getByRole("button", { name: /Creer/i }).click();
  await page.waitForTimeout(1000);

  const frontMatterPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/generate") &&
      response.request().postData()?.includes("\"frontMatter\"") &&
      response.status() === 200,
    { timeout: 45000 }
  );
  await page.getByRole("button", { name: /Generer preface et introduction/i }).click();
  await frontMatterPromise;
  await page.waitForTimeout(1500);
  result.checks.frontMatter = {
    authorLength: await page.locator('input').nth(4).evaluate((element) => element.value.length),
    prefaceLength: await page.locator('textarea').nth(0).evaluate((element) => element.value.length),
    introductionLength: await page.locator('textarea').nth(1).evaluate((element) => element.value.length)
  };

  await page.getByRole("button", { name: "Concept Best-Seller", exact: true }).click();
  const conceptPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/generate") &&
      response.request().postData()?.includes("\"concept\"") &&
      response.status() === 200,
    { timeout: 45000 }
  );
  await page.getByRole("button", { name: /Generer le concept/i }).click();
  await conceptPromise;
  await page.waitForTimeout(1200);

  await page.getByRole("button", { name: "Plan du livre", exact: true }).click();
  const outlinePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/generate") &&
      response.request().postData()?.includes("\"outline\"") &&
      response.status() === 200,
    { timeout: 45000 }
  );
  await page.getByRole("button", { name: /Generer le plan/i }).click();
  await outlinePromise;
  await page.waitForTimeout(1500);
  const outlineTextareas = await page.locator("textarea").evaluateAll((elements) =>
    elements.map((element) => element.value.length)
  );
  result.checks.outline = {
    tocLength: outlineTextareas[0] || 0,
    illustrationPromptLengths: outlineTextareas.slice(1, 4)
  };

  await page.getByRole("button", { name: "Redaction", exact: true }).click();
  const chapterPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/generate") &&
      response.request().postData()?.includes("\"chapter\"") &&
      response.status() === 200,
    { timeout: 120000 }
  );
  await page.getByRole("button", { name: /Generer chapitre/i }).first().click();
  await chapterPromise;
  await page.waitForTimeout(1800);
  result.checks.chapter = {
    firstIllustrationLength: await page.locator("textarea").nth(0).evaluate((element) => element.value.length),
    firstChapterLength: await page.locator("textarea").nth(1).evaluate((element) => element.value.length),
    firstChapterWords: await page.locator("textarea").nth(1).evaluate((element) =>
      element.value.split(/\s+/).filter(Boolean).length
    )
  };

  await page.getByRole("button", { name: "Export", exact: true }).click();

  const previewPromise = page.waitForResponse(
    (response) => response.url().includes("/api/export/pdf") && response.status() === 200,
    { timeout: 45000 }
  );
  await page.getByRole("button", { name: /Previsualiser PDF KDP/i }).click();
  const previewResponse = await previewPromise;
  await page.waitForTimeout(1200);
  result.checks.pdfPreview = {
    status: previewResponse.status(),
    iframeVisible: (await page.locator('iframe[title="Preview PDF KDP"]').count()) > 0
  };

  const pdfDownloadPromise = page.waitForEvent("download", { timeout: 45000 });
  const pdfResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/export/pdf") && response.status() === 200,
    { timeout: 45000 }
  );
  await page.getByRole("button", { name: /Telecharger PDF KDP/i }).click();
  const [pdfDownload, pdfResponse] = await Promise.all([pdfDownloadPromise, pdfResponsePromise]);
  const pdfTargetPath = path.join(process.cwd(), "test-artifacts", await pdfDownload.suggestedFilename());
  await fs.mkdir(path.dirname(pdfTargetPath), { recursive: true });
  await pdfDownload.saveAs(pdfTargetPath);
  const pdfBuffer = await fs.readFile(pdfTargetPath);
  const pdfText = pdfBuffer.toString("latin1");
  result.checks.pdfDownload = {
    status: pdfResponse.status(),
    filename: await pdfDownload.suggestedFilename(),
    bytes: pdfBuffer.length,
    containsModeleIA: pdfText.includes("Modele IA"),
    containsResumeTag: pdfText.includes("Resume:"),
    containsObjectifTag: pdfText.includes("Objectif:"),
    containsCompteurTag: pdfText.includes("Compteur chapitre:")
  };

  const zipDownloadPromise = page.waitForEvent("download", { timeout: 45000 });
  const zipResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/export") && !response.url().includes("/api/export/pdf") && response.status() === 200,
    { timeout: 45000 }
  );
  await page.getByRole("button", { name: /Exporter le dossier/i }).click();
  const [zipDownload] = await Promise.all([zipDownloadPromise, zipResponsePromise]);
  const zipTargetPath = path.join(process.cwd(), "test-artifacts", await zipDownload.suggestedFilename());
  await zipDownload.saveAs(zipTargetPath);
  const zipBuffer = await fs.readFile(zipTargetPath);
  const zip = await JSZip.loadAsync(zipBuffer);
  const files = Object.keys(zip.files).sort();
  result.checks.export = {
    filename: await zipDownload.suggestedFilename(),
    fileCount: files.length,
    hasPdf: files.some((item) => item.endsWith("manuscript-kdp.pdf")),
    hasDocx: files.some((item) => item.endsWith("manuscript.docx")),
    hasCsv: files.some((item) => item.endsWith("project-sheet.csv")),
    hasUploadNotes: files.some((item) => item.endsWith("kdp-upload-notes.md")),
    hasIllustrations: files.some((item) => item.endsWith("chapter-illustrations.md"))
  };

  result.ok = true;
} catch (error) {
  result.ok = false;
  result.error = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
}

result.apiEvents = apiEvents;
await browser.close();
console.log(JSON.stringify(result, null, 2));
