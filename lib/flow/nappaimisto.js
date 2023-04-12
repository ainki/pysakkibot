// nappaimisto.js

const bot = require('../../bot')

// Perusnäppäimitö joka tulee kun tekee /start tai /menu
const replyMarkup = bot.keyboard([
  [bot.button('/hae'), bot.button('/reitti'), bot.button('location', 'Sijaintisi mukaan 📍')],
  ['/pysakki', '/linja', '/liitynta'],
  ['/help']
], { resize: true })

module.exports = replyMarkup
