// sijainti.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
//const digiAPI = require('../flow/muutujia')
const tyhjavastausLOC = require('../flow/muutujia')
//Väliaikaisesti digiapi näin
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';


function sijainti(chatId, sijainti) {
    console.log(`[location] ${chatId}`)

    //erittelee lat ja lon
    var latitude = jp.query(sijainti, '$..latitude')
    var longitude = jp.query(sijainti, '$..longitude')
    //Query
    const querygetlocation = `{
        places: nearest(
        lat: ${latitude},
        lon: ${longitude},
        maxDistance: 1000, 
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

    //Hakulauseen suoritus
    return request(digiAPI, querygetlocation)
        .then(function (data) {
            var vastaus = JSON.stringify(data);
            if (vastaus == tyhjavastausLOC) {
                bot.sendMessage(chatId, `Läheltäsi ei valitettavastai löydy pysäkkejä.`);
                return console.log("[info] Ei pysäkkejä lähellä.")
            } else {
                //Datan haku queryn vastauksesta
                var nodehaku = jp.query(data, '$..node')
                var stoptimes = jp.query(nodehaku, '$..stoptimes')

                //Erotellaan lähdöt toisitaan
                for (i = 0; i < nodehaku.length; i += 1) {
                    var stoptimesif = JSON.stringify(stoptimes[i])
                    var stoptimes2 = stoptimes[i]
                    var node2 = nodehaku[i]

                    if (stoptimesif == "[]") {
                        //console.log("Hypätty yli!")
                    } else {
                        //Hakee ajan ja muuttaa sen numeroksi
                        var realtime = jp.query(stoptimes2, '$..realtimeDeparture')
                        var realtimeNUM = Number(realtime)
                        //Muuttaa sekunnit tunneiksi ja minuuteiksi
                        var departuretime = TimeFormat.fromS(realtimeNUM, 'hh:mm');
                        //Positaa sekunnit
                        var departuretimeshort = limit(departuretime, 5)
                        //Tuntien korjaus
                        if (realtimeNUM > 86400) {
                            var departuretimeshort = departuretimeshort.replace('24:', '00:')
                        } if (realtimeNUM > 90000) {
                            var departuretimeshort = departuretimeshort.replace('25:', '01:')
                        } if (realtimeNUM > 93600) {
                            var departuretimeshort = departuretimeshort.replace('26:', '02:')
                        } if (realtimeNUM > 97200) {
                            var departuretimeshort = departuretimeshort.replace('27:', '03:')
                        } if (realtimeNUM > 100800) {
                            var departuretimeshort = departuretimeshort.replace('28:', '04:')
                        }
                        //Hakee linjan numeron tai kirjaimen
                        var shortname = jp.query(node2, '$..shortName')
                        //Hakee Määränpään
                        var headsign = jp.query(stoptimes2, '$..headsign')
                        //Hakee pysäkin
                        var pysakkikoodi = jp.query(stoptimes2, '$..code')
                        //Yhdistää 
                        var yksittainenlahto = departuretimeshort + "  " + shortname + " " + headsign + " - " + pysakkikoodi + "\n";
                        if (lahdot == null) {
                            lahdot = yksittainenlahto;
                        } else {
                            lahdot = lahdot + yksittainenlahto;
                        }
                    }
                }
                //Viestin lähetys
                //Jos ei lähtöjä lähellä
                if (lahdot == undefined) {
                    bot.sendMessage(chatId, `Ei lähtöjä lähistöllä`);
                    return console.log("[info] Ei lähtöjä viesti lähetetty.")
                    var lahdot = undefined;
                } else { //Muuten lähettää lähdöt
                    bot.sendMessage(chatId, `Lähdöt lähelläsi:\n\n${lahdot}`);
                    return console.log("[info] Location viesti lähetetty!")
                    var lahdot = undefined;
                }
            }
        })
};

module.exports = sijainti;