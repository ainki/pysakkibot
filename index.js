// index.js

//Vaatimukset
const bot = require('./bot')
const replyMarkup = require('./lib/flow/nappaimisto')
const hae = require('./lib/functions/hae')
const sijainti = require('./lib/functions/sijainti')
const admin = require('./lib/functions/admin')
const linja = require('./lib/functions/linja')
const poikkeus = require('./lib/functions/poikkeus')

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
    bot.sendMessage(msg.chat.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla /hae ja pysäkin nimen tai koodin.\n\nVoit etsiä aikatauluja tietylle linjalle pysäkiltä tekemällä /linja ja seuraamalla ohjeita\n\nVoit vaihtoehtoisesti myös lähettää sijaintisi ja saada lähistöltäsi seuraavat lähdöt!\n\nJos tarvitset lisää apua tee /help! 😄`, { replyMarkup }); //Vastaa kun käyttäjä käyttää /start komentoa
    return console.log("[info] Start viesti lähetetty!")
});

// /help
bot.on('/help', (msg) => {
    //Lähettää viestin
    bot.sendMessage(msg.chat.id, `Hei ${msg.from.first_name}. Täältä saa lisätietoa!\n\nKomennot:\n\n/hae - Etsi aikatauluja pysäkin mukaan. Voit joko hakea pysäkkejä nimen mukaan tai käyttää pysäkin koodia. Esim: '/hae niittykumpu' tai '/hae E4210'\n\n/linja - Etsi aikatauluja linjan perusteella. Anna ensinmäiseksi linjan numero, valitse määränpää ja pysäkki. Saat seuraavat lähdöt linjalle pysäkiltä.\n\nVoit lähettää myös sijainnin ja saat lähistöltä seuraavat lähdöt.\n\nSelitteet:\n12:00•‌   = Reaaliaikainen lähtöaika\n12:00!   = Muutoksia reitissä\n12:00×‌  = Vuoro on peruttu\n\nJos löydät bugin tai jotain epätavallista voit reportoida sen kehittäjälle: http://bit.ly/2CBok6s \n\nMukavaa matkaa! 😊`);
    return console.log("[info] Help viesti lähetetty!")
});

bot.on('/about', (msg) => {
    // Lähettää viestin
    bot.sendMessage(msg.chat.id, `Pysäkkibot 2.4.2\nMade by @ainki\n\nPysäkkibot käyttää digitransitin avointa reaaliaikaista dataa. Pysäkkibotin lähdekoodi löytyy: https://github.com/ainki/Pysakkibot-2.0 \n\nPoikkeusinfo: t.me/poikkeusinfohsl\nKaupunkipyörät: @kaupunkipyorabot`)
})

// /menu
bot.on('/menu', msg => {
    //Lähettää viestin ja näppäimistön
    bot.sendMessage(msg.chat.id, 'Valitse toiminto', { replyMarkup });
    return console.log("[info] Menu avattu!")
});

bot.on('/admin', (msg) => {
    return admin.admin(msg.chat.id)
});

bot.on('/hae', msg => {
    return hae(msg.chat.id, msg.text);
})

bot.on('/linja', msg => {
    return linja(msg.chat.id, msg.text);
})

bot.on('/poikkeukset', msg => {
    return poikkeus(msg.chat.id);
})

bot.on(['location'], (msg, self) => {
    return sijainti(msg.chat.id, msg.location);
});

bot.start();