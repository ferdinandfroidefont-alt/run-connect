/**
 * Capture les maquettes HTML en PNG (cadre .phone), puis supprimer les .html restants
 * si CAPTURE_DELETE_HTML=1.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const maquettesDir = path.join(root, "public", "maquettes");

async function main() {
  const htmlFiles = fs.readdirSync(maquettesDir).filter((f) => f.endsWith(".html"));
  if (htmlFiles.length === 0) {
    console.log("Aucun fichier .html dans public/maquettes.");
    return;
  }

  const browser = await chromium.launch();
  try {
    for (const file of htmlFiles) {
      const htmlPath = path.join(maquettesDir, file);
      const pngName = file.replace(/\.html$/i, ".png");
      const pngPath = path.join(maquettesDir, pngName);

      const url = `file:///${htmlPath.replace(/\\/g, "/")}`;
      const page = await browser.newPage({
        viewport: { width: 480, height: 1200 },
        deviceScaleFactor: 2,
      });

      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.addStyleTag({
        content: `body { margin:0; padding:16px; display:flex; justify-content:center; align-items:flex-start; background:#1a1a22; }`,
      });

      const phone = page.locator(".phone").first();
      await phone.waitFor({ state: "visible", timeout: 15_000 });
      await phone.screenshot({ path: pngPath, type: "png" });

      await page.close();
      console.log("OK", pngName);
    }
  } finally {
    await browser.close();
  }

  if (process.env.CAPTURE_DELETE_HTML === "1") {
    for (const file of htmlFiles) {
      fs.unlinkSync(path.join(maquettesDir, file));
      console.log("Supprimé", file);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
