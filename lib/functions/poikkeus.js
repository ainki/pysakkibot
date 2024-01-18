// poikkeus.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath')
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length')
var muuttujia = require('../flow/muutujia')
const modes = require('../components/modeIcon')
var moment = require('moment')
moment.locale('fi-FI')

const digiAPI = muuttujia.digiAPI

// Näppäimistö
const replyMarkup = bot.keyboard([[bot.button('/hae'), bot.button('/reitti'), bot.button('location', 'Sijaintisi mukaan 📍')]], { resize: true })

function poikkeus (chatId, text) {
  // Jos pelkkä /poikkeukset palauttaa kaikki poikkeukset
  if (text.trim() === '/poikkeukset') {
    return yleisetPoikkeukset(chatId)
  } else {
    return poikkeuksetlinjalle(chatId, text)
  }
}

function yleisetPoikkeukset (chatId) {
    // graphQL hakulause
    const query = `
    {
      alerts {
        id
        alertHeaderText
        alertDescriptionText
        alertEffect
        alertSeverityLevel
        effectiveStartDate
        effectiveEndDate
        route {
          mode
        }
      }
    }`

    return request(muuttujia.digiAPI, query)
    .then(function (data) {
      // Datan käsittely ->
      const alerts = data.alerts
      const poikkeusViestit = listaaPoikkeukset(alerts, chatId)
      if (poikkeusViestit) {
        const viesti = '<b>Tiedossa olevat poikkeukset</b>\n\n' + poikkeusViestit + '\n\n<b>Lisätietoa: hsl.fi</b>\n<i>Anna linjan tunnus linjakohtaisille poikkeuksille!</i>'
        bot.sendMessage(chatId, viesti, { parseMode: 'html', replyMarkup, ask: 'linjapoikkeus' })
      } else {
        const viesti = '<b>Ei tiedossa olevia häiriöitä tai poikkeuksia.</b>\n\n' + poikkeusViestit + '\n<b>Lisätietoa: hsl.fi</b>\n<i>Anna linjan tunnus linjakohtaisille poikkeuksille!</i>'
        bot.sendMessage(chatId, viesti, { parseMode: 'html', replyMarkup, ask: 'linjapoikkeus' })
      }
    })
}

function listaaPoikkeukset (alerts, chatId) {
  const poikkeuksetViestiin = []
  const poikkeukset = []
  for (let i = 0; i < alerts.length; i += 1) { // Menee jokaisen poikkeuksen läpi
    if (alerts[i].effectiveStartDate < moment().unix()) { // Tarkistaa poikkeuksen vaikutausaikan
      if (!(alerts[i].alertSeverityLevel === 'INFO' && alerts[i].alertEffect === 'NO_EFFECT')) { // Filteröidään info ja no effect pois
        if (!(poikkeukset.some(item => item.id === alerts[i].id) || poikkeukset.some(item => item.desc === alerts[i].alertDescriptionText))) { // Tarkistaa onko poikkeus jo olemassa
          const sameDescAlerts = alerts.filter(item => item.alertDescriptionText === alerts[i].alertDescriptionText)
          sameDescAlerts.forEach((row) => {
            const poikkeus = { id: row.id, desc: row.alertDescriptionText }
            poikkeukset.push(poikkeus)
          })
          const yksiPoikkeus = poikkeusViestiRakennus(alerts[i], sameDescAlerts)
          poikkeuksetViestiin.push(yksiPoikkeus)
        }
      }
    }
  }
  return viesti = poikkeuksetViestiin.join('\n\n')
}

// Viestin rakennus
function poikkeusViestiRakennus (alertsi, sameDescAlerts) {
  const allModesForAlert = [...new Set(sameDescAlerts.map(item => item.route && item.route.mode).filter(Boolean))]
  let alertModes = ''
  if (allModesForAlert) {
    allModesForAlert.forEach((row) => {
      alertModes = alertModes + modes.modeSwitch(row)
    })
  }
  const viesti = alertModes + '<b>' + alertsi.alertHeaderText + '</b>\n' + alertsi.alertDescriptionText
  return viesti
}


// Exporttaa tän indexiin
module.exports = poikkeus

