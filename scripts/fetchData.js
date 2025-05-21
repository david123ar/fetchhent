const puppeteer = require("puppeteer");
const axios = require("axios");
const { addOrUpdateDocument } = require("../src/services/dataService");

async function fetchPageData(page, id) {
  let retries = 3;
  while (retries > 0) {
    try {
      // Fetch data directly from the page
      await page.goto(`https://hentai.tv/hentai${id}`, {
        waitUntil: "networkidle2",
        timeout: 180000,
      });

      try {
        await page.waitForSelector("#aawp .flex-1 .container button", {
          timeout: 10000,
        });
        await page.click("#aawp .flex-1 .container button");
        console.log(`Ad clicked for ID ${id}`);
      } catch (adError) {
        console.log(`No ad found or ad could not be closed for ID ${id}`);
      }

      await page.waitForSelector("#aawp", { visible: true });

      const data = await page.evaluate(() => {
        return {
          url: document.querySelector("#aawp iframe")?.src || "",
          title:
            document
              .querySelector("#aawp .flex-1 .container .border-b h1")
              ?.innerText.trim() || "",
          views:
            document
              .querySelector("#aawp .flex-1 .container .grid .border-b p")
              ?.innerText.trim() || "",
          poster:
            document.querySelector(
              "#aawp .flex-1 .container .flex aside:first-child img"
            )?.src || "",
          banner: document.querySelector("#aawp .aspect-video img")?.src || "",
          cencored:
            document
              .querySelector(
                "#aawp .flex-1 .container .flex aside:last-child p:first-child a"
              )
              ?.innerText.trim() || "",
          info: {
            brand:
              document
                .querySelector(
                  "#aawp .flex-1 .container .flex aside:last-child p:nth-child(1) a"
                )
                ?.innerText.trim() || "",
            brandUploads:
              document
                .querySelector(
                  "#aawp .flex-1 .container .flex aside:last-child p:nth-child(2) span:last-child"
                )
                ?.innerText.trim() || "",
            releasedDate:
              document
                .querySelector(
                  "#aawp .flex-1 .container .flex aside:last-child p:nth-child(3) span:last-child"
                )
                ?.innerText.trim() || "",
            uploadDate:
              document
                .querySelector(
                  "#aawp .flex-1 .container .flex aside:last-child p:nth-child(4) span:last-child"
                )
                ?.innerText.trim() || "",
            alternateTitle:
              document
                .querySelector(
                  "#aawp .flex-1 .container .flex aside:last-child div h2 span"
                )
                ?.innerText.trim() || "",
          },
          moreInfo: {
            tags: Array.from(
              document.querySelectorAll(
                "#aawp .flex-1 .container .rounded .btn"
              )
            ).map((el) => el.innerText.trim()),
            descripOne:
              document
                .querySelector(
                  "#aawp .flex-1 .container .rounded .prose p:first-child"
                )
                ?.innerText.trim() || "",
            descripTwo:
              document
                .querySelector(
                  "#aawp .flex-1 .container .rounded .prose p:last-child"
                )
                ?.innerText.trim() || "",
          },
        };
      });

      await addOrUpdateDocument("hentai", id, data);
      console.log(`Data fetched and updated for ID ${id}`);
      return;
    } catch (error) {
      retries -= 1;
      console.error(`Error extracting data for ID ${id}:`, error.message);
      if (retries === 0) {
        console.error(`Failed to fetch data for ID ${id} after retries`);
      } else {
        console.log(`Retrying for ID ${id}, attempts left: ${retries}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
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
    for (let pageNumber = 1; pageNumber <= 135; pageNumber++) {
      let responseRetries = 3;
      while (responseRetries > 0) {
        try {
          const response = await axios.get(
            `https://hent.shoko.fun/api/hen-all?page=${pageNumber}`
          );
          console.log(
            `Fetching page ${pageNumber}, status: ${response.status}`
          );

          const items = response.data.results?.data?.all || [];
          if (!Array.isArray(items)) {
            throw new Error("Response data is not an array");
          }

          for (const item of items) {
            const { id } = item;
            await fetchPageData(page, id);
          }

          await new Promise((resolve) => setTimeout(resolve, 3000));
          break;
        } catch (error) {
          responseRetries -= 1;
          console.error(`Error fetching page ${pageNumber}:`, error.message);
          if (responseRetries === 0) {
            console.error(`Failed to fetch page ${pageNumber} after retries`);
          } else {
            console.log(
              `Retrying page ${pageNumber}, attempts left: ${responseRetries}`
            );
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }
    }

    await browser.close();
  } catch (error) {
    console.error("Error in fetchData:", error.message);
    await browser.close();
  }
}

fetchData();
