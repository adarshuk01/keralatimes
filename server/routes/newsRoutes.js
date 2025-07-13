const express = require('express');
const router = express.Router();
const newsController = require('../controller/newsConroller');
const { captureScreenshot } = require('../controller/screenshotController');


router.get('/latest/:type', newsController.getNews); 
router.get("/screenshot", captureScreenshot);         


module.exports = router;