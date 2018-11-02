// index.js

//Vaatimukset
const bot = require('./bot')
const replyMarkup = require('./lib/flow/nappaimisto')
const hae = require('./lib/functions/hae')
const sijainti = require('./lib/functions/sijainti')
const admin = require('./lib/functions/admin')
const linja = require('./lib/functions/linja')

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
    bot.sendMessage(msg.chat.id, `Hei ${msg.from.first_name}. Täältä löytyy apua!\n\nVoit etsiä pysäkkejä tekemällä ”/hae” ja antamalla pysäkin nimen tai koodin esim.: ”/hae Keilaniemi”. Valitse tämän jälkeen oikea pysäkki näppäimistöstä ja saat pysäkin lähdöt.\n\nVoit etsiä tietyn linjan lähdöt tietyltä pysäkiltä tekemäälä /linja. Seuraamalla ohjeita saat linjan seuraavat lähdöt tietyltä pysäkiltä. Tämä ominaisuus on vielä hieman kesken, joten virheitä saattaa esiintyä.\n\nVoit myös lähettää sijaintisi painamalla näppäimistöstä ”Sijainnin mukaan 📍” näppäintä. Saat lähistön seuraavat lähdöt.\n\nJos kellonajan perässä on piste, se kertoo että kellonaika on reaaliaikainen ennuste linjan saapumisajasta.\n\nJos löydät bugin tai jotain epätavallista voit reportoida sen kehittäjälle: http://bit.ly/2CBok6s\n\nMukavaa matkaa! 😊`); //Vastaa kun käyttäjä käyttää /start komentoa
    return console.log("[info] Help viesti lähetetty!")
});

// /menu
bot.on('/menu', msg => {
    //Lähettää viestin ja näppäimistön
    bot.sendMessage(msg.chat.id, 'Valitse toiminto', { replyMarkup });
    return console.log("[info] Menu avattu!")
});

bot.on('/admin', (msg) => {
    return admin.admin(msg.chat.id)
});

bot.on('/adminhairio', (msg) => {
    return admin.adminhairio(msg.chat.id)
})  

bot.on('/hae', msg => {
    return hae(msg.chat.id, msg.text);
})

bot.on('/linja', msg => {
    return linja(msg.chat.id, msg.text);
})
*
bot.on(['location'], (msg, self) => {
    return sijainti(msg.chat.id, msg.location);
});

bot.start();