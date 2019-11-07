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
  if (text.trim() == '/poikkeukset') {
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
      let kaikkilista = [];
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

            if (!alerts[0][i].route) {
              viesti = alertDescriptions[i];
            } else {
              let mode = jp.query(alerts[0][i].route, '$..mode');
              // Viestin alkuun merkki
              switch (mode) {
                case "BUS":  viesti = "Ⓑ " + alertDescriptions[i];
                break;
                case "SUBWAY":  viesti = "Ⓜ️ " + alertDescriptions[i];
                break;
                case "TRAM":  viesti = "Ⓡ " + alertDescriptions[i];
                break;
                case "RAIL":  viesti = "Ⓙ " + alertDescriptions[i];
                break;
                case "FERRY":  viesti = "Ⓛ " + alertDescriptions[i];
                break;
                default:
                viesti = alertDescriptions[i];
                break;
              }
            }
            // Poistaa linkin
            viesti = viesti.replace('Info: hsl.fi', '').replace('Info HSL.fi', '').replace('hsl.fi', '').replace('Info: HSL.fi', '').replace('HSL.fi', '').replace('INFO', '');
            kaikkilista.push(viesti.trim());
            nahty.push(alertDescriptions[i]);
          }
        }
      }
      console.info("lähetetään poikkeukset");
      return bot.sendMessage(chatId, '<b>Tiedossa olevat poikkeukset</b>\n\n' + kaikkilista.join("\n\n") + "\n\n" + '<b>Lisätietoa: hsl.fi</b>\n\n<i>Voit hakea poikkeuksia myös linjakohtaisesti tekemällä </i><code>/poikkeukset</code><i> ja lisäämällä linjan tunnuksen perään, esim: </i><code>/poikkeukset 550</code><i>. Saat tarkemmat tiedot esim perutuista vuoroista.</i>', { parseMode: 'html',replyMarkup});
    }
  });
}

//Exporttaa tän indexiin
module.exports = poikkeus;


function poikkeuksetlinjalle(chatId, text) {

  // Sekunnit klo 00:sta
  // Your moment
  var mmt = moment();
  // Your moment at midnight
  var mmtMidnight = mmt.clone().startOf('day');
  var mmtSec = mmt.diff(mmtMidnight, 'seconds');
  var sekunnit00sta = mmtSec - 10800;

  text = text.toUpperCase().replace('/POIKKEUKSET ', '');



  let perututlista = '';

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
    var alerts = jp.query(data, '$..alerts')[0];
    var alertDescriptions = jp.query(data, '$..alertDescriptionText');
    var routes = jp.query(data, '$..route');
    var shortNames = jp.query(routes, '$..shortName');
    let poikkeuslista = new Set([]);

    for (let i = 0; i < alerts.length; i++) {

      if (alerts[i].route) {
        if (alerts[i].route.shortName === text) {

          poikkeuslista.add(alertDescriptions[i]);

        }

      }
    }

    // Perutut vuorot
    let tripIdt = jp.query(data, '$..id');
    let cancelled = jp.query(data, '$..scheduledDeparture');
    let tunnukset = jp.query(data, '$..routeShortName');
    let linjakilvet = jp.query(data, '$..headsign');
    let modet = jp.query(data, '$..mode');
    let ajat = jp.query(data, '$..scheduledDeparture');
    let paivaukset = jp.query(data, '$..serviceDay');
    let tanaan = moment().format('L');
    for (y = 0; y < cancelled.length; y += 1) {
      if (tunnukset[y] == text) {


        // Aikajuttu
        var aikaNum = Number(tunnukset[y]);
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
        let viestiC = "";

        if (moment.unix(paivaukset[y]).format('L') == tanaan) {
          viestiC = tunnukset[y] + ' ' + linjakilvet[y] + ' klo. ' + lahtoaikalyhyt + ' on peruttu';

          if (aikaNum > sekunnit00sta) {
            perututlista += viestiC + '\n\n';
          } else {
            console.info('Vanha peruttu');
          }

        } else {
          viestiC = tunnus + ' ' + linjakilvet[y] + ' ' + moment.unix(paivaukset[y]).format('L') + ' klo. ' + lahtoaikalyhyt + ' on peruttu';
          perututlista += viestiC + '\n\n';
        }

      }
    }

    // Viestin lähetys
    let linjaviesti;
    if (poikkeuslista.size !== 0 && perututlista !== "") {
      linjaviesti = perututlista +'\n\n'+[...poikkeuslista].join(" \n\n\ ");
    }else if (perututlista) {
      linjaviesti = perututlista;
    }else if (poikkeuslista.size !== 0) {
      linjaviesti = [...poikkeuslista].join(" \n\n\ ");
    }


    if (perututlista === '' && poikkeuslista.size === 0) {
      return bot.sendMessage(chatId, 'Ei tiedossa olevia poikkeuksia linjalle <b>' + text + '</b>', { parseMode: 'html', replyMarkup });
    } else {
      return bot.sendMessage(chatId, '<b>Poikkeukset linjalle ' + text + '</b>\n\n' +linjaviesti+'\n\n', { parseMode: 'html', replyMarkup });
    }
  });


}
