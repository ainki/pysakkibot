// sijainti.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
const muuttujia = require('../flow/muutujia')

var digiAPI = muuttujia.digiAPI;
var tyhjavastausLOC = muuttujia.tyhjavastausLOC;


function sijainti(chatId, sijainti) {
    console.log(`[location] ${chatId}`)

    // erittelee lat ja lon
    var latitude = jp.query(sijainti, '$..latitude')
    var longitude = jp.query(sijainti, '$..longitude')

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
    }`

    // Hakulauseen suoritus
    return request(digiAPI, querygetlocation)
        .then(function (data) {
            var vastaus = JSON.stringify(data);
            if (vastaus == tyhjavastausLOC) {
                bot.sendMessage(chatId, `Läheltäsi ei valitettavastai löydy pysäkkejä.`);
                return console.log("[info] Ei pysäkkejä lähellä.")
            } else {
                // Datan haku queryn vastauksesta
                var nodehaku = jp.query(data, '$..node')
                var stoptimes = jp.query(nodehaku, '$..stoptimes')
                var distances = jp.query(nodehaku, '$..distance')
                var realtime = jp.query(nodehaku, '$..realtime')

                // Erotellaan lähdöt toisitaan
                for (i = 0; i < nodehaku.length; i += 1) {
                    //Hakee dataa requestista
                    var stoptimesif = JSON.stringify(stoptimes[i])
                    var stoptimes2 = stoptimes[i]
                    var node2 = nodehaku[i]
                    var distance = distances[i]

                    if (stoptimesif == "[]") {
                        //console.log("Hypätty yli!")
                    } else {
                        // Hakee ajan ja muuttaa sen numeroksi
                        var lahtoaika = jp.query(stoptimes2, '$..realtimeDeparture')
                        var lahtoaikaNUM = Number(lahtoaika)
                        // Muuttaa sekunnit tunneiksi ja minuuteiksi
                        var departuretime = TimeFormat.fromS(lahtoaikaNUM, 'hh:mm');
                        // Positaa sekunnit
                        var departuretimeshort = limit(departuretime, 5)
                        // Tuntien korjaus
                        if (lahtoaikaNUM > 86400) {
                            var departuretimeshort = departuretimeshort.replace('24:', '00:')
                        } if (lahtoaikaNUM > 90000) {
                            var departuretimeshort = departuretimeshort.replace('25:', '01:')
                        } if (lahtoaikaNUM > 93600) {
                            var departuretimeshort = departuretimeshort.replace('26:', '02:')
                        } if (lahtoaikaNUM > 97200) {
                            var departuretimeshort = departuretimeshort.replace('27:', '03:')
                        } if (lahtoaikaNUM > 100800) {
                            var departuretimeshort = departuretimeshort.replace('28:', '04:')
                        }
                        // Hakee linjan numeron tai kirjaimen
                        var shortname = jp.query(node2, '$..shortName')
                        // Hakee Määränpään
                        var headsign = jp.query(stoptimes2, '$..headsign')
                        // Hakee pysäkin
                        var pysakkikoodi = jp.query(stoptimes2, '$..code')
                        //var test = "Läʜᴛᴇᴇ Lɪɴᴊᴀ Määʀäɴᴘää                   Pʏsäᴋᴋɪ         Pʏsäᴋɪʟʟᴇ\n"
                        if (realtime[i] == true) {
                            //Yhdistää ajan, reaaliaikamerkin, numeron/kirjaimen ja määränpään
                            var yksittainenlahto = departuretimeshort + "•  " + shortname + " " + headsign + " - " + pysakkikoodi + " → "+distance+"m"+ "\n";
                        } else {
                            //Yhdistää ajan, numeron/kirjaimen ja määränpäänn
                            var yksittainenlahto = departuretimeshort + "    " + shortname + " " + headsign + " - " + pysakkikoodi + " → "+distance+"m"+ "\n";
                        }
                        
                        if (lahdot == null) {
                            lahdot = yksittainenlahto;
                        } else {
                            lahdot = lahdot + yksittainenlahto;
                        }
                    }
                }
                // Viestin lähetys
                // Jos ei lähtöjä lähellä
                if (lahdot == undefined) {
                    bot.sendMessage(chatId, `Ei lähtöjä lähistöllä`);
                    return console.log("[info] Ei lähtöjä viesti lähetetty.")
                    var lahdot = undefined;
                } else { // Muuten lähettää lähdöt
                    bot.sendMessage(chatId, `Lähdöt lähelläsi:\n\n${lahdot}`);
                    return console.log("[info] Location viesti lähetetty!")
                    var lahdot = undefined;
                }
            }
        })
};

module.exports = sijainti;