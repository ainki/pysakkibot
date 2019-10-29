// sijainti.js

const bot = require('../../bot');
const { request } = require('graphql-request');
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss');
var limit = require('limit-string-length');
const muuttujia = require('../flow/muutujia');
const onlyDate = require('./onlyDate.js');

var digiAPI = muuttujia.digiAPI;
var tyhjavastausLOC = muuttujia.tyhjavastausLOC;


function sijainti(chatId, sijainti) {
    let lahdot = "";
    console.log(`[location] ${chatId}`);

    // erittelee lat ja lon
    var latitude = jp.query(sijainti, '$..latitude');
    var longitude = jp.query(sijainti, '$..longitude');

    // Query
    const querygetlocation = `{
        places: nearest(
        lat: ${latitude},
        lon: ${longitude},
        maxDistance: 1500,
        maxResults: 20,
        first:20,
        filterByPlaceTypes: DEPARTURE_ROW
          ) {
        edges {
          node {
            distance
            place {
              ... on DepartureRow {
                stoptimes(timeRange: 7200, numberOfDepartures: 1, startTime: 0) {
                  pickupType
                  realtimeDeparture
                  headsign
                  realtime
                  serviceDay
                  trip {
                    pattern {
                      route {
                        shortName
                      }
                    }
                  }
                  stop {
                    name
                    code
                    platformCode
                  }
                }
              }
            }
          }
        }
      }
    }`;

    // Hakulauseen suoritus
    return request(digiAPI, querygetlocation)
        .then(function (data) {
            var vastaus = JSON.stringify(data);
            if (vastaus == tyhjavastausLOC) {
                bot.sendMessage(chatId, `Läheltäsi ei valitettavastai löydy pysäkkejä.`);
                return console.info("Ei pysäkkejä lähellä.");
            } else {
                // Datan haku queryn vastauksesta
                var nodehaku = jp.query(data, '$..node');
                var stoptimes = jp.query(nodehaku, '$..stoptimes');
                var distances = jp.query(nodehaku, '$..distance');
                var realtime = jp.query(nodehaku, '$..realtime');
                let lahtopaiva = jp.query(nodehaku, '$..serviceDay');
                // Erotellaan lähdöt toisitaan
                for (let i = 0; i < nodehaku.length; i++) {
                    //Hakee dataa requestista
      lahtopaiva[i] =new Date( lahtopaiva[i] *1000);
                    if (JSON.stringify(stoptimes[i]) === "[]") {
                        //console.log("Hypätty yli!")
                    } else {
  var lahtoaika = jp.query(stoptimes[i], '$..realtimeDeparture');
                      var lahtoaikaNUM = Number(lahtoaika);
                      // Muuttaa tunneiksi, minuuteiksi ja sekunneiksi
                       lahtoaika = limit(TimeFormat.fromS(lahtoaikaNUM, 'hh:mm'),5);
                      // Limitoi sekunnit pois

                      // Aamuyön kellonaikojen korjaus (Klo 4 astai, koska seuraavan päivän vuorot alkavat yleensä klo 5)
                      //lisätään "⁺¹" jos seuraava päivä
              const todaysDate = new Date();
              if(lahtopaiva[i].onlyDate() > todaysDate.onlyDate()) {
              lahtoaika = lahtoaika + "‏‏‎⁺¹";
              }
                      if (lahtoaikaNUM > 86400) {
                    let splitattu = lahtoaika.split(":");
                         lahtoaika = splitattu[0]-24 +":"+ splitattu[1];
                         lahtoaika = "0" + lahtoaika;
                         if (todaysDate.getHours() > 4) {
                           lahtoaika = lahtoaika + "‏‏‎⁺¹";
                         }

                      }
                        // Hakee linjan numeron tai kirjaimen
                        var shortname = jp.query(nodehaku[i], '$..shortName');
                        // Hakee Määränpään
                        var headsign = jp.query(stoptimes[i], '$..headsign');
                        // Hakee pysäkin
                        var pysakkikoodi = jp.query(stoptimes[i], '$..code');
                        //var test = "Läʜᴛᴇᴇ Lɪɴᴊᴀ Määʀäɴᴘää                   Pʏsäᴋᴋɪ         Pʏsäᴋɪʟʟᴇ\n"
                        var yksittainenlahto;
                        realtime[i] ? yksittainenlahto = lahtoaika + "•  " + shortname + " " + headsign + " - " + pysakkikoodi + " → "+ distances[i]+"m"+ "\n"  :  yksittainenlahto = lahtoaika + "    " + shortname + " " + headsign + " - " + pysakkikoodi + " → "+ distances[i]+"m"+ "\n";

if (typeof yksittainenlahto !== undefined) {
lahdot += yksittainenlahto;
}


                }
              }
                // Viestin lähetys
                // Jos ei lähtöjä lähellä
                if (lahdot == undefined) {
                    bot.sendMessage(chatId, `Ei lähtöjä lähistöllä`);
                    return console.info("'Ei lähtöjä' viesti lähetetty.");
                } else { // Muuten lähettää lähdöt
                    bot.sendMessage(chatId, 'Lähdöt lähelläsi:\n\n'+ lahdot);
                    return console.info("Sijaintiviesti lähetetty!");
                }
            }
        });
}

module.exports = sijainti;
