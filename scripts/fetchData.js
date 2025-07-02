const puppeteer = require("puppeteer");
const axios = require("axios");
const { addOrUpdateDocument } = require("../src/services/dataService");

async function fetchPageData(page, id, pageNumber, index, total) {
  let retries = 3;

  while (retries > 0) {
    try {
      console.log(`🔢 Processing ID ${index + 1}/${total} on page ${pageNumber} → ${id}`);

      await page.goto(`https://hentai.tv/hentai${id}`, {
        waitUntil: "networkidle2",
        timeout: 180000,
      });

      // Try clicking ad button safely
      try {
        const adButton = await page.$("#aawp .flex-1 .container button");
        if (adButton) {
          console.log(`📢 Attempting to click ad for ID ${id}`);
          await Promise.all([
            adButton.click().catch(() => {}),
            page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 }).catch(() => {})
          ]);
          await page.waitForTimeout(2000);
        } else {
          console.log(`🚫 No ad button found for ID ${id}`);
        }
      } catch (err) {
        console.log(`🚫 Ad click failed for ID ${id}`);
      }

      await page.waitForSelector("#aawp", { visible: true });

      // Safely evaluate page content
      let data;
      try {
        data = await page.evaluate(() => {
          return {
            url: document.querySelector("#aawp iframe")?.src || "",
            title:
              document.querySelector("#aawp .flex-1 .container .border-b h1")?.innerText.trim() || "",
            views:
              document.querySelector("#aawp .flex-1 .container .grid .border-b p")?.innerText.trim() || "",
            poster:
              document.querySelector("#aawp .flex-1 .container .flex aside:first-child img")?.src || "",
            banner: document.querySelector("#aawp .aspect-video img")?.src || "",
            cencored:
              document.querySelector("#aawp .flex-1 .container .flex aside:last-child p:first-child a")?.innerText.trim() || "",
            info: {
              brand:
                document.querySelector("#aawp .flex-1 .container .flex aside:last-child p:nth-child(1) a")?.innerText.trim() || "",
              brandUploads:
                document.querySelector("#aawp .flex-1 .container .flex aside:last-child p:nth-child(2) span:last-child")?.innerText.trim() || "",
              releasedDate:
                document.querySelector("#aawp .flex-1 .container .flex aside:last-child p:nth-child(3) span:last-child")?.innerText.trim() || "",
              uploadDate:
                document.querySelector("#aawp .flex-1 .container .flex aside:last-child p:nth-child(4) span:last-child")?.innerText.trim() || "",
              alternateTitle:
                document.querySelector("#aawp .flex-1 .container .flex aside:last-child div h2 span")?.innerText.trim() || "",
            },
            moreInfo: {
              tags: Array.from(
                document.querySelectorAll("#aawp .flex-1 .container .rounded .btn")
              ).map((el) => el.innerText.trim()),
              descripOne:
                document.querySelector("#aawp .flex-1 .container .rounded .prose p:first-child")?.innerText.trim() || "",
              descripTwo:
                document.querySelector("#aawp .flex-1 .container .rounded .prose p:last-child")?.innerText.trim() || "",
            },
          };
        });
      } catch (evalErr) {
        console.log(`❌ Evaluation failed for ID ${id}: ${evalErr.message}`);
        return;
      }

      // Save to Firestore
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
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    const totalPages = 140;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      let responseRetries = 3;
      while (responseRetries > 0) {
        try {
          const response = await axios.get(`https://hent.shoko.fun/api/hen-all?page=${pageNumber}`);
          console.log(`📄 Fetched page ${pageNumber}, status: ${response.status}`);

          const items = response.data.results?.data?.all || [];
          if (!Array.isArray(items)) {
            throw new Error("❗ Response data is not an array");
          }

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await fetchPageData(page, item.id, pageNumber, i, items.length);
          }

          await new Promise((resolve) => setTimeout(resolve, 3000));
          break;
        } catch (error) {
          responseRetries--;
          console.error(`⚠️ Error fetching page ${pageNumber}: ${error.message}`);
          if (responseRetries > 0) {
            console.log(`🔁 Retrying page ${pageNumber}, attempts left: ${responseRetries}`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
          } else {
            console.log(`⛔ Failed to fetch page ${pageNumber} after 3 retries`);
          }
        }
      }
    }
  } catch (err) {
    console.error("🚨 Fatal error in fetchData:", err.message);
  } finally {
    await browser.close();
    console.log("🧹 Browser closed");
  }
}

fetchData();
