import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const BASE_URL = 'https://bubble.io/page?id=clink-61483&tab=Data&name=index&type_id=testimonials&version=live&subtab=App+Data';

function waitForEnter(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function exportBubbleData() {
  const exportDir = './bubble-exports';
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    acceptDownloads: true
  });

  const page = await context.newPage();

  // Navigate to the Bubble data page
  console.log('Navigating to Bubble.io...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('\n========================================');
  console.log('Please log in to Bubble.io in the browser window.');
  console.log('After logging in, make sure you can see the Data tab.');
  console.log('========================================\n');

  await waitForEnter('Press Enter once you are logged in and see the Data tab...');

  console.log('Starting data export...');
  await page.waitForTimeout(2000);

  // Take a screenshot to see what we're working with
  await page.screenshot({ path: `${exportDir}/current-page.png` });
  console.log(`Screenshot saved to ${exportDir}/current-page.png`);

  // Get the current page HTML to analyze the structure
  const pageContent = await page.content();
  fs.writeFileSync(`${exportDir}/page-structure.html`, pageContent);
  console.log(`Page HTML saved to ${exportDir}/page-structure.html`);

  // Look for data type links with type_id in the URL
  const typeLinks = await page.evaluate(() => {
    const links = [];
    const allLinks = document.querySelectorAll('a');
    allLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes('type_id=')) {
        const match = href.match(/type_id=([^&]+)/);
        if (match) {
          links.push({
            typeId: match[1],
            text: link.textContent?.trim() || match[1],
            href: href
          });
        }
      }
    });
    // Remove duplicates
    const seen = new Set();
    return links.filter(l => {
      if (seen.has(l.typeId)) return false;
      seen.add(l.typeId);
      return true;
    });
  });

  console.log(`\nFound ${typeLinks.length} data types:`, typeLinks.map(l => l.text));

  if (typeLinks.length === 0) {
    console.log('\nNo data types found automatically.');
    console.log('Please manually check the browser and look for the data types sidebar.');
    await waitForEnter('Press Enter after reviewing the page structure...');
  }

  // Export each data type
  for (const typeLink of typeLinks) {
    console.log(`\n--- Exporting: ${typeLink.text} (${typeLink.typeId}) ---`);

    // Navigate to this data type
    const url = `https://bubble.io/page?id=clink-61483&tab=Data&name=index&type_id=${typeLink.typeId}&version=live&subtab=App+Data`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Look for the export button - Bubble usually has "Export" in the data tab
    const exportButton = await page.locator('button:has-text("Export"), [role="button"]:has-text("Export")').first();

    try {
      const isVisible = await exportButton.isVisible({ timeout: 5000 });
      if (isVisible) {
        console.log('Found Export button, clicking...');

        // Prepare to capture download
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
        await exportButton.click();

        // Wait for any modal/dialog
        await page.waitForTimeout(2000);

        // Check if there's a confirmation dialog
        const downloadBtn = await page.locator('button:has-text("Download"), button:has-text("CSV")').first();
        try {
          const dlVisible = await downloadBtn.isVisible({ timeout: 3000 });
          if (dlVisible) {
            await downloadBtn.click();
          }
        } catch (e) {
          // No confirmation dialog, continue waiting for download
        }

        try {
          const download = await downloadPromise;
          const fileName = `${typeLink.text.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
          const filePath = path.join(exportDir, fileName);
          await download.saveAs(filePath);
          console.log(`✓ Saved: ${filePath}`);
        } catch (downloadErr) {
          console.log(`✗ Download failed for ${typeLink.text}: ${downloadErr.message}`);
        }
      } else {
        console.log(`✗ Export button not visible for ${typeLink.text}`);
      }
    } catch (err) {
      console.log(`✗ Could not find export button for ${typeLink.text}: ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log('Export process completed!');
  console.log(`Files saved to: ${path.resolve(exportDir)}`);
  console.log('========================================\n');

  // List exported files
  const files = fs.readdirSync(exportDir).filter(f => f.endsWith('.csv'));
  console.log(`Exported ${files.length} files:`);
  files.forEach(f => console.log(`  - ${f}`));

  await waitForEnter('\nPress Enter to close the browser...');
  await browser.close();
}

exportBubbleData().catch(console.error);
