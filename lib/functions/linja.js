// linja.js

const bot = require('../../bot')
const { request } = require('graphql-request')
const jp = require('jsonpath')
const date = require('date-and-time')
const muuttujia = require('../flow/muutujia')
const funktioita = require('../flow/funktioita')
var lahtoListaus = require('./lahtoListaus')

// funktioita
const chunkArray = funktioita.chunkArray
const capitalize = funktioita.capitalize

let kayttajat = []

var digiAPI = muuttujia.digiAPI

function linja (msg) {
  let haettuLinja
  if (!kayttajat.length || !kayttajat.some(e => e.uid === msg.chat.id)) {
    kayttajat.push({ uid: msg.chat.id })
  }
  // Jos saadaan vain /linja, kysytään ask.linjatunnuksella linjaa
  if (msg.text === '/linja') {
    console.info('Kysytään linjaa.')
    return bot.sendMessage(msg.chat.id, 'Anna linjan tunnus 😄', { replyMarkup: 'hide', ask: 'linjatunnus' })
  } else {
    // jätetty et jos sais sen linjan pysäkkihaun toimii joskus
    const splitattu = msg.text.trim().split(',')
    haettuLinja = splitattu[0]
    if (splitattu[1]) {
      return maaranpaat(msg.from.id, valinta, splitattu[1])
    }
    bot.sendAction(msg.chat.id, 'typing')
    console.info('Etsitään linjaa')
    // Poistaa "/linja " tekstin
    haettuLinja = haettuLinja.replace('/linja ', '').toUpperCase()
    // Kutuu funktion
    return maaranpaat(msg.chat.id, haettuLinja)
  }
}
// Exporttaa linja funktion index.js:sään'
module.exports = linja

// Kysyy linjatunnusta
bot.on('ask.linjatunnus', msg => {
  const valinta = msg.text.toUpperCase()
  // Tähän komennot joita jotka ei tee hakua
  if (!valinta.includes('/')) {
    bot.sendAction(msg.from.id, 'typing')
    console.info('Haetaan linjaa')
    // Kutsuu maaranpaat funtion
    return maaranpaat(msg.from.id, valinta)
  }
})

