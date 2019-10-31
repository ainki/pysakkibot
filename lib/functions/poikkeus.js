// poikkeus.js

const bot = require('../../bot');
const { request } = require('graphql-request');
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss');
var limit = require('limit-string-length');
var muuttujia = require('../flow/muutujia');
var moment = require('moment');
moment.locale('fi-FI');

var digiAPI = muuttujia.digiAPI;

// Näppäimistö
let replyMarkup = bot.keyboard([[bot.button('/hae'), bot.button('/reitti'), bot.button('location', 'Sijaintisi mukaan 📍')]], { resize: true });

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
    }`;

  return request(digiAPI, query)
    .then(function (data) {
      var alerts = jp.query(data, '$..alerts');
      var alertDescriptions = jp.query(data, '$..alertDescriptionText');
      var alertEffects = jp.query(data, '$..alertSeverityLevel');
      var routes = jp.query(data, '$..route');
      var modes = jp.query(routes, '$..mode');

      if (alerts == '') {
        return bot.sendMessage(chatId, 'Ei tiedossa olevia häiriöitä tai poikkeuksia.');
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
                viesti = alertDescriptions[i];
              } else {
                mode = jp.query(routes[i], '$..mode');
                // Viestin alkuun merkki
                switch (mode) {
                  case "BUS":
                      viesti = "Ⓑ " + alertDescriptions[i];
                    break;
                    case "SUBWAY":
                                viesti = "Ⓜ " + alertDescriptions[i];
                      break;
                      case "TRAM":
                            viesti = "Ⓡ " + alertDescriptions[i];
                        break;
                        case "RAIL":
                              viesti = "Ⓙ " + alertDescriptions[i];
                          break;
                          case "FERRY":
                              viesti = "Ⓛ " + alertDescriptions[i];
                            break;
                              default:
                                viesti = alertDescriptions[i];
                                break;
                }
              }
              // Poistaa linkin
              viesti = viesti.replace('Info: hsl.fi', '').replace('Info HSL.fi', '').replace('hsl.fi', '').replace('Info: HSL.fi', '').replace('HSL.fi', '').replace('INFO', '');
              lista.push(viesti.trim());
              nahty.push(alertDescriptions[i]);
            }
          }
        }
        console.info("lähetetään poikkeukset");
        return bot.sendMessage(chatId, '<b>Tiedossa olevat poikkeukset</b>\n\n' + lista.join("\n\n") + "\n\n" + '<b>Lisätietoa: hsl.fi</b>\n\n<i>Voit hakea poikkeuksia myös linjakohtaisesti tekemällä </i><code>/poikkeukset</code><i> ja lisäämällä linjan tunnuksen perään, esim: </i><code>/poikkeukset 550</code><i>. Saat tarkemmat tiedot esim perutuista vuoroista.</i>', { parseMode: 'html', replyMarkup });
      }
    });
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

  text = text.toUpperCase().replace('/poikkeukset ', '');

  console.log(text);

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
  }`;

  return request(digiAPI, query)
    .then(function (data) {
      var alertDescriptions = jp.query(data, '$..alertDescriptionText');
      var routes = jp.query(data, '$..route');
      var shortNames = jp.query(routes, '$..shortName');
      nahty = [];

      // console.log(routes)

      // Aika pro koodaus move
      x = -1;

      for (let i = 0; i < alertDescriptions.length; i++) {
        if (routes[i] !== null) {
          x += 1;
          if (shortNames[x] === text) {
            viesti = alertDescriptions[i] + '\n\n';
            // viesti = viesti.replace('Info: hsl.fi', '').replace('Info HSL.fi', '').replace('hsl.fi', '').replace('Info: HSL.fi', '').replace('HSL.fi', '').replace('INFO', '')
            lista = lista + viesti;

          }

        }
      }

      // Perutut vuorot

      tripIdt = jp.query(data, '$..id');
      cancelled = jp.query(data, '$..scheduledDeparture');
      tunnukset = jp.query(data, '$..routeShortName');
      linjakilvet = jp.query(data, '$..headsign');
      modet = jp.query(data, '$..mode');
      ajat = jp.query(data, '$..scheduledDeparture');
      paivaukset = jp.query(data, '$..serviceDay');

      for (y = 0; y < cancelled.length; y += 1) {
        if (tunnukset[y] == text) {
          tripId = tripIdt[y];
          peruttu = cancelled[y];
          mode = modet[y];
          tunnus = tunnukset[y];
          aika = ajat[y];
          linjakilpi = linjakilvet[y];
          paivaus = paivaukset[y];

          // Aikajuttu
          var aikaNum = Number(aika);
          // Muuttaa tunneiksi, minuuteiksi ja sekunneiksi
          var departuretime = TimeFormat.fromS(aikaNum, 'hh:mm');
          // Limitoi sekunnit pois
          var lahtoaikalyhyt = limit(departuretime, 5);
          // Aamuyön kellonaikojen korjaus (Klo 4 astai, koska seuraavan päivän vuorot alkavat yleensä klo 5)
          if (aikaNum > 86400) {
        let splitattu = lahtoaikalyhyt.split(":");
             lahtoaikalyhyt = splitattu[0]-24 +":"+ splitattu[1];
             lahtoaikalyhyt = "0" + lahtoaikalyhyt;
}
          tanaan = moment().format('L');

          if (moment.unix(paivaus).format('L') == tanaan) {
            viestiC = tunnus + ' ' + linjakilpi + ' klo. ' + lahtoaikalyhyt + ' on peruttu';

            if (aikaNum > mmtMod) {
              lista = lista + viestiC + '\n\n';
            } else {
              console.info('Vanha peruttu');
            }

          } else {
            viestiC = tunnus + ' ' + linjakilpi + ' ' + moment.unix(paivaus).format('L') + ' klo. ' + lahtoaikalyhyt + ' on peruttu';
            lista = lista + viestiC + '\n\n';
          }

        }
      }

      // Viestin lähetys

      if (lista == '') {
        return bot.sendMessage(chatId, 'Ei tiedossa olevia poikkeuksia linjalle <b>' + text + '</b>', { parseMode: 'html', replyMarkup });
      } else {
        return bot.sendMessage(chatId, '<b>Poikkeukset linjalle ' + text + '</b>\n\n' + lista, { parseMode: 'html', replyMarkup });
      }
    });


}



const capitalize = (s) => {
  if (typeof s !== 'string')
      return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};
