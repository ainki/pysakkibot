// index.js

//Vaatimukset
const bot = require('./bot')
const replyMarkup = require('./lib/flow/nappaimisto')
const hae = require('./lib/functions/hae')
const sijainti = require('./lib/functions/sijainti')
//NPM
require('console-stamp')(console, 'HH:MM:ss'); //Aikaleimat logiin

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id}: ${msg.text}`);
});

//Peruskomennot

// /start
bot.on('/start', (msg) => {
    //Lähettää viestin ja näppäimistön
    bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla /hae ja pysäkin nimen tai koodin.\n\nVoit vaihtoehtoisesti myös lähettää sijaintisi ja saada lähistöltäsi seuraavat lähdöt!\n\nJos tarvitset lisää apua tee /help! 😄`, { replyMarkup }); //Vastaa kun käyttäjä käyttää /start komentoa
    return console.log("[info] Start viesti lähetetty!")
});

// /help
bot.on('/help', (msg) => {
    //Lähettää viestin
    bot.sendMessage(msg.from.id, `${msg.from.first_name} tarvitsetko apua? Tässä lisäohjeita:\n\nVoi etsiä pysäkkejä kirjoittamalla "/hae" ja pysäkin nimen.\nEsim. "/hae keilaniemi"\n\nVoit myös lähettää sijaintisi ja saadä lähistöltä lähdöt. Jos lähelläsi ei ole pysäkkejä, kokeile lähettää sijainti pysäkin läheltä.\n\nJos löydät bugin voit reportoida sen tekemällä /bugi\n\nMukavaa matkaa! 😊`); //Vastaa kun käyttäjä käyttää /start komentoa
    return console.log("[info] Help viesti lähetetty!")
});

// /menu
bot.on('/menu', msg => {
    //Lähettää viestin ja näppäimistön
    bot.sendMessage(msg.from.id, 'Valitse toiminto', { replyMarkup });
    return console.log("[info] Menu avattu!")
});

bot.on('/hae', msg => {
    return hae(msg.chat.id, msg.text);
})

bot.on(['location'], (msg, self) => {
    return sijainti(msg.chat.id, msg.location);
});

bot.start();