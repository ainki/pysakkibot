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
    const alerts = data.alerts.filter((e, i, s) => s.findIndex(t => t.alertDescriptionText === e.alertDescriptionText) === i);
    if (!alerts.length) {
      return bot.sendMessage(chatId, 'Ei tiedossa olevia häiriöitä tai poikkeuksia.');
    } else {
      let kaikkilista = [];
      let nahty = [];

      // Käy läpi jokaisen alertin
      kaikkilista = alerts.reduce((a,e) => {
        // a on viimeks returnattu arvo, johon kertyy pushin kaut arvoi; e on tänhetkinen arvo iteroinnis
        alertDescription = e.alertDescriptionText;
        // Filteröi pois epärelevantit alertsit
        if (e.alertSeverityLevel !== 'INFO') {
          //tarkistetaan onko uniikki
            let viesti = '';

            if (!e.route) {
              viesti = alertDescription;
            } else {
              let mode = jp.query(e.route, '$..mode');
              // Viestin alkuun merkki
              switch (mode[0]) {
                case "BUS":  viesti = "Ⓑ " + alertDescription;
                break;
                case "SUBWAY":  viesti = "Ⓜ " + alertDescription;
                break;
                case "TRAM":  viesti = "Ⓡ " + alertDescription;
                break;
                case "RAIL":  viesti = "Ⓙ " + alertDescription;
                break;
                case "FERRY":  viesti = "Ⓛ " + alertDescription;
                break;
                default:
                viesti = alertDescription;
                break;
              }
            }
          a.push(poistaLinkki(viesti).trim()); //lisätään kerryttäjää
        }
        return a; //returnaa aina muuten ei toimi!
      },[]); // [] kosk käsitellää arrayt
      console.info("lähetetään poikkeukset");
      // return bot.sendMessage(chatId, '<b>Tiedossa olevat poikkeukset</b>\n\n' + kaikkilista.join("\n\n") + "\n\n" + '<b>Lisätietoa: hsl.fi</b>\n\n<i>Voit hakea poikkeuksia myös linjakohtaisesti tekemällä </i><code>/poikkeukset</code><i> ja lisäämällä linjan tunnuksen perään, esim: </i><code>/poikkeukset 550</code><i>. Saat tarkemmat tiedot esim perutuista vuoroista.</i>', { parseMode: 'html',replyMarkup, ask: 'linjapoikkeus'});
      return bot.sendMessage(chatId, '<b>Tiedossa olevat poikkeukset</b>\n\n' + kaikkilista.join("\n\n") + "\n\n" + '<b>Lisätietoa: hsl.fi</b>\n\n<i>Anna linjan tunnus linjakohtaisille poikkeuksille!</i>', { parseMode: 'html',replyMarkup, ask: 'linjapoikkeus'});
    }
  });
}

//Exporttaa tän indexiin
module.exports = poikkeus;


function poikkeuksetlinjalle(chatId, text) {

    // Sekunnit klo 00:sta
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
      var alertDescriptions = jp.query(data, '$..alertDescriptionText');
      var routes = jp.query(data, '$..route');
      var shortNames = jp.query(routes, '$..shortName');

      const poikkeuslista = data.alerts.reduce((a,e) => {

      if (e.route && e.route.shortName === text){
        let poikkeus = e.alertDescriptionText;
         // Poistetaan linkki
        a.push(poistaLinkki(poikkeus).trim());
      }
        return a; //returnaa aina muuten ei toimi!
      },[]); // [] kosk käsitellää arrayt

    // Perutut vuorot
    let tripIdt = jp.query(data, '$..id');
    let cancelled = jp.query(data, '$..scheduledDeparture');
    let tunnukset = jp.query(data, '$..routeShortName');
    let linjakilvet = jp.query(data, '$..headsign');
    let modet = jp.query(data, '$..mode');
    let ajat = jp.query(data, '$..scheduledDeparture');
    let paivaukset = jp.query(data, '$..serviceDay');
    let tanaan = moment().format('L');
    for (y = 0; y < cancelled.length; y++) {

      if (tunnukset[y] === text) {
        // Aikajuttu
        var aikaNum = Number(ajat[y]);
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
    if (poikkeuslista.length !== 0 && perututlista !== "") {
      linjaviesti = perututlista +'\n\n'+[...poikkeuslista].join(" \n\n\ ");
    }else if (perututlista) {
      linjaviesti = perututlista;
    }else if (poikkeuslista.length !== 0) {
      linjaviesti = [...poikkeuslista].join(" \n\n\ ");
    }


    if (perututlista === '' && poikkeuslista.length === 0) {
      return bot.sendMessage(chatId, 'Ei tiedossa olevia poikkeuksia linjalle <b>' + text + '</b>', { parseMode: 'html', replyMarkup, ask: 'linjapoikkeus' });
    } else {
      return bot.sendMessage(chatId, '<b>Poikkeukset linjalle ' + text + '</b>\n\n' +linjaviesti+'\n\n', { parseMode: 'html', replyMarkup, ask: 'linjapoikkeus' });
    }
  });


}

bot.on('ask.linjapoikkeus', msg => {
  if(!msg.text.includes("/")) return poikkeuksetlinjalle(msg.chat.id, msg.text);
  });

function poistaLinkki(poikkeus) {
  if (poikkeus.includes("Info")) {
    return poikkeus.split("Info")[0];
    }else if (poikkeus.includes("Lisätietoa")) {
    return poikkeus.split("Lisätietoa")[0];
    }else if (poikkeus.includes("HSL")) {
      return poikkeus.split("HSL")[0];
    }
    return poikkeus;
}
