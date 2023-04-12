// hae.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath')
const muuttujia = require('../flow/muutujia')
const lahtoListaus = require('./lahtoListaus')
const funktioita = require('../flow/funktioita')
const asema = require('./asema')

// funktioita
const filter = funktioita.filter
const numMaara = funktioita.numMaara
const chunkArray = funktioita.chunkArray
const capitalize = funktioita.capitalize

// muuttujia
const digiAPI = muuttujia.digiAPI

// Hae komento
function hae (msg) {
  let viesti = msg.text
  console.info('Kysytty pysäkkiä.')
  // Jos tkesti on pelkästään /hae, ohjelma kysyy pysäkin nimeä tai koodia erikseen
  if (viesti === '/hae') {
    return bot.sendMessage(msg.from.id, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysakkinimi' }).then(re => {
    })
  } else {
    let maara = 10

    const splitattu = msg.text.trim().split(',')
    viesti = splitattu[0]
    if (splitattu[1]) {
      maara = splitattu[1]
    }
    if (maara > 50) {
      return bot.sendMessage(msg.chat.id, 'Virheellinen haku. Liian monta lähtöä', { ask: 'ask/valinta' })
    }
    if (numMaara(viesti) === 4) {
      console.info('Haetaan aikatauluja...1', viesti)
      viesti = viesti.replace('/hae', '').trim()
      // Lähetetään actioni
      bot.sendAction(msg.from.id, 'typing')
      // viesti = viesti.replace("/hae", "").trim();
      viesti = capitalize(viesti)
      // Funktioon siirtyminen

      return valintafunktio(msg.from.id, viesti, maara)
    } else {
      // Muuten etsii suoraan. Heittää viestin hetkinen ja menee pysäkkihakufunktioon
      console.info('Etsitään pysäkkiä')
      bot.sendAction(msg.from.id, 'typing')
      // Poistaa "/hae " tekstin
      // viesti = viesti.replace("/hae", "").trim();
      // Kutsuu funktion

      pysakkihaku(msg.from.id, viesti)
    }
  }
}
// Exporttaa tän indexiin
module.exports = hae

// Pysäkkinimi kysymys
bot.on('ask.pysakkinimi', msg => {
  const text = msg.text.toLowerCase()

  // Komennot jotka ei tee pysökkihakua
  if (filter(text)) {
    const viesti = capitalize(text)
    // jos numeroita 4
    if (numMaara(text) === 4) {
      console.info('Haetaan aikatauluja...1')
      // Lähetetään actioni
      bot.sendAction(msg.from.id, 'typing')
      // Funktioon siirtyminen
      return valintafunktio(msg.from.id, viesti)
    } else {
      console.info('Etsitään pysäkkiä', text)
      // Lähetetään actioni
      bot.sendAction(msg.from.id, 'typing')
      // Funktioon siirtyminen
      pysakkihaku(msg.chat.id, viesti)
    }
  }
})

