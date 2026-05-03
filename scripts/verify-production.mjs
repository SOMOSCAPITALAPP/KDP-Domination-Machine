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
  if (url.includes("/api/auth/login") || url.includes("/api/generate") || url.includes("/api/export")) {
    apiEvents.push({
      url,
      method: response.request().method(),
      status: response.status()
    });
  }
});

const result = {
  story: "Login admin -> create project -> concept -> packaging -> export zip",
  checks: {}
};

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Mot de passe admin").fill(password);
  await page.getByRole("button", { name: /Entrer/i }).click();
  await page.waitForSelector("text=Nouveau livre", { timeout: 20000 });
  result.checks.login = { ok: true, url: page.url() };

  await page.getByRole("button", { name: "Nouveau livre" }).click();
  await page.getByPlaceholder("Titre de travail").fill("Export QA Flow");
  await page.getByPlaceholder("Langue").fill("Francais");
  await page.getByPlaceholder("Niche").fill("Productivite");
  await page.getByPlaceholder("Public cible").fill("Entrepreneurs francophones");
  await page.getByPlaceholder("Objectif commercial").fill("Verifier le flux V1 KDP");
  await page.getByRole("button", { name: /Cr/i }).click();
  await page.waitForTimeout(1200);
  result.checks.projectCreated = (await page.locator("text=Export QA Flow").count()) > 0;

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
  result.checks.conceptLengths = await page.locator("textarea").evaluateAll((elements) =>
    elements.map((element) => element.value.length).slice(0, 7)
  );

  await page.getByRole("button", { name: "Packaging KDP", exact: true }).click();
  const packagingPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/generate") &&
      response.request().postData()?.includes("\"packaging\"") &&
      response.status() === 200,
    { timeout: 45000 }
  );
  await page.getByRole("button", { name: /Generer packaging/i }).click();
  await packagingPromise;

  const keywordsPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/generate") &&
      response.request().postData()?.includes("\"keywords\"") &&
      response.status() === 200,
    { timeout: 45000 }
  );
  await page.getByRole("button", { name: /Generer mots-cles/i }).click();
  await keywordsPromise;

  const coverPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/generate") &&
      response.request().postData()?.includes("\"coverBrief\"") &&
      response.status() === 200,
    { timeout: 45000 }
  );
  await page.getByRole("button", { name: /Brief couverture/i }).click();
  await coverPromise;
  await page.waitForTimeout(1200);
  result.checks.packagingLengths = await page.locator("textarea").evaluateAll((elements) =>
    elements.map((element) => element.value.length).slice(0, 9)
  );

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloadPromise = page.waitForEvent("download", { timeout: 45000 });
  const exportPromise = page.waitForResponse(
    (response) => response.url().includes("/api/export") && response.status() === 200,
    { timeout: 45000 }
  );
  await page.getByRole("button", { name: /Exporter le dossier/i }).click();
  const [download] = await Promise.all([downloadPromise, exportPromise]);
  const targetPath = path.join(process.cwd(), "test-artifacts", await download.suggestedFilename());
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await download.saveAs(targetPath);

  const zipBuffer = await fs.readFile(targetPath);
  const zip = await JSZip.loadAsync(zipBuffer);
  const files = Object.keys(zip.files).sort();
  result.checks.export = {
    filename: await download.suggestedFilename(),
    savedTo: targetPath,
    fileCount: files.length,
    files,
    hasDocx: files.some((item) => item.endsWith("manuscript.docx")),
    hasCsv: files.some((item) => item.endsWith("project-sheet.csv")),
    hasChecklist: files.some((item) => item.endsWith("checklist-kdp.md"))
  };

  result.ok = true;
} catch (error) {
  result.ok = false;
  result.error = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
}

result.apiEvents = apiEvents;
await browser.close();
console.log(JSON.stringify(result, null, 2));
