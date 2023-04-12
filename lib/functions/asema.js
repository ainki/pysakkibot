// asema.js

const bot = require('../../bot')
var muuttujia = require('../flow/muutujia')

const { request } = require('graphql-request')

var digiAPI = muuttujia.digiAPI

function asema (asema, chatId) {
  // Haetaan asemat
  const queryGetStopTimesForStops = `{
    stations(name: "${asema}") {
      gtfsId
      name
      lat
      lon
      stops {
        gtfsId
        name
        code
        platformCode
      }
    }
  }`
  return request(digiAPI, queryGetStopTimesForStops)
    .then(function (data) {
      // returnataan haetut asemat
      return data.stations
    })

  // Jos errori koko höskässä konsoliin errorviesti.
    .catch(err => {
      console.error('Ongelma valinnassa')
      console.error(err)
      return bot.sendMessage(chatId, 'Ilmeni virhe 😕. Kokeile uudestaan!', { ask: 'askhaevalinta' })
    })
}
module.exports = asema
