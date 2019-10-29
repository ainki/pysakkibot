// nappaimisto.js

const bot = require('../../bot')


//Perusnäppäimitö joka tulee kun tekee /start tai /menu
let replyMarkup = bot.keyboard([
    [bot.button('/hae'), bot.button('/linja'), bot.button('location', 'Sijaintisi mukaan 📍')],
    ['/pysakki', '/reitti', '/liitynta'],
    ['/help']
], { resize: true });

module.exports = replyMarkup
