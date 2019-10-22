// poikkeus.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
var muuttujia = require('../flow/muutujia');
var moment = require('moment');
moment.locale('fi-FI');

var digiAPI = muuttujia.digiAPI;


function poikkeus(chatId, text) {
  // Jos pelkkä /poikkeukset palauttaa kaikki poikkeukset
  if (text == '/poikkeukset') {
    return kaikkipoikkeukset(chatId);
  } else {
    return poikkeuksetlinjalle(chatId, text);
  }
}

function kaikkipoikkeukset(chatId) {
  const query = `{
    alerts {
      alertDescriptionText
      alertSeverityLevel
      route {
        mode
      }
      }
    }`

  return request(digiAPI, query)
    .then(function (data) {
      var alerts = jp.query(data, '$..alerts')
      var alertDescriptions = jp.query(data, '$..alertDescriptionText')
      var alertEffects = jp.query(data, '$..alertSeverityLevel')
      var routes = jp.query(data, '$..route')
      var modes = jp.query(routes, '$..mode')

      if (alerts == '') {
        return bot.sendMessage(chatId, 'Ei tiedossa olevia häiriöitä tai poikkeuksia.')
      } else {
        let lista = [];
        let nahty = [];

        // Käy läpi jokaisen alertin
        for (i = 0; i < alertDescriptions.length; i += 1) {
          // Filteröi pois epärelevantit alertsit
          if (alertEffects[i] == 'INFO') {
            // Skip
          } else {
            //tarkistetaan onko uniikki
            if (nahty.indexOf(alertDescriptions[i]) === -1) {
              let viesti = '';

              if (routes[i] == null) {
                viesti = alertDescriptions[i]
              } else {
                mode = jp.query(routes[i], '$..mode')
                // Viestin alkuun merkki
                if (mode == "BUS") {
                  viesti = "Ⓑ " + alertDescriptions[i]
                } else if (mode == "SUBWAY") {
                  viesti = "Ⓜ " + alertDescriptions[i]
                } else if (mode == "TRAM") {
                  viesti = "Ⓡ " + alertDescriptions[i]
                } else if (mode == "RAIL") {
                  viesti = "Ⓙ " + alertDescriptions[i]
                } else if (mode == "FERRY") {
                  viesti = "Ⓛ " + alertDescriptions[i]
                } else {
                  viesti = alertDescriptions[i]
                }
              }
              // Poistaa linkin
              viesti = viesti.replace('Info: hsl.fi', '').replace('Info HSL.fi', '').replace('hsl.fi', '').replace('Info: HSL.fi', '').replace('HSL.fi', '').replace('INFO', '')
              lista.push(viesti.trim());
              nahty.push(alertDescriptions[i])
            }
          }
        }
        console.info("lähetetään poikkeukset");
        return bot.sendMessage(chatId, '<b>Tiedossa olevat poikkeukset</b>\n\n' + lista.join("\n\n") + "\n\n" + '<b>Lisätietoa: hsl.fi</b>\n\n<i>Voit hakea poikkeuksia myös linjakohtaisesti tekemällä </i><code>/poikkeukset</code><i> ja lisäämällä linjan tunnuksen perään, esim: </i><code>/poikkeukset 550</code><i>. Saat tarkemmat tiedot esim perutuista vuoroista.</i>', { parseMode: 'html'})
        lista = undefined;
      }
    })
}

//Exporttaa tän indexiin
module.exports = poikkeus;


function poikkeuksetlinjalle(chatId, text) {
  // console.log(moment().subtract(1, 'hours').calendar());
  // Sekunnit klo 00:sta
  // Your moment
  var mmt = moment();
  // Your moment at midnight
  var mmtMidnight = mmt.clone().startOf('day');
  var mmtSec = mmt.diff(mmtMidnight, 'seconds');
  var mmtMod = mmtSec - 10800;

  text = text.replace('/poikkeukset ', '');
  text = capitalize(text);

  console.log(text)

  lista = '';

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
      var alertDescriptions = jp.query(data, '$..alertDescriptionText')
      var routes = jp.query(data, '$..route')
      var shortNames = jp.query(routes, '$..shortName')

      nahty = [];

      // console.log(routes)

      // Aika pro koodaus move
      x = -1; 

      for (i = 0; i < alertDescriptions.length; i += 1) {
        if (routes[i] !== null) {
          x = x + 1;
          if (shortNames[x] === text) {
            viesti = alertDescriptions[i] + '\n\n'
            // viesti = viesti.replace('Info: hsl.fi', '').replace('Info HSL.fi', '').replace('hsl.fi', '').replace('Info: HSL.fi', '').replace('HSL.fi', '').replace('INFO', '')
            lista = lista + viesti
          } else {
            // Skip
          }
        } else {
          // Älä tee mitään
        }
      }

      // Perutut vuorot

      tripIdt = jp.query(data, '$..id')
      cancelled = jp.query(data, '$..scheduledDeparture')
      tunnukset = jp.query(data, '$..routeShortName')
      linjakilvet = jp.query(data, '$..headsign')
      modet = jp.query(data, '$..mode')
      ajat = jp.query(data, '$..scheduledDeparture')
      paivaukset = jp.query(data, '$..serviceDay')

      for (y = 0; y < cancelled.length; y += 1) {
        if (tunnukset[y] == text) {
          tripId = tripIdt[y]
          peruttu = cancelled[y]
          mode = modet[y]
          tunnus = tunnukset[y]
          aika = ajat[y]
          linjakilpi = linjakilvet[y]
          paivaus = paivaukset[y]

          // Aikajuttu
          var aikaNum = Number(aika)
          // Muuttaa tunneiksi, minuuteiksi ja sekunneiksi
          var departuretime = TimeFormat.fromS(aikaNum, 'hh:mm');
          // Limitoi sekunnit pois
          var departuretimeshort = limit(departuretime, 5)
          // Aamuyön kellonaikojen korjaus (Klo 4 astai, koska seuraavan päivän vuorot alkavat yleensä klo 5)
          if (aikaNum > 86400) {
            var departuretimeshort = departuretimeshort.replace('24:', '00:')
          } if (aikaNum > 90000) {
            var departuretimeshort = departuretimeshort.replace('25:', '01:')
          } if (aikaNum > 93600) {
            var departuretimeshort = departuretimeshort.replace('26:', '02:')
          } if (aikaNum > 97200) {
            var departuretimeshort = departuretimeshort.replace('27:', '03:')
          } if (aikaNum > 100800) {
            var departuretimeshort = departuretimeshort.replace('28:', '04:')
          }

          tanaan = moment().format('L')

          if (moment.unix(paivaus).format('L') == tanaan) {
            viestiC = tunnus + ' ' + linjakilpi + ' klo. ' + departuretimeshort + ' on peruttu'

            if (aikaNum > mmtMod) {
              lista = lista + viestiC + '\n\n'
            } else {
              console.info('Vanha peruttu')
            }

          } else {
            viestiC = tunnus + ' ' + linjakilpi + ' ' + moment.unix(paivaus).format('L') + ' klo. ' + departuretimeshort + ' on peruttu'
            lista = lista + viestiC + '\n\n'
          }
          
        }
      }

      // Viestin lähetys

      if (lista == '') {
        return bot.sendMessage(chatId, 'Ei tiedossa olevia poikkeuksia linjalle <b>' + text + '</b>', { parseMode: 'html' });
      } else {
        return bot.sendMessage(chatId, '<b>Poikkeukset linjalle ' + text + '</b>\n\n' + lista, { parseMode: 'html' });
      }
    })

    
}



const capitalize = (s) => {
  if (typeof s !== 'string')
      return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};