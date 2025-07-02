const puppeteer = require("puppeteer");
const axios = require("axios");
const { addOrUpdateDocument, getDocument } = require("../src/services/dataService");

async function fetchPageData(page, id, pageNumber, index, total) {
  let retries = 3;

  while (retries > 0) {
    try {
      /* ➜  EARLY‑EXIT if banner already stored */
      const existing = await getDocument("hentai", id);
      if (existing?.banner) {
        console.log(`⏭️ Skipping ID ${id} — banner already exists`);
        return;
      }

      console.log(`🔢 Processing ID ${index + 1}/${total} on page ${pageNumber} → ${id}`);

      await page.goto(`https://hentai.tv/hentai${id}`, {
        waitUntil: "networkidle2",
        timeout: 180000,
      });

      /* Safe ad‑button click */
      try {
        const adButton = await page.$("#aawp .flex-1 .container button");
        if (adButton) {
          console.log(`📢 Attempting ad click for ID ${id}`);
          await Promise.all([
            adButton.click().catch(() => {}),
            page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 }).catch(() => {})
          ]);
          await page.waitForTimeout(2000);
        }
      } catch {
        console.log(`🚫 Ad click failed or no ad for ID ${id}`);
      }

      await page.waitForSelector("#aawp", { visible: true });

      /* Page extraction */
      let data;
      try {
        data = await page.evaluate(() => ({
          url: document.querySelector("#aawp iframe")?.src || "",
          title: document.querySelector("#aawp .flex-1 .container .border-b h1")?.innerText.trim() || "",
          views: document.querySelector("#aawp .flex-1 .container .grid .border-b p")?.innerText.trim() || "",
          poster: document.querySelector("#aawp .flex-1 .container .flex aside:first-child img")?.src || "",
          banner: document.querySelector("#aawp .aspect-video img")?.src || "",
          cencored: document.querySelector("#aawp .flex-1 .container .flex aside:last-child p:first-child a")?.innerText.trim() || "",
          info: {
            brand: document.querySelector("#aawp .flex-1 .container .flex aside:last-child p:nth-child(1) a")?.innerText.trim() || "",
            brandUploads: document.querySelector("#aawp .flex-1 .container .flex aside:last-child p:nth-child(2) span:last-child")?.innerText.trim() || "",
            releasedDate: document.querySelector("#aawp .flex-1 .container .flex aside:last-child p:nth-child(3) span:last-child")?.innerText.trim() || "",
            uploadDate: document.querySelector("#aawp .flex-1 .container .flex aside:last-child p:nth-child(4) span:last-child")?.innerText.trim() || "",
            alternateTitle: document.querySelector("#aawp .flex-1 .container .flex aside:last-child div h2 span")?.innerText.trim() || "",
          },
          moreInfo: {
            tags: Array.from(document.querySelectorAll("#aawp .flex-1 .container .rounded .btn")).map(el => el.innerText.trim()),
            descripOne: document.querySelector("#aawp .flex-1 .container .rounded .prose p:first-child")?.innerText.trim() || "",
            descripTwo: document.querySelector("#aawp .flex-1 .container .rounded .prose p:last-child")?.innerText.trim() || "",
          },
        }));
      } catch (evalErr) {
        console.log(`❌ Evaluation failed for ID ${id}: ${evalErr.message}`);
        return;
      }

      await addOrUpdateDocument("hentai", id, data);
      console.log(`✅ Data updated for ID ${id}`);
      return;
    } catch (err) {
      retries--;
      console.error(`❌ Error for ID ${id}: ${err.message}`);
      if (retries > 0) {
        console.log(`🔁 Retrying ID ${id}, attempts left: ${retries}`);
        await new Promise(res => setTimeout(res, 5000));
      } else {
        console.log(`⛔ Skipped ID ${id} after 3 retries`);
      }
    }
  }
}

async function fetchData() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    const totalPages = 140;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      let attempts = 3;
      while (attempts > 0) {
        try {
          const res = await axios.get(`https://hent.shoko.fun/api/hen-all?page=${pageNumber}`);
          console.log(`📄 Fetched page ${pageNumber}, status ${res.status}`);

          const items = res.data.results?.data?.all || [];
          if (!Array.isArray(items)) throw new Error("Response data is not an array");

          for (let i = 0; i < items.length; i++) {
            await fetchPageData(page, items[i].id, pageNumber, i, items.length);
          }

          await new Promise(r => setTimeout(r, 3000));
          break;
        } catch (pageErr) {
          attempts--;
          console.error(`⚠️ Error page ${pageNumber}: ${pageErr.message}`);
          if (attempts > 0) {
            console.log(`🔁 Retrying page ${pageNumber}, attempts left: ${attempts}`);
            await new Promise(r => setTimeout(r, 5000));
          } else {
            console.log(`⛔ Failed page ${pageNumber} after retries`);
          }
        }
      }
    }
  } catch (fatal) {
    console.error("🚨 Fatal error in fetchData:", fatal.message);
  } finally {
    await browser.close();
    console.log("🧹 Browser closed");
  }
}

fetchData();