// maaranpaat funktio
function maaranpaat (chatId, linja, pysakki) {
  // päivämäärä queryä varten
  const nyt = new Date()
  const tanaan = date.format(nyt, 'YYYYMMDD')

  // graphQL querylause
  const query = `{
    routes(name: "${linja}") {
      shortName
      longName
      patterns {
        headsign
        code
        tripsForDate(serviceDate: "${tanaan}") {
          tripHeadsign
        }
      }
    }
  }`

  return request(digiAPI, query)
    .then(function (data) {
    // Tekee näppäimistöt, vaihtoehdot arrayn ja vaihtoehtonumeron
      var nappaimistoVaihtoehdot = []
      var vaihtoehdot = []
      var numerot = []
      var vaihtoehtoNumero = 0
      var maaranpaalista = []

      // Hakee queryn vastauksesta tiettyjä arvoja
      var shortNames = jp.query(data, '$..shortName')
      var patterns = jp.query(data, '$..patterns')
      var linjatunnus
      var eiTrippeja = false
      const linjanIdt = []
      // Eritellään toisistaan
      for (let i = 0; i < shortNames.length; i++) {
      // Linjatunnus ja pattterni eritellään
        linjatunnus = shortNames[i]

        // Vain haettu tunnus kelpaa, query palauttaa kaikki tunnukset, jossa sama yhdistelmä (esim jos hakee '146' query palauttaa kaikki '146,146A,146N')
        if (linjatunnus.toUpperCase() === linja) {
        // Hakee patternista maääränpäät, koodin ja päivän tripit
          const linjakilpi = jp.query(patterns[i], '$..headsign')
          const linjanId = jp.query(patterns[i], '$..code')
          const tripsForDate = jp.query(patterns[i], '$..tripsForDate')

          // Jokaiselle määränpäälle
          for (let x = 0; x < linjakilpi.length; x++) {
            // Jos ei trippejä tänään tai seuraavana päivänä
            if (tripsForDate[x][0] === undefined) {
              eiTrippeja = true
              console.info('Ei trippejä')
              // Älä tee mitään
            } else {
              console.info('On trippejä. linjanId: ' + linjanId[x] + ' - ' + linjakilpi[x] + ' - ' + x)

              linjanIdt.push(linjanId[x])

              // Lisää ykkösen jokaista määränpäärä varten
              vaihtoehtoNumero++

              // Lisää dataaa näppäimistöön ja vaihtoehtoihin
              nappaimistoVaihtoehdot.push(JSON.stringify(vaihtoehtoNumero))
              numerot.push(JSON.stringify(vaihtoehtoNumero))
              vaihtoehdot.push(JSON.stringify(vaihtoehtoNumero), linjanId[x])

              // Määrnänpäät maaranpaalistaan linjaä varten
              maaranpaalista.push(vaihtoehtoNumero + ' - ' + linjakilpi[x])
            }
          } break
        }
      }
      // Jos linja löytyy, muttei lähtöjä

      var nappaimisto = chunkArray([])
      let replyMarkup = bot.keyboard(nappaimisto, { resize: true })
      if (!maaranpaalista.length && eiTrippeja) {
        console.info('Ei lähtöjä linjalla')
        return bot.sendMessage(chatId, `Linjalla <i>${linjatunnus}</i> ei ole lähtöjä.\n\nEtsi toista?`, { replyMarkup, ask: 'linjatunnus', parseMode: 'html' })
      } else if (!maaranpaalista.length) {
      // Jos määränpäälista on tyhjä, sovellus palauttaa ettei linjaa löydy
        console.info('Linjaa ei löytynyt')
        return bot.sendMessage(chatId, `Linjaa <i>${linja}</i> ei löytynyt.\n\nKokeile uudestaan!`, { replyMarkup, ask: 'linjatunnus', parseMode: 'html' })
      }

      lisaaKayttajalle(chatId, 'L', numerot, linjanIdt)
      if (maaranpaalista.length && maaranpaalista.length === 1) return pysakkienhaku(chatId, linjanIdt[0])

      // Tekee elementin johon talletetaan linjakoodeihin tarvittavan datan
      nappaimisto = chunkArray(nappaimistoVaihtoehdot, 4)
      replyMarkup = bot.keyboard(nappaimisto, { resize: true })
      // Lähettää vietin ja näppäimistön
      // pysakki ? linjanPysakki(chatId, linja, pysakki) : bot.sendMessage(chatId, `Määränpäät linjalle <i>${linjatunnus}</i>:\n\n${maaranpaalista.join('\n')}\n\nValitse määränpää näppäimistöstä!`, { replyMarkup, ask: 'maaranpaavalinta', parseMode: 'html' })
      bot.sendMessage(chatId, `Määränpäät linjalle <i>${linjatunnus}</i>:\n\n${maaranpaalista.join('\n')}\n\nValitse määränpää näppäimistöstä!`, { replyMarkup, ask: 'maaranpaavalinta', parseMode: 'html' })
      return console.info('Määränpäät lähetetty')
    })
    .catch(err => {
      console.error(' GraphQL error \n', err)
      return bot.sendMessage(chatId, 'Ongelma pyynnössä 😕. Kokeile uudestaan!')
    })
}

bot.on('ask.maaranpaavalinta', msg => {
  // Jos valinnassa on kauttaviiva, sovellus poistaa käyttäjistä tiedot
  if (msg.text.includes('/')) {
    // Poistaa käyttäjistä user id:n perusteella
    tyhjennaArr(msg.from.id)
  } else {
    // Action typing
    // Haetaan käyttäjän indeksi
    const index = kayttajat.findIndex(e => e.uid === msg.chat.id)
    const linjanIdt = kayttajat[index].linjanIdt
    const valintaNumerot = kayttajat[index].numerot
    if (kayttajat[index] !== -1) {
      for (let x = 0; x < valintaNumerot.length; x++) {
        if (valintaNumerot[x] === msg.text) {
          bot.sendAction(msg.from.id, 'typing')
          // Element tallennetaan käyttäjälle seuraavaa vaihetta varten.
          lisaaKayttajalle(msg.chat.id, 'M', linjanIdt[x])
          // Kutsuu pysäkkihaku-funktioon
          return pysakkienhaku(msg.chat.id, linjanIdt[x])
        }
      }
      bot.sendMessage(msg.from.id, 'Virheellinen määränpäänumero, kokeile uudestaan!', { ask: 'maaranpaavalinta', parseMode: 'html' })
    }
  }
})

