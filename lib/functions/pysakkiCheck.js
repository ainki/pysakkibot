// pysakkiCheck.js
const bot = require('../../bot')
var muuttujia = require('../flow/muutujia');
var lahtoListaus = require('./lahtoListaus');
const { request } = require('graphql-request');
// muuttujia
var digiAPI = muuttujia.digiAPI;

var kayttajat = []

function pysakkiCheck(chatId, text) {
    if (text.includes('/')) {
        text = text.replace('/', '')
        if (numMaara(text) === 4) {
            for (i = 0; i < kayttajat.length; i += 1) {
                if (kayttajat[i] == chatId) {
                    return
                } else {
                }
            }
            text = capitalize(text);
            console.log("[info] Haetaan aikatauluja...")
            // Lähetetään actioni
            bot.sendAction(chatId, 'typing')
            kayttajat.push(chatId)
            // Funktioon siirtyminen
            return valintafunktio(chatId, text, 1);
        } else {
            return kayttajat.push(chatId)
        }
    }
}

module.exports = pysakkiCheck;

function valintafunktio(chatId, valinta, asetus) {

    const queryGetStopTimesForStops = `{
    stops(name: "${valinta}") {
      platformCode
      name
      code
      stoptimesWithoutPatterns (numberOfDepartures: 10) {
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
                alertDescriptionText
              }
            }
          }
        }
      }
    }
  }`


    //Hakulauseen suoritus
    return request(digiAPI, queryGetStopTimesForStops)
        .then(function (data) {
            // lahtoListuas hoitaa lähtöjen listauksen
            var lahdotPysakeilta = lahtoListaus(data);

            if (asetus == 1) {
                var valintaArr = []
                valintaArr.push('/' + valinta)
                var nappaimisto = chunkArray(valintaArr, 1);
                let replyMarkup = bot.keyboard(nappaimisto, { resize: true })
                console.log('[info] Lähdöt lähetetty')
                return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'askpysakkivalinta' });
            } else {
                //Viestin lähetys
                console.log('[info] Lähdöt lähetetty')
                return bot.sendMessage(chatId, lahdotPysakeilta, { ask: 'askpysakkivalinta' });
            }
        })
}

function numMaara(viesti) {
    //tarkistetaan numeroiden määrä
    return viesti.replace(/[^0-9]/g, "").length;
}

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

function chunkArray(myArray, chunk_size) {
    var results = [];

    while (myArray.length) {
        results.push(myArray.splice(0, chunk_size));
    }
    results.push([bot.button('/hae'), bot.button('/linja'), bot.button('location', 'Sijaintisi mukaan 📍')])
    return results;
}