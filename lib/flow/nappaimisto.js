// nappaimisto.js

const bot = require('../../bot')

//Perusnäppäimitö
let replyMarkup = bot.keyboard([
    [bot.button('/hae'), bot.button('location', 'Sijaintisi mukaan 📍')],
    ['/help']
], { resize: true });

module.exports = replyMarkup