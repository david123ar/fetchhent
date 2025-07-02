const puppeteer = require("puppeteer"); // use "puppeteer-core" with executablePath if needed
const axios = require("axios");
const { addOrUpdateDocument, getDocument } = require("../src/services/dataService");

async function fetchPageData(page, id) {
  let retries = 3;

  while (retries > 0) {
    try {
      const existing = await getDocument("hentai", id);
      if (existing?.banner) {
        console.log(`⏭️ Skipping ID ${id} — banner already exists`);
        return;
      }

      await page.goto(`https://hentai.tv/hentai${id}`, {
        waitUntil: "networkidle2",
        timeout: 180000,
      });

      try {
        const adButton = await page.$("#aawp .flex-1 .container button");
        if (adButton) {
          await Promise.all([
            adButton.click(),
            page.waitForTimeout(2000),
          ]);
          console.log(`📢 Ad clicked for ID ${id}`);
        }
      } catch {
        console.log(`🚫 No ad or click failed for ID ${id}`);
      }

      await page.waitForSelector("#aawp", { visible: true, timeout: 15000 });

      const data = await page.evaluate(() => {
        return {
          url: document.querySelector("#aawp iframe")?.src || "",
          title: document.querySelector("#aawp h1")?.innerText.trim() || "",
          views: document.querySelector("#aawp .grid .border-b p")?.innerText.trim() || "",
          poster: document.querySelector("#aawp aside:first-child img")?.src || "",
          banner: document.querySelector("#aawp .aspect-video img")?.src || "",
          cencored: document.querySelector("#aawp aside:last-child p:first-child a")?.innerText.trim() || "",
          info: {
            brand: document.querySelector("#aawp aside:last-child p:nth-child(1) a")?.innerText.trim() || "",
            brandUploads: document.querySelector("#aawp aside:last-child p:nth-child(2) span:last-child")?.innerText.trim() || "",
            releasedDate: document.querySelector("#aawp aside:last-child p:nth-child(3) span:last-child")?.innerText.trim() || "",
            uploadDate: document.querySelector("#aawp aside:last-child p:nth-child(4) span:last-child")?.innerText.trim() || "",
            alternateTitle: document.querySelector("#aawp aside:last-child div h2 span")?.innerText.trim() || "",
          },
          moreInfo: {
            tags: Array.from(document.querySelectorAll("#aawp .rounded .btn")).map((el) => el.innerText.trim()),
            descripOne: document.querySelector("#aawp .rounded .prose p:first-child")?.innerText.trim() || "",
            descripTwo: document.querySelector("#aawp .rounded .prose p:last-child")?.innerText.trim() || "",
          },
        };
      });

      await addOrUpdateDocument("hentai", id, data);
      console.log(`✅ Data updated for ID ${id}`);
      return;
    } catch (error) {
      retries--;
      console.error(`❌ Error for ID ${id}: ${error.message}`);
      if (retries > 0) {
        console.log(`🔁 Retrying ID ${id}, attempts left: ${retries}`);
        await new Promise((res) => setTimeout(res, 5000));
      } else {
        console.log(`⛔ Skipped ID ${id} after 3 retries`);
      }
    }
  }
}

async function fetchData() {
  const totalPages = 140;

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    protocolTimeout: 180000,
    // executablePath: "/usr/bin/chromium-browser", // Uncomment if using puppeteer-core
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(180000);

  try {
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      console.log(`📄 Processing page ${pageNumber}/${totalPages}`);
      let tries = 3;

      while (tries > 0) {
        try {
          const response = await axios.get(`https://hent.shoko.fun/api/hen-all?page=${pageNumber}`);
          const items = response.data.results?.data?.all || [];

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            console.log(`🔢 Processing ID ${i + 1}/${items.length} on page ${pageNumber} → ${item.id}`);
            await fetchPageData(page, item.id);
          }

          await new Promise((res) => setTimeout(res, 2000)); // 2s delay between pages
          break;
        } catch (error) {
          console.error(`⚠️ Error fetching page ${pageNumber}: ${error.message}`);
          tries--;
          if (tries > 0) {
            console.log(`🔁 Retrying page ${pageNumber}, attempts left: ${tries}`);
            await new Promise((res) => setTimeout(res, 5000));
          }
        }
      }
    }
  } catch (e) {
    console.error("🚨 Fatal error:", e.message);
  } finally {
    await browser.close();
  }
}

fetchData();
