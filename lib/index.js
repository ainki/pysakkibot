// index.js

//Vaatimukset
const bot = require('../bot')
//NPM
require('console-stamp')(console, 'HH:MM:ss'); //Aikaleimat logiin

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

// /start
bot.on('/start', (msg) => {
    let replyMarkup = bot.keyboard([
        [bot.button('/hae'), bot.button('location', 'Sijaintisi mukaan 📍')],
        ['/help']
    ], { resize: true });
    bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla /hae ja pysäkin nimen tai koodin.\n\nVoit vaihtoehtoisesti myös lähettää sijaintisi ja saada lähistöltäsi seuraavat lähdöt!\n\nJos tarvitset lisää apua tee /help! 😄`, { replyMarkup }); //Vastaa kun käyttäjä käyttää /start komentoa
    return console.log("[info] Start viesti lähetetty!")
});

bot.start();