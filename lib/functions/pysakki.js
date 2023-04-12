// pysakki.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath')
var muuttujia = require('../flow/muutujia')
var lahtoListaus = require('./lahtoListaus')
const funktioita = require('../flow/funktioita')
const asema = require('./asema')

var nappaimisto
let replyMarkup = bot.keyboard(nappaimisto, { resize: true })

// funktioita
const chunkArray = funktioita.chunkArray
const filter = funktioita.filter
const numMaara = funktioita.numMaara
const capitalize = funktioita.capitalize

// muuttujia
const digiAPI = muuttujia.digiAPI

const viestinKoodit = []

// Hae komento
function hae (chatId, viesti) {
// tarkistetaan onko käyttäjä viestinKoodissa
  var index = viestinKoodit.findIndex(e => e.uid === chatId)
  if (!viestinKoodit.length || index !== -1) {
    viestinKoodit.push({ uid: chatId, koodit: [] })
  } else {
    viestinKoodit[index] = { uid: chatId, koodit: [] }
  }

  console.info('Kysytty pysäkkiä.')
  // Jos tkesti on pelkästään /pys, ohjelma kysyy pysäkin nimeä tai koodia erikseen
  if (viesti.trim() === '/pys') {
    return bot.sendMessage(chatId, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysnimi' }).then(re => { })
  } else if (viesti.trim() === '/pysakki') {
    return bot.sendMessage(chatId, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysnimi' }).then(re => { })
  } else {
    if (numMaara(viesti) === 4) {
      console.info('Haetaan aikatauluja...')
      // Lähetetään actioni
      bot.sendAction(chatId, 'typing')

      viesti = capitalize(viesti)
      // Funktioon siirtyminen
      return valintafunktio(chatId, viesti)
    } else {
      // Muuten etsii suoraan. Heittää viestin hetkinen ja menee pysäkkihaku funktioon
      console.info('Etsitään pysäkkiä')
      bot.sendAction(chatId, 'typing')
      // Kutuu funktion
      pysakkihaku(chatId, viesti)
    }
  }
}
// Exporttaa tän indexiin
module.exports = hae

// Pysäkkinimi kysymys
bot.on('ask.pysnimi', msg => {
  // tarkistetaan onko käyttäjä viestinKoodissa
  var index = viestinKoodit.findIndex(e => e.uid === msg.from.id)
  if (!viestinKoodit.length || index !== -1) {
    viestinKoodit.push({ uid: msg.from.id, koodit: [] })
  } else {
    viestinKoodit[index] = { uid: msg.from.id, koodit: [] }
  }

  let viesti
  if (msg.text) {
    viesti = msg.text.toLowerCase()
  }

  // Komennot jotka ei tee pysökkihakua
  if (filter(viesti, 'pysakki')) {
    viesti = viesti.replace('/pysakki', '').replace('/pys', '').trim()
    // jos numeroita 4
    if (numMaara(viesti) === 4) {
      viesti = capitalize(viesti)
      console.info('Haetaan aikatauluja...')
      // Lähetetään actioni
      bot.sendAction(msg.from.id, 'typing')
      // Funktioon siirtyminen
      return valintafunktio(msg.from.id, viesti)
    } else {
      console.info('Etsitään pysäkkiä')
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
      zoneId
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
      // Lähettää viestin ja kysymyksen
        bot.sendMessage(chatId, `Pysäkkiä "${viesti.replace('/pysakki', '').replace('/pys', '').trim()}" ei valitettavasti löydy.\nKokeile uudestaan 😄`, { ask: 'pysnimi' })
        return console.info('Pysäkkiä ei löytynyt.')
      } else {
      // Hakee pyäkit ja koodit niille
        var pysakit = jp.query(data, '$..name')
        const koodit = jp.query(data, '$..code')

        // Erittelee pysäkit ja yhdistää koodit
        const nappainvaihtoehdot = []
        const viestivaihtoehdot = []
        // haetaan käyttäjä
        const indeksi = viestinKoodit.findIndex(e => e.uid === chatId)
        if (indeksi !== -1) viestinKoodit[indeksi].koodit = koodit

        for (let i = 0; i < pysakit.length; i++) {
        // viestiin ja näppäimistöön tuleva komento
          const komento = '/pys ' + koodit[i]
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
        const replaced = viesti.replace('/pysakki', '').replace('/pys', '').trim()
        if (nappainvaihtoehdot.length === 1 && pysakit[0].toLowerCase() === replaced.toLowerCase()) {
          console.info('haetaan suoraan')
          return valintafunktio(chatId, replaced, 10)
        }

        // Rakennetaan nappaimisto
        replyMarkup = bot.keyboard(chunkArray(nappainvaihtoehdot, 5), { resize: true })

        // Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
        console.info('Valinnat lähetetty!')
        return bot.sendMessage(chatId, `Etsit pysäkkiä "${replaced}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${viestivaihtoehdot.join('\n')}\n\nValitse pysäkki näppämistöstä`, { replyMarkup, ask: 'pysnimi' })
      }
    }
    )
  // Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
    .catch(err => {
      console.error(' GraphQL error')
      console.error(err)
      return bot.sendMessage(chatId, 'Ongelma pyynnössä. Kokeile uudestaan!')
    })
}

// Valinta - /pys -> /xxxx (pysäkin tunnus)
function valintafunktio (chatId, valinta) {
  // Jos pelkästään kauttaviiva
  if (valinta === '/') {
    return bot.sendMessage(chatId, '"/" ei ole pysäkki. Kokeile uudestaan!', { ask: 'pysnimi' })
  }

  let valintavastaus = capitalize(valinta.replace('/pysakki', '').replace('/pys', '').trim())
  // lisätään H jos ei etuliitettä
  if (!isNaN(valintavastaus)) valintavastaus = 'H' + valintavastaus

  const queryGetStopTimesForStops = `{
   stops(name: "${valintavastaus}") {
     platformCode
     name
     lat
     lon
     code
     zoneId
     desc
     stoptimesWithoutPatterns (numberOfDepartures: 10, omitCanceled: false) {
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
      // lahtoListuas hoitaa lähtöjen listauksen
      var lahdotPysakeilta = lahtoListaus(data, false)
      const kviestinKoodit = viestinKoodit[viestinKoodit.findIndex(e => e.uid === chatId)]
      if (kviestinKoodit && !kviestinKoodit.koodit.includes(valintavastaus) && numMaara(valintavastaus) === 4) {
        replyMarkup = bot.keyboard(chunkArray(['/pys ' + valintavastaus], 1), { resize: true })

        if (data.stops[0]) {
          lahetaPysakinSijainti(chatId, data.stops[0].lat, data.stops[0].lon)
        }
        console.info('Lähdöt lähetetty1')
        return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'pysnimi', parseMode: 'html' })
      } else if (numMaara(valintavastaus) < 4) {
      // suoran haun näppäimistö

        nappaimisto = chunkArray([valintavastaus], 1)
        const replyMarkup = bot.keyboard(nappaimisto, { resize: true })

        if (data.stops[0]) {
          lahetaPysakinSijainti(chatId, data.stops[0].lat, data.stops[0].lon)
        }
        console.info('Lähdöt lähetetty2')
        return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'pysnimi', parseMode: 'html' })
      } else {
      // Viestin lähetys

        console.info('Lähdöt lähetetty3')
        lahetaPysakinSijainti(chatId, data.stops[0].lat, data.stops[0].lon)
        return bot.sendMessage(chatId, lahdotPysakeilta, { ask: 'pysnimi', parseMode: 'html' })
      }
    })

  // Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
    .catch(err => {
      console.error('GraphQL error')
      console.error(err)
      return bot.sendMessage(chatId, 'Ongelma valinnassa. Kokeile uudestaan!', { ask: 'pysnimi' })
    })
}

function lahetaPysakinSijainti (chatId, stationLat, stationLon) {
  // Kasaa ja lähettää aseman sijainnin 250ms aseman tietojen jälkeen
  setTimeout(function () {
    return bot.sendLocation(chatId, [parseFloat(stationLat), parseFloat(stationLon)], { replyMarkup })
  }, 250)
}
