// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const newsRoutes = require("./routes/newsRoutes");
const path = require("path");
require("dotenv").config();
const cron = require("node-cron");
const { captureScreenshot } = require("./controller/screenshotController");

const app = express();
const PORT = process.env.PORT ||4000;

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/news", newsRoutes);
app.use("/screenshots", express.static(path.join(__dirname, "screenshots")));


// // 🛠️ Your job function
const runJob = async () => {
  console.log("⏰ Triggering automatic screenshot + Instagram upload...");
  try {
    const fakeReq = {};
    const fakeRes = {
      status(code) {
        return {
          json(data) {
            console.log(`✅ Auto Response [${code}]:`, data);
          },
        };
      },
    };

    await captureScreenshot(fakeReq, fakeRes);
  } catch (err) {
    console.error("❌ Cron job failed:", err);
  }
};

// 🕒 Schedule jobs between 7:30 AM and 9:30 PM IST (Asia/Kolkata)
cron.schedule("30 7 * * *", runJob, {
  timezone: "Asia/Kolkata", // 7:30 AM
});
cron.schedule("0,30 8-20 * * *", runJob, {
  timezone: "Asia/Kolkata", // Every 30 mins from 8:00 AM to 8:30 PM
});
cron.schedule("0,30 21 * * *", runJob, {
  timezone: "Asia/Kolkata", // 9:00 PM and 9:30 PM
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
