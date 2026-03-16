// services/instagramService.js

const axios = require("axios");
require("dotenv").config();

const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* -----------------------------------
   CHECK VIDEO STATUS
----------------------------------- */
async function checkVideoStatus(videoId) {
  const res = await axios.get(`https://graph.facebook.com/v25.0/${videoId}`, {
    params: {
      fields: "status,permalink_url",
      access_token: PAGE_ACCESS_TOKEN,
    },
  });

  return res.data;
}

/* -----------------------------------
   POST FACEBOOK REEL
----------------------------------- */
async function postReelToFacebook(videoUrl, caption) {
  try {
    console.log("📤 Starting Facebook Reel upload...");

    /* STEP 1 — START */
    const startRes = await axios.post(
      `https://graph.facebook.com/v25.0/${PAGE_ID}/video_reels`,
      {
        upload_phase: "start",
        access_token: PAGE_ACCESS_TOKEN,
      }
    );

    const uploadUrl = startRes.data.upload_url;
    const videoId = startRes.data.video_id;

    console.log("✅ Upload URL received");

    /* STEP 2 — DOWNLOAD VIDEO */
    const videoRes = await axios.get(videoUrl, {
      responseType: "arraybuffer",
    });

    const videoBuffer = Buffer.from(videoRes.data);
    const videoSize = videoBuffer.length; // ✅ defined here

    /* STEP 3 — UPLOAD VIDEO */
    await axios.post(uploadUrl, videoBuffer, {
      headers: {
        Authorization: `OAuth ${PAGE_ACCESS_TOKEN}`,
        offset: "0",
        file_size: String(videoSize),        // ✅ must be string or axios drops it
        "Content-Type": "application/octet-stream",
        "Content-Length": String(videoSize), // ✅ explicit string for safety
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    console.log("✅ Video uploaded");

    /* STEP 4 — FINISH + PUBLISH */
    const finishRes = await axios.post(
      `https://graph.facebook.com/v25.0/${PAGE_ID}/video_reels`,
      {
        upload_phase: "finish",
        video_id: videoId,
        description: caption,
        published: true,
        video_state: "PUBLISHED",
        privacy: { value: "EVERYONE" }, 
        access_token: PAGE_ACCESS_TOKEN,
      }
    );

    console.log("✅ Facebook Reel submitted:", finishRes.data);

    /* STEP 5 — WAIT UNTIL FULLY PUBLISHED */
    let data;
    let publishingStatus = "not_started";

    while (publishingStatus !== "complete") {
      await sleep(8000);

      data = await checkVideoStatus(videoId);

      const status = data.status;

      console.log("📊 Video Status:", status.video_status);
      console.log("Uploading:", status.uploading_phase?.status);
      console.log("Processing:", status.processing_phase?.status);
      console.log("Publishing:", status.publishing_phase?.status);

      publishingStatus = status.publishing_phase?.status;
    }

    console.log("🎉 Reel is fully published!");

    const reelUrl = data.permalink_url.startsWith("http")
      ? data.permalink_url
      : `https://www.facebook.com${data.permalink_url}`;

    console.log("🔗 Reel URL:", reelUrl);

    return {
      postId: finishRes.data.post_id,
      videoId,
      reelUrl,
    };
  } catch (error) {
    console.error(
      "❌ Facebook Reel error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

/* --------------------------------------------------
   INSTAGRAM IMAGE POST
-------------------------------------------------- */

const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const IG_USER_ID = process.env.INSTAGRAM_USER_ID;

async function postToInstagram(imageUrl, caption) {
  try {
    const form = new FormData();
    form.append("image_url", imageUrl);
    form.append("caption", caption);
    form.append("access_token", ACCESS_TOKEN);

    const containerRes = await axios.post(
      `https://graph.facebook.com/v18.0/${IG_USER_ID}/media`,
      form,
      { headers: form.getHeaders() }
    );

    const containerId = containerRes.data.id;

    const publishRes = await axios.post(
      `https://graph.facebook.com/v18.0/${IG_USER_ID}/media_publish`,
      {
        creation_id: containerId,
        access_token: ACCESS_TOKEN,
      }
    );

    console.log("✅ Instagram image posted:", publishRes.data);

    return publishRes.data;
  } catch (err) {
    console.error(
      "❌ Instagram image error:",
      err.response?.data || err.message
    );
    throw err;
  }
}

/* --------------------------------------------------
   INSTAGRAM REEL POST
-------------------------------------------------- */

async function postReelToInstagram(videoUrl, caption) {
  try {
    const creationRes = await axios.post(
      `https://graph.facebook.com/v18.0/${IG_USER_ID}/media`,
      {
        media_type: "REELS",
        video_url: videoUrl,
        caption: caption,
        access_token: ACCESS_TOKEN,
      }
    );

    const creationId = creationRes.data.id;

    console.log("🎬 Instagram Reel container:", creationId);

    // WAIT UNTIL READY
    let isReady = false;
    let attempt = 0;

    while (!isReady && attempt < 15) {
      attempt++;

      await sleep(4000);

      const statusRes = await axios.get(
        `https://graph.facebook.com/v18.0/${creationId}`,
        {
          params: {
            fields: "status_code",
            access_token: ACCESS_TOKEN,
          },
        }
      );

      const status = statusRes.data.status_code;

      console.log(`⏳ Instagram processing: ${status}`);

      if (status === "FINISHED") isReady = true;

      if (status === "ERROR")
        throw new Error("Instagram video processing failed");
    }

    if (!isReady) throw new Error("Instagram video not ready");

    const publishRes = await axios.post(
      `https://graph.facebook.com/v18.0/${IG_USER_ID}/media_publish`,
      {
        creation_id: creationId,
        access_token: ACCESS_TOKEN,
      }
    );

    console.log("✅ Instagram Reel posted:", publishRes.data);

    return publishRes.data;
  } catch (error) {
    console.error(
      "❌ Instagram Reel error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

/* --------------------------------------------------
   EXPORTS
-------------------------------------------------- */

module.exports = {
  postToInstagram,
  postReelToInstagram,
  postReelToFacebook,
};