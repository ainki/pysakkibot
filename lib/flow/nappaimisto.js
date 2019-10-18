// nappaimisto.js

const bot = require('../../bot')


//Perusnäppäimitö joka tulee kun tekee /start tai /menu
let replyMarkup = bot.keyboard([
    [bot.button('/hae'), bot.button('/pysakki'), bot.button('location', 'Sijaintisi mukaan 📍')],
    ['/linja','/help']
], { resize: true });

module.exports = replyMarkup
