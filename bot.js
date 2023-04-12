//
//  Pysäkkibot-2.0
//

const TeleBot = require('telebot')
require('dotenv').config()

// Telegram token
const token = process.env.token

// Create bot
const bot = new TeleBot({
  token,
  usePlugins: ['askUser', 'floodProtection', 'namedButtons'],
  pluginConfig: {
    floodProtection: {
      interval: 0.3,
      message: 'Ota iisisti ja relaa 😤'
    }
  }
})

module.exports = bot
