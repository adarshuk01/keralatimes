const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { postToInstagram, postReelToInstagram } = require("../services/postToInstagram");
const cloudinary = require("../services/cloudinary");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const screenshotDir = path.join(__dirname, "../screenshots");

// Ensure screenshots folder exists
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Delete all files in screenshots folder
const clearOldScreenshots = () => {
  const files = fs.readdirSync(screenshotDir);
  for (const file of files) {
    fs.unlinkSync(path.join(screenshotDir, file));
  }
};

// exports.captureScreenshot = async (req, res) => {
//   const url = "https://adhu4723.github.io/newsapp/";

//   try {
//    const browser = await puppeteer.launch({
//   headless: "new",
//   args: ["--no-sandbox", "--disable-setuid-sandbox"],
//    });
//     const page = await browser.newPage();

//     await page.goto(url, { waitUntil: "networkidle2" });
//     await page.setViewport({ width: 900, height: 900 });

//     // Wait for the element
//     await page.waitForSelector("div.relative.w-\\[650px\\].h-\\[650px\\]");
//     const element = await page.$("div.relative.w-\\[650px\\].h-\\[650px\\]");
//      // Extract caption text
//     const caption = await page.$eval(
//       "#newsContainer > div > div.absolute.bottom-0.left-0.w-full.text-white.text-center.z-10 > div > p.hidden",
//       (el) => el.innerText.trim()
//     );

//     console.log(caption);

//     // Clear old screenshots
//     clearOldScreenshots();

//     const fileName = `news-${Date.now()}.png`;
//     const screenshotPath = path.join(screenshotDir, fileName);

//     // Save screenshot locally first ✅
//     await element.screenshot({ path: screenshotPath });
//     console.log("📸 Screenshot saved:", screenshotPath);

//     // Upload to Cloudinary ✅
//     const uploadResult = await cloudinary.uploader.upload(screenshotPath, {
//       folder: "instagram_uploads",
//     });
//     const imageUrl = uploadResult.secure_url;
//     console.log("☁️ Uploaded to Cloudinary:", imageUrl);

//     // Post to Instagram ✅
//     await postToInstagram(imageUrl, `${caption}....#gaintrick #thrissur #photooftheday #entekeralam #trivandrum #likeforfollow #keralaattraction #fashion #picoftheday #like #instadaily #tamil #keraladiaries #travel #malayalamcinema #chuvadelikes #follow #delhi #followforfollowback #mohanlal #gaintrain #naturephotography #gainparty #gainwithcarlz #keralaphotography #followtrain #bangalore #model #karnataka #travelphotography`);

//     await browser.close();

//     res.status(200).json({
//       message: "Screenshot captured and posted to Instagram",
//       file: `/screenshots/${fileName}`,
//       cloudinaryUrl: imageUrl,
//     });

//   } catch (err) {
//     console.error("❌ Error capturing screenshot:", err);
//     res.status(500).json({ error: "Failed to capture screenshot" });
//   }
// };

exports.captureScreenshot = async (req, res) => {
  const url = "https://adarshuk01.github.io/keralatimes/";

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.setViewport({ width: 900, height: 900 });

    // Wait for the news card to appear
    await page.waitForSelector("#newsCard");
    const element = await page.$("#newsCard");

    // Wait an extra 2 seconds for fonts/images/rendering
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get caption/title text from inside the news card
   const caption = await page.$eval("#newsSummary p", (el) =>
      el.innerText.trim()
    );

    // Clear old screenshots (optional helper function)
    clearOldScreenshots();

    // Take screenshot
    const imageName = `news-${Date.now()}.png`;
    const imagePath = path.join(screenshotDir, imageName);
    await element.screenshot({ path: imagePath });

    // Convert image to 5-second video
    const videoName = imageName.replace(".png", ".mp4");
    const videoPath = path.join(screenshotDir, videoName);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .addInput(imagePath)
        .loop(5)
        .videoCodec("libx264")
        .outputOptions("-pix_fmt yuv420p")
        .duration(5)
        .save(videoPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(videoPath, {
      folder: "instagram_reels",
      resource_type: "video",
    });

    const videoUrl = uploadResult.secure_url;

    // Post to Instagram with caption and hashtags
    await postReelToInstagram(
      videoUrl,
      `${caption}... \n\n #gaintrick #thrissur #photooftheday #entekeralam #trivandrum #likeforfollow #keralaattraction #byelection #election #like #instadaily #tamil #keraladiaries #travel #malayalamcinema #chuvadelikes #follow #delhi #followforfollowback #mohanlal #gaintrain #naturephotography #gainparty #nilambur #keralaphotography #followtrain #bangalore #model #karnataka #travelphotography`
    );

    await browser.close();

    res.status(200).json({
      message: "Screenshot converted to video and posted as Reel",
      cloudinaryUrl: videoUrl,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Failed to process screenshot as video" });
  }
};

