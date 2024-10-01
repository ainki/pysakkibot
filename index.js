// index.js

// Importit
const bot = require('./bot')
const replyMarkup = require('./lib/flow/nappaimisto')
const hae = require('./lib/functions/hae')
const sijainti = require('./lib/functions/sijainti')
const linja = require('./lib/functions/linja')
const poikkeus = require('./lib/functions/poikkeus')
const pysakkiCheck = require('./lib/functions/pysakkiCheck')
const pysakki = require('./lib/functions/pysakki')
const liitynta = require('./lib/functions/liitynta')
const reitti = require('./lib/functions/reitti')

let viimekomennot = []
// npm
require('console-stamp')(console, 'HH:MM:ss') // Aikaleimat logiin

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
  console.log(`[text] ${msg.chat.id}: ${msg.text}`)
})

// Peruskomennot

bot.on('/start', (msg) => {
  viimekomennot = paivitaViimeKomento(viimekomennot, '/start', msg.from.id)
  // viimekomennot.push({komento:"/start", id: msg.from.id});
  // Lähettää viestin ja näppäimistön
  bot.sendMessage(msg.chat.id, `<b>Hei, ${msg.from.first_name}! Tervetuloa käyttämään Pysäkkibottia!</b>\n\n/hae\nHae aikatauluja pysäkin mukaan. Kirjoita pysäkin nimi tai koodia ja saat pysäkin seuraavat 10 lähtöä.\n\n/reitti  🆕\nHae reittiohjeita paikasta A paikkaan B. Anna vain lähtöpaikka ja määränpää!\n\n/linja\nHae lähöjä tietylle linjalle tietyltä pysäkiltä.\n\n/liitynta\nEi käytössä.\n\n/pysakki\nHae aikatauluja ja pysäkin sijaintia pysäkin nimen tai koodin perusteella.\n\nVoit myös lähettää sijaintisi ja saat lähistön seuraavat lähdöt.\n\nJos tarvitset lisää apua tee /help!\nTai löydät ajantasaisimmat ohjeet GitHub sivuilta tekemällä /git 😄\n\n<b>Kaupunkipyörät @kaupunkipyorabot!</b>`, { replyMarkup, parseMode: 'html' }) // Vastaa kun käyttäjä käyttää /start komentoa
  return console.info('Start viesti lähetetty!')
})

bot.on('/help', (msg) => {
  viimekomennot = paivitaViimeKomento(viimekomennot, '/help', msg.from.id)
  // Lähettää viestin
  bot.sendMessage(msg.chat.id, `Hei ${msg.from.first_name}. Täältä saa lisätietoa!\n\nKomennot:\n\n/hae - Etsi aikatauluja pysäkin mukaan. Voit joko hakea pysäkkejä nimen mukaan tai käyttää pysäkin koodia. Esim: "/hae niittykumpu" tai "/hae E4210"\n\n/pysakki ja /pys - Pysäkin sijainti ja aikataulu. Voit joko hakea pysäkkejä nimen mukaan tai käyttää pysäkin koodia: "/pys Kauklahti" tai "/pysakki E4444" \n\n/linja - Etsi aikatauluja linjan perusteella. Anna ensinmäiseksi linjan tunnus, valitse määränpää ja pysäkki. Saat seuraavat lähdöt linjalle pysäkiltä.\n\n/liitynta - Etsi liityntäpysäköintipaikkoja. Esim. "/liitynta Niittykumpu", "/liitynta Hansatie" \n\nVoit lähettää myös sijainnin ja saat lähistöltä seuraavat lähdöt.\n\nSelitteet:\n12:00•‌   = Reaaliaikainen lähtöaika\n12:00!   = Muutoksia reitissä\n12:00×‌  = Vuoro on peruttu\n00:23⁺¹‌‌‎ = Vuoro lähtee seuraavana päivänä \n\n\nTarkemmat ohjeet löydät projektin GitHub sivustolta: https://github.com/ainki/pysakkibot#ominaisuudet-ja-k%C3%A4ytt%C3%B6ohjeet\n\nJos löydät bugin tai jotain epätavallista voit reportoida sen kehittäjille: https://github.com/ainki/pysakkibot/issues \n\nMukavaa matkaa! 😊`)
  return console.info('Help viesti lähetetty!')
})

bot.on('/git', msg => {
  viimekomennot = paivitaViimeKomento(viimekomennot, '/git', msg.from.id)
  // Lähettää viestin ja näppäimistön
  bot.sendMessage(msg.chat.id, `Hei ${msg.from.first_name}.\n\nOhjeet ja lähdekoodi löytyy osoitteesta https://github.com/ainki/pysakkibot`)
  return console.info('Git viesti lähetetty avattu!')
})

bot.on('/menu', msg => {
  viimekomennot = paivitaViimeKomento(viimekomennot, '/menu', msg.from.id)
  // Lähettää viestin ja näppäimistön
  bot.sendMessage(msg.chat.id, 'Valitse toiminto', { replyMarkup })
  return console.info('Menu avattu!')
})

bot.on('/hae', msg => {
  viimekomennot = paivitaViimeKomento(viimekomennot, '/hae', msg.from.id)
  return hae(msg)
})

bot.on('/linja', msg => {
  viimekomennot = paivitaViimeKomento(viimekomennot, '/linja', msg.from.id)
  return linja(msg)
})

bot.on('/poikkeukset', msg => {
  viimekomennot = paivitaViimeKomento(viimekomennot, '/poikkeukset', msg.from.id)
  return poikkeus(msg.chat.id, msg.text)
})

bot.on(['location'], (msg) => {
  console.log('[location]' + msg.from.id)
  return sijainti(msg)
})

bot.on('/pys', (msg) => {
  viimekomennot = paivitaViimeKomento(viimekomennot, '/pys', msg.from.id)
  // Lähettää viestin ja näppäimistön
  return pysakki(msg.chat.id, msg.text)
})

bot.on('/pysakki', (msg) => {
  viimekomennot = paivitaViimeKomento(viimekomennot, '/pysakki', msg.from.id)
  // Lähettää viestin ja näppäimistön
  return pysakki(msg.chat.id, msg.text)
})

bot.on('/liitynta', (msg) => {
  // viimekomennot = paivitaViimeKomento(viimekomennot, '/liitynta', msg.from.id)
  // Lähettää viestin
  // return liitynta(msg.chat.id, msg.text)
})

bot.on('/reitti', (msg) => {
  viimekomennot = paivitaViimeKomento(viimekomennot, '/reitti', msg.from.id)
  // Lähettää viestin
  return reitti(msg)
})

bot.on('*', msg => {
  if (typeof (msg.text) === 'string') {
    setTimeout(function () {
      return pysakkiCheck(msg, msg.text, viimekomennot)
    }, 10)
  }
})

bot.start()
function paivitaViimeKomento (komennot, komento, chatId) {
  if (komennot.length === 0) {
    console.log(1)
    komennot.push({ komento, id: chatId })
    return komennot
  }
  for (let i = 0; i < komennot.length; i++) {
    console.log(2)
    if (komennot[i].id === chatId) {
      komennot[i].komento = komento
      break
    }
  }
  return komennot
}
