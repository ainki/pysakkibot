// index.js

// Importit
const bot = require('./bot');
const replyMarkup = require('./lib/flow/nappaimisto');
const hae = require('./lib/functions/hae');
const sijainti = require('./lib/functions/sijainti');
const linja = require('./lib/functions/linja');
const poikkeus = require('./lib/functions/poikkeus');
const pysakkiCheck = require('./lib/functions/pysakkiCheck');
const pysakki = require('./lib/functions/pysakki');
const liitynta = require('./lib/functions/liitynta');

let viimekomento = "";
// npm
require('console-stamp')(console, 'HH:MM:ss'); //Aikaleimat logiin

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id}: ${msg.text}`);
});

//Peruskomennot

bot.on('/start', (msg) => {
  viimekomento = "/start";
    //Lähettää viestin ja näppäimistön
    bot.sendMessage(msg.chat.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla /hae ja pysäkin nimen tai koodin.\n\nPysäkin sijainnin ja lähdöt saat tekemällä /pysakki ja antamalla pysakin nimen tai koodin.\n\nVoit etsiä aikatauluja tietylle linjalle pysäkiltä tekemällä /linja ja seuraamalla ohjeita\n\nVoit vaihtoehtoisesti myös lähettää sijaintisi ja saada lähistöltäsi seuraavat lähdöt!\n\nJos tarvitset lisää apua tee /help! 😄\n\nTehty käyttäen digitransitin avointa dataa. Digitransit.fi`, { replyMarkup }); //Vastaa kun käyttäjä käyttää /start komentoa
    return console.info("Start viesti lähetetty!");
});

bot.on('/help', (msg) => {
  viimekomento = "/help";
    //Lähettää viestin
    bot.sendMessage(msg.chat.id, `Hei ${msg.from.first_name}. Täältä saa lisätietoa!\n\nKomennot:\n\n/hae - Etsi aikatauluja pysäkin mukaan. Voit joko hakea pysäkkejä nimen mukaan tai käyttää pysäkin koodia. Esim: "/hae niittykumpu" tai "/hae E4210"\n\n /pysakki ja /pys - Pysäkin sijainti ja aikataulu. Voit joko hakea pysäkkejä nimen mukaan tai käyttää pysäkin koodia: "/pys Kauklahti" tai "/pysakki E4444" \n\n/linja - Etsi aikatauluja linjan perusteella. Anna ensinmäiseksi linjan tunnus, valitse määränpää ja pysäkki. Saat seuraavat lähdöt linjalle pysäkiltä.\n\n/liitynta - Etsi liityntäpysäköintipaikkoja. Esim. "/liitynta Niittykumpu", "/liitynta Hansatie" \n\nVoit lähettää myös sijainnin ja saat lähistöltä seuraavat lähdöt.\n\nSelitteet:\n12:00•‌   = Reaaliaikainen lähtöaika\n12:00!   = Muutoksia reitissä\n12:00×‌  = Vuoro on peruttu\n\nJos löydät bugin tai jotain epätavallista voit reportoida sen kehittäjille: https://bit.ly/2K3GJw1 \n\nMukavaa matkaa! 😊`);
    return console.info("Help viesti lähetetty!");
});

bot.on('/menu', msg => {
  viimekomento = '/menu';
    //Lähettää viestin ja näppäimistön
    bot.sendMessage(msg.chat.id, 'Valitse toiminto', { replyMarkup });
    return console.info("Menu avattu!");
});

bot.on('/hae', msg => {
    viimekomento = '/hae';
    return hae(msg.chat.id, msg.text);
});

bot.on('/linja', msg => {
      viimekomento = '/linja';
    return linja(msg.chat.id, msg.text);
});

bot.on('/poikkeukset', msg => {
      viimekomento = '/poikkeukset'
    return poikkeus(msg.chat.id, msg.text);
})

bot.on(['location'], (msg, self) => {
      viimekomento = 'location';
    return sijainti(msg.chat.id, msg.location);
});
bot.on('/pys', (msg) => {
      viimekomento = '/pys';
    //Lähettää viestin ja näppäimistön
      return pysakki(msg.chat.id, msg.text);
});
bot.on('/pysakki', (msg) => {
      viimekomento = '/pysakki';
    //Lähettää viestin ja näppäimistön
      return pysakki(msg.chat.id, msg.text);
});
bot.on('/liitynta', (msg) => {
  viimekomento = "/liitynta";
    //Lähettää viestin
    return liitynta(msg.chat.id, msg.text);
});
  bot.on('*', msg => {
    if (typeof(msg.text) === "string") {
    setTimeout(function () {
return pysakkiCheck(msg.chat.id, msg.text, viimekomento);
    }, 10);
}
  });



bot.start();