function poikkeuksetlinjalle (chatId, text) {
  // Sekunnit klo 00:sta
  var mmt = moment()
  // Your moment at midnight
  var mmtMidnight = mmt.clone().startOf('day')
  var mmtSec = mmt.diff(mmtMidnight, 'seconds')
  var sekunnit00sta = mmtSec - 10800

  text = text.toUpperCase().replace('/POIKKEUKSET ', '')

  let perututlista = ''

  // Alertsien etsintä
  const query = `{
    alerts {
      alertDescriptionText
      alertSeverityLevel
      route {
        mode
        shortName
      }
    }
    cancelledTripTimes {
      scheduledDeparture
      realtimeState
      headsign
      serviceDay
      trip {
        routeShortName
        tripHeadsign
        id
        pattern {
          route {
            mode
          }
        }
      }
    }
  }`

  return request(digiAPI, query)
    .then(function (data) {
      const poikkeuslista = data.alerts.reduce((a, e) => {
        if (e.route && e.route.shortName === text) {
          const poikkeus = e.alertDescriptionText
          // Poistetaan linkki
          a.push(poistaLinkki(poikkeus).trim())
        }
        return a // returnaa aina muuten ei toimi!
      }, []) // [] kosk käsitellää arrayt

      // Perutut vuorot
      const cancelled = jp.query(data, '$..scheduledDeparture')
      const tunnukset = jp.query(data, '$..routeShortName')
      const linjakilvet = jp.query(data, '$..headsign')
      const ajat = jp.query(data, '$..scheduledDeparture')
      const paivaukset = jp.query(data, '$..serviceDay')
      const tanaan = moment().format('L')
      for (let y = 0; y < cancelled.length; y++) {
        const tunnus = tunnukset[y]
        if (tunnus === text) {
        // Aikajuttu
          var aikaNum = Number(ajat[y])
          // Muuttaa tunneiksi, minuuteiksi ja sekunneiksi
          var departuretime = TimeFormat.fromS(aikaNum, 'hh:mm')
          // Limitoi sekunnit pois
          var lahtoaikalyhyt = limit(departuretime, 5)
          // Aamuyön kellonaikojen korjaus (Klo 4 astai, koska seuraavan päivän vuorot alkavat yleensä klo 5)
          if (aikaNum > 86400) {
            const splitattu = lahtoaikalyhyt.split(':')
            lahtoaikalyhyt = splitattu[0] - 24 + ':' + splitattu[1]
            lahtoaikalyhyt = '0' + lahtoaikalyhyt
          }
          let viestiC = ''

          if (moment.unix(paivaukset[y]).format('L') === tanaan) {
            viestiC = tunnus + ' ' + linjakilvet[y] + ' klo. ' + lahtoaikalyhyt + ' on peruttu'

            if (aikaNum > sekunnit00sta) {
              perututlista += viestiC + '\n\n'
            } else {
              console.info('Vanha peruttu')
            }
          } else {
            viestiC = tunnus + ' ' + linjakilvet[y] + ' ' + moment.unix(paivaukset[y]).format('L') + ' klo. ' + lahtoaikalyhyt + ' on peruttu'
            perututlista += viestiC + '\n\n'
          }
        }
      }

      // Viestin lähetys
      let linjaviesti
      if (poikkeuslista.length !== 0 && perututlista !== '') {
        linjaviesti = perututlista + '\n\n' + [...poikkeuslista].join(' \n\n ')
      } else if (perututlista) {
        linjaviesti = perututlista
      } else if (poikkeuslista.length !== 0) {
        linjaviesti = [...poikkeuslista].join(' \n\n ')
      }

      if (perututlista === '' && poikkeuslista.length === 0) {
        return bot.sendMessage(chatId, 'Ei tiedossa olevia poikkeuksia linjalle <b>' + text + '</b>', { parseMode: 'html', replyMarkup, ask: 'linjapoikkeus' })
      } else {
        return bot.sendMessage(chatId, '<b>Poikkeukset linjalle ' + text + '</b>\n\n' + linjaviesti + '\n\n', { parseMode: 'html', replyMarkup, ask: 'linjapoikkeus' })
      }
    })
}

bot.on('ask.linjapoikkeus', msg => {
  if (!msg.text.includes('/')) return poikkeuksetlinjalle(msg.chat.id, msg.text)
})

function poistaLinkki (poikkeus) {
  const jakolista = ['//', 'info', 'lisätietoa', 'lisätiedot', 'hsl']
  const pikkuPoikkeus = poikkeus.toLowerCase()
  const indeksi = jakolista.findIndex((e) => pikkuPoikkeus.includes(e)) // etitään mikä jakolistan elementti löytyy poikkeuksesta
  return (indeksi === -1) ? poikkeus : poikkeus.slice(0, pikkuPoikkeus.indexOf(jakolista[indeksi])) // poistetaan se jakamalla
}
