const newsService = require('../services/newsServices');


exports.getNews = async (req, res) => {
  const { type } = req.params;
console.log(type);

  try {
    let news;
    switch (type) {
      case 'latest':
        news = await newsService.fetchLatestNews();
        break;
      case 'sports':
        news = await newsService.fetchSportsNews();
        break;
    //     case 'entertainment':
    //       news = await newsService.fetchEntertainmentNews();
    //       break;
    //       case 'technology':
    //       news = await newsService.fetchTechNews();
    //       break;
    //       case 'premium':
    //       news = await newsService.fetchNewsPlus();
    //       break;
      default:
        return res.status(400).json({ error: 'Invalid news type' });
    }

    res.json(news);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
};


