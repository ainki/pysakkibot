// sijainti.js

const bot = require('../../bot');
const {request} = require('graphql-request');
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
    var lat = jp.query(sijainti, '$..latitude');
    var lon = jp.query(sijainti, '$..longitude');

    // Query
    const querygetlocation = `{
    places: nearest(
      lat: ${lat},
      lon: ${lon},
      maxDistance: 2000,
      maxResults: 30,
      first:30,
      filterByPlaceTypes: DEPARTURE_ROW
    ) {
      edges {
        node {
          distance
          place {
            ... on DepartureRow {
              stoptimes(timeRange: 10800, numberOfDepartures: 1, startTime: 0) {
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
                    var distance = jp.query(nodehaku, '$..distance');

                    let pysakit = [];
                    let pysahdykset = [];

                    // Erotellaan lähdöt toisitaan
                    for (let i = 0; i < nodehaku.length; i++) {
                        let lahtopaiva = jp.query(stoptimes[i], '$..serviceDay');
                        // Hakee linjan numeron tai kirjaimen
                        var shortname = jp.query(nodehaku[i], '$..shortName');
                        // Hakee Määränpään
                        var headsign = jp.query(stoptimes[i], '$..headsign');
                        // Hakee pysäkin koodin
                        var koodi = jp.query(stoptimes[i], '$..code');
                          // Hakee pysäkin nimen
                        var pysakkinimi = jp.query(stoptimes[i], '$..name');
                        // realtime
                        var realtime = jp.query(stoptimes[i], '$..realtime');
                        //lahtoaika
                        var lahtoaika = jp.query(stoptimes[i], '$..realtimeDeparture');

                        //jos oikeesti olemassa oleva lähtö
                        if (lahtoaika[0] !== undefined && lahtopaiva !== undefined) {
                          //lisään objektiarrayhin pysakit
                            pushToArray(pysakit, {koodi: koodi[0], nimi: pysakkinimi[0], distance: distance[i], yksittaisetlahdot: []});
                            //lähdot
                            pysahdykset.push({koodi: koodi[0], pysakkinimi: pysakkinimi[0], lahtoaika: lahtoaika[0], distance: distance[i], realtime: realtime[0], lahtopaiva: lahtopaiva[0], shortname: shortname, headsign: headsign});
                        }

                    }
                    // järjestetään pysähdykset lähtöajan mukaan.
                    pysahdykset = sorttaaObj(pysahdykset, "lahtoaika");

                    // pysahdykset = sorttaaObj(pysahdykset);
                    for (let i = 0; i < pysahdykset.length; i++) {
                        //Hakee dataa requestista

                        lahtopaiva = new Date(pysahdykset[i].lahtopaiva * 1000);
                        var lahtoaikaNUM = Number(pysahdykset[i].lahtoaika);
                        // Muuttaa tunneiksi, minuuteiksi ja sekunneiksi
                        pysahdykset[i].lahtoaika = limit(TimeFormat.fromS(lahtoaikaNUM, 'hh:mm'), 5);
                        // Limitoi sekunnit pois

                        // Aamuyön kellonaikojen korjaus (Klo 4 astai, koska seuraavan päivän vuorot alkavat yleensä klo 5)
                        //lisätään "⁺¹" jos seuraava päivä
                        const todaysDate = new Date();
                        //jos lähtöpäivä on huomenna lisätään ‏‏‎"⁺¹"
                        if (lahtopaiva.onlyDate() > todaysDate.onlyDate()) {
                            pysahdykset[i].lahtoaika = pysahdykset[i].lahtoaika + "‏‏‎⁺¹";
                        }
                        //jos kello on yli 24, mutta lähtöpäivä tänään
                        if (lahtoaikaNUM > 86400) {
                          //jaetaan kahteen kaksoispisteen kohdalta
                            let splitattu = pysahdykset[i].lahtoaika.split(":");
                            //vähännetään ylimenevästä kellonajasta 24 ja rakenetaan kellonaika
                            pysahdykset[i].lahtoaika = splitattu[0] - 24 + ":" + splitattu[1];
                            pysahdykset[i].lahtoaika = "0" + pysahdykset[i].lahtoaika;
                            if (todaysDate.getHours() > 4) {
                              //lisätään ‏‏‎"⁺¹" vain jos kello on ennen neljää, koska sillon serviceDay muuttuu
                                pysahdykset[i].lahtoaika = pysahdykset[i].lahtoaika + "‏‏‎⁺¹";
                            }

                        }

                        // rakennetaan yksittäinenlähtö
                    let  yksittainenlahto =  pysahdykset[i].realtime ?   "<b>" +pysahdykset[i].lahtoaika + "</b>•  <b>" + pysahdykset[i].shortname + "</b> " + pysahdykset[i].headsign : "<b>" + pysahdykset[i].lahtoaika + "</b>    <b>" + pysahdykset[i].shortname + "</b> " + pysahdykset[i].headsign;
                        for (var x = 0; x < pysakit.length; x++) {
                          //tarkistetaan että ei ole samaa jo
                            if (pysakit[x].koodi === pysahdykset[i].koodi && !pysakit[x].yksittaisetlahdot.includes(yksittainenlahto)) {
                                pysakit[x].yksittaisetlahdot.push(yksittainenlahto);
                                break;

                            }

                        }

                    }
                    // järjestetään pysäkit
                    pysakit = sorttaaObj(pysakit, "distance");
                    for (var i = 0; i < pysakit.length; i++) {
                      //lisätään lähdöt
                        lahdot += "\n\n<b>" + pysakit[i].nimi + "</b> - " + pysakit[i].koodi + " → " + pysakit[i].distance + "m" + "\n" + pysakit[i].yksittaisetlahdot.join("\n");
                    }

                    // Viestin lähetys
                    // Jos ei lähtöjä lähellä
                    if (lahdot == undefined) {
                        bot.sendMessage(chatId, `Ei lähtöjä lähistöllä`);
                        return console.info("'Ei lähtöjä' viesti lähetetty.");
                    } else { // Muuten lähettää lähdöt
                        bot.sendMessage(chatId, 'Lähdöt lähelläsi:' + lahdot, { parseMode: 'html'});
                        return console.info("Sijaintiviesti lähetetty!");
                    }
                }

            }).catch(err => {
                console.error("Ongelma pyynnössä");
                console.error(err);
                return bot.sendMessage(chatId, `Ongelma pyynnössä. Kokeile uudestaan!`);
            });
}

//funktioita
function sorttaaObj(list, sortBy) {
    console.log("sortBy " + sortBy);
    // sorttaa objektin annettun parametrin mukaan pienimmästä suurimpaan
    const returnattava = list.sort(({[sortBy]:a}, {[sortBy]:b}) => a - b);
    return returnattava;
    // returns array
}

function pushToArray(arr, obj) {
  //tarkistaa että lisätään vain uniikkeja
    const index = arr.findIndex((e) => e.koodi === obj.koodi);
    console.log("index", index);
    if (index === -1) {
        arr.push(obj);
    } else {
        arr[index] = obj;
    }
}

module.exports = sijainti;