// Funktio pysäkkihaku
async function pysakkihaku (chatId, viesti) {
  // haetaan asemat
  const asemat = await asema(capitalize(viesti), chatId)

  // graphQL hakulause
  const query = `{
    stops(name: "${viesti}") {
      gtfsId
      platformCode
      name
      code
    }
  }`

  // Hakulauseen suoritus
  return request(digiAPI, query)
    .then(function (data) {
      // Data on vastaus GraphQL kyselystä
      // lisättävien asemien set
      const lisaaAsema = new Set()
      stoploop:
      for (var i = data.stops.length - 1; i > -1; i--) {
        if (!data.stops[i].code) {
          // jos pysäkistä puuttuu koodi, se poistetaan
          data.stops.splice(i, 1)
        } else {
          for (var y = 0; y < asemat.length; y++) {
            for (var x = 0; x < asemat[y].stops.length; x++) {
              if (asemat[y].stops[x].code === data.stops[i].code) {
                // lisätään pysäkkien hakutuloksiin tulevien asemien indexit settiin, jos asemasta löytyy koodi, joka on pysäkkihaun tuloksissa
                lisaaAsema.add(y)
                // jos pysäkki on molemmissa se poistetaan
                data.stops.splice(i, 1)
                // hypätään seuraavaan iteraatioon
                continue stoploop
              }
            }
          }
        }
      }

      lisaaAsema.forEach(z => {
        // lisätään indexien mukaan pysäkkivaihtoehtoihin
        data.stops.push(asemat[z].stops)
      })
      // "tasoitetaan" ja järjestetään stopit
      var merged = [].concat.apply([], data.stops)
      data.stops = merged.sort((a, b) => a.name.localeCompare(b.name))
      // Jos pysäkin nimellä ei löydy pysäkkiä
      if (!Object.keys(data.stops).length) {
        // || data.stops[0].code === null
        // Lähettää viestin ja kysymyksen
        bot.sendMessage(chatId, `Pysäkkiä <i>${viesti.replace('/hae', '').trim()}</i> ei valitettavasti löydy.\nKokeile uudestaan 😄`, { ask: 'pysakkinimi', parseMode: 'html' })
        return console.info('Pysäkkiä ei löytynyt.')
      } else {
        // Hakee pyäkit ja koodit niille
        var pysakit = jp.query(data, '$..name')
        const koodit = jp.query(data, '$..code')

        // arrayt vaihtoehdoille
        const nappainvaihtoehdot = []
        const viestivaihtoehdot = []
        // Erittelee pysäkit ja yhdistää koodit
        for (let i = 0; i < pysakit.length; i++) {
          // viestiin ja näppäimistöön tuleva komento
          const komento = '/' + koodit[i]
          var pk
          if (!data.stops[i].platformCode && koodit[i]) {
            // Yhdistää muuttujaan valinnat
            pk = komento + ' ' + pysakit[i] + ' - ' + koodit[i]
            // lisätään vaihtoehdot

            if (nappainvaihtoehdot.indexOf(komento) === -1) {
              viestivaihtoehdot.push(pk)
              nappainvaihtoehdot.push(komento)
            }
          } else if (data.stops[i].platformCode && koodit[i]) {
            pk = komento + ' ' + pysakit[i] + ' - ' + koodit[i] + ' - Lait. ' + data.stops[i].platformCode
            // lisätään vaihtoehdot jos sitä ei ole jo vaihtoehdoissa
            if (nappainvaihtoehdot.indexOf(komento) === -1) {
              viestivaihtoehdot.push(pk)
              nappainvaihtoehdot.push(komento)
            } else {
              if (data.stops[i].platformCode) {
                // lisätään laiturit
                viestivaihtoehdot[nappainvaihtoehdot.indexOf(komento)] += viestivaihtoehdot[nappainvaihtoehdot.indexOf(komento)].includes('Lait.') ? ', ' + data.stops[i].platformCode : ' - Lait. ' + data.stops[i].platformCode
              }
            }
          }
        }
        const replaced = viesti.replace('/hae', '').trim()
        if (nappainvaihtoehdot.length === 1 && pysakit[0].toLowerCase() === replaced.toLowerCase()) {
          console.log('haetaan suoraan')
          return valintafunktio(chatId, replaced)
        }
        // Näppäimistö jaetaan kahteen riviin
        var nappaimisto = chunkArray(nappainvaihtoehdot, 5)
        // Rakennetaan näppaimistö
        const replyMarkup = bot.keyboard(nappaimisto, { resize: true })

        // Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
        console.log('Valinnat lähetetty!')
        return bot.sendMessage(chatId, `Etsit pysäkkiä <i>${replaced}</i>.\nValitse alla olevista vaihtoehdoista oikea pysäkki!\n\n${viestivaihtoehdot.join('\n')}\n\nVoit valita pysäkin myös näppäimistöstä! 😉`, { replyMarkup, ask: 'pysakkinimi', parseMode: 'html' })
      }
    })
  // Jos errori koko höskässä konsoliin errorviesti.
    .catch(err => {
      console.error('Ongelma pyynnössä')
      console.error(err)
      return bot.sendMessage(chatId, 'Ongelma pyynnössä 😕. Kokeile uudestaan!')
    })
}

// Valinta - /HAE -> /xxxx (pysäkin tunnus)
function valintafunktio (chatId, valinta, maara) {
  // lisätään H jos ei etuliitettä
  if (!isNaN(valinta)) valinta = 'H' + valinta

  if (!maara) {
    maara = 10
  }
  // Jos pelkästään kauttaviiva

  if (valinta === '/') {
    return bot.sendMessage(chatId, '"/" ei ole pysäkki. Kokeile uudestaan!', { ask: 'pysakkinimi' })
  }

  if (!valinta.includes('/')) {
    // Query
    const queryGetStopTimesForStops = `{
      stops(name: "${capitalize(valinta)}") {
        platformCode
        name
        code
        zoneId
        desc
        stoptimesWithoutPatterns (numberOfDepartures: ${maara}, omitCanceled: false) {
          serviceDay
          realtimeDeparture
          realtimeState
          pickupType
          dropoffType
          headsign
          trip {
            pattern {
              route {
                shortName
                alerts {
                  alertSeverityLevel
                }
              }
            }
          }
        }
      }
    }`

    // Hakulauseen suoritus
    return request(digiAPI, queryGetStopTimesForStops)
      .then(function (data) {
        const koodit = jp.query(data, '$..code')
        // lahtoListuas hoitaa lähtöjen listauksen
        var lahdotPysakeilta = lahtoListaus(data)

        var nappaimisto
        if (numMaara(valinta) < 4) {
          // suoran haun näppäimistö
          nappaimisto = chunkArray(['/' + koodit[0]], 1)
          const replyMarkup = bot.keyboard(nappaimisto, { resize: true })
          console.info('Lähdöt lähetetty2')
          return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'askpysakkivalinta', parseMode: 'html' })
        } else {
          // Viestin lähetys ja näppäimistö /hae E4444 haulle
          nappaimisto = koodit[0] ? chunkArray(['/' + koodit[0]], 1) : chunkArray([])
          const replyMarkup = bot.keyboard(nappaimisto, { resize: true })
          console.info('Lähdöt lähetetty3')
          return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'askpysakkivalinta', parseMode: 'html' })
        }
      })

    // Jos errori koko höskässä konsoliin errorviesti.
      .catch(err => {
        console.error('Ongelma valinnassa')
        console.error(err)
        return bot.sendMessage(chatId, 'Ongelma valinnassa 😕. Kokeile uudestaan!', { ask: 'pysakkinimi' })
      })
  }
}