function pysakkienhaku (chatId, linjanId) {
  // Hakulause
  const query = `{
    pattern(id: "${linjanId}") {
      headsign
      name
      code
      stops {
        gtfsId
        name
        code
      }
    }
  }`

  return request(digiAPI, query)
    .then(function (data) {
      const stopsHaku = jp.query(data, '$..stops')
      const pysakkinimet = jp.query(stopsHaku, '$..name')
      const pysakinKoodit = jp.query(stopsHaku, '$..code')
      const pysakinIdt = jp.query(stopsHaku, '$..gtfsId')
      // tehään uus array näppäimistön pysäkille muuten ei toimi
      const nappainpysakit = pysakkinimet.map(x => x)
      // Tallentaa pysakit objektiin pysäkkien nimet ja koodit
      lisaaKayttajalle(chatId, 'P', { stopNames: pysakkinimet, stopCodes: pysakinKoodit, stopIds: pysakinIdt })

      // Uusi näppäimistö
      const replyMarkup = bot.keyboard(chunkArray(nappainpysakit, 3), { resize: true })
      // Lähettää pysäkkivaihtoehdot käyttäjälle
      return bot.sendMessage(chatId, 'Valitse pysäkki näppäimistöstä!', { replyMarkup, ask: 'pysakkivalinta' })
    })
}

bot.on('ask.pysakkivalinta', msg => {
  console.info('Kysytty pysäkkkivalintaa')
  // Typing action
  bot.sendAction(msg.from.id, 'typing')
  return aikataulut(msg.chat.id, capitalize(msg.text))
})

function aikataulut (chatId, valinta) {
  console.info('haetaan aikatauluja')

  // userId:n indexi
  const index = kayttajat.findIndex(e => e.uid === chatId)
  const pysakitKooditJaIdt = kayttajat[index].pysakitKooditJaIdt
  // Jos valinnassa "/" sovellus poistaa pysakeista ja linjakoodeista tiedot
  if (valinta.includes('/')) {
    // Poistaa käyttäjistä tallennetun datan
    tyhjennaArr(chatId)

    return console.info('Ei vastattu kysymykseen.')
  }
  const linjanId = kayttajat[index].linjanId ? kayttajat[index].linjanId : kayttajat[index].linjanIdt[0]
  console.log(index)

  if (index !== -1) {
    if (index !== -1) {
      // const pysakinKoodit = pysakitKooditJaIdt.stopCodes;
      const pysakinNimet = pysakitKooditJaIdt.stopNames
      for (let x = 0; x < pysakinNimet.length; x++) {
        if (valinta === pysakinNimet[x] || valinta === pysakitKooditJaIdt.stopCodes[x]) {
          // Pysäyttää loopin
          return query(pysakitKooditJaIdt.stopIds[x], linjanId)
        }
      }
      return bot.sendMessage(chatId, `Pysäkkiä <i>${valinta}</i> ei valitettavasti löydy valitulle linjalle.\nKokeile uudestaan!`, { ask: 'pysakkivalinta', parseMode: 'html' })
    }
  }

  // console.debug('Pysäkin koodi: ' + pysakinKoodit[x] + ' - Linjan koodi: ' +linjanId)
  // Hakulause
  function query (pysakinId, linjanId) {
    const query = `{
    stop(id: "${pysakinId}") {
      platformCode
      name
      code
      zoneId
      desc
      stopTimesForPattern(id:"${linjanId}",numberOfDepartures: 10, omitCanceled: false) {
        serviceDay
        realtimeDeparture
        realtimeState
        pickupType
        headsign
        trip {
          route{
            shortName
            alerts {
              alertSeverityLevel
            }
          }
        }
      }
    }
  }`

    return request(digiAPI, query)
      .then(function (data) {
        data.stops = [data.stop]
        delete data.stop
        console.info('lähetetään aikataulu')
        return bot.sendMessage(chatId, lahtoListaus(data, true), { ask: 'pysakkivalinta', parseMode: 'html' })
      })
  }
}
function lisaaKayttajalle (uid, tyyppi, arg1, arg2) {
  const index = kayttajat.findIndex((e) => e.uid === uid)
  switch (tyyppi) {
    case 'L':
      kayttajat[index].numerot = arg1
      kayttajat[index].linjanIdt = arg2
      break
    case 'M': kayttajat[index].linjanId = arg1
      break
    case 'P': kayttajat[index].pysakitKooditJaIdt = arg1
      break
    default:
      console.error('Tuntematon tyyppi!')
  }
}
function tyhjennaArr (chatId) {
  kayttajat = kayttajat.filter(e => e.uid !== chatId)
  console.info('poistettu linjan arraysta')
}
