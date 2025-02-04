const fs = require('fs')
let Parser = require('rss-parser')
let parser = new Parser()
const BUNGIE_RSS_URL = 'http://www.bungie.net/News/NewsRss.ashx'

module.exports = async function getBungieRss() {
  const feed = await parser.parseURL(BUNGIE_RSS_URL)
  let items = []
  let lastUpdateDate

  const addItemToList = (item) => {
    if (item.isoDate) {
      const date = new Date(item.isoDate)
      const now = new Date()
      const milliDiff = now.valueOf() - date.valueOf()

      if (!lastUpdateDate || date > lastUpdateDate) {
        lastUpdateDate = date
      }

      if (milliDiff < 1000 * 60 * 60 * 24 * 2) {
        item.isNew = true
      }
    }
    items.push(item)
  }

  for (const item of feed.items) {
    if (item.title.toLowerCase().includes('this week at bungie')) {
      item.title = 'This Week At Bungie'
      addItemToList(item)
    } else if (
      item.title.includes('Destiny') ||
      item.title.includes('Festival of the Lost') ||
      item.title.includes('Season of') ||
      true
    ) {
      addItemToList(item)
    }
  }
  return {
    ...feed,
    lastRefreshDate: lastUpdateDate.toISOString(),
    isAvailable: items.length > 0,
    items,
  }
}
