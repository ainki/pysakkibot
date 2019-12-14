// sijainti.js

const bot = require('../../bot');
const {request} = require('graphql-request');
var jp = require('jsonpath');

const muuttujia = require('../flow/muutujia');
const funktioita = require('../flow/funktioita');

//funktioita
const chunkArray = funktioita.chunkArray;
const yonLahtoaika = funktioita.yonLahtoaika;

//muuttujia
var digiAPI = muuttujia.digiAPI;
var tyhjavastausLOC = muuttujia.tyhjavastausLOC;

function sijainti(chatId, sijainti) {
    let lahdot = "";


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
                        pysahdykset[i].lahtoaika = yonLahtoaika(pysahdykset[i].lahtoaika,pysahdykset[i].lahtopaiva);

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
                    let nappainvaihtoehdot = [];
                    pysakit = sorttaaObj(pysakit, "distance");
                    for (var i = 0; i < pysakit.length; i++) {
                        nappainvaihtoehdot.push("/"+pysakit[i].koodi);
                      //lisätään lähdöt
                        lahdot += "\n\n<b>" + pysakit[i].nimi + "</b> - " + pysakit[i].koodi + " → " + pysakit[i].distance + "m" + "\n" + pysakit[i].yksittaisetlahdot.join("\n");
                    }

                    let replyMarkup = bot.keyboard(chunkArray(nappainvaihtoehdot, 5), {ask: "sijaintivalinta", resize: true });
                    // Viestin lähetys
                    // Jos ei lähtöjä lähellä
                    if (lahdot == undefined) {
                        bot.sendMessage(chatId, `Ei lähtöjä lähistöllä`,{ replyMarkup});
                        return console.info("'Ei lähtöjä' viesti lähetetty.");
                    } else { // Muuten lähettää lähdöt

                        bot.sendMessage(chatId, 'Lähdöt lähelläsi:' + lahdot, {ask: "sijaintivalinta", replyMarkup, parseMode: 'html'});
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
    if (index === -1) {
        arr.push(obj);
    } else {
        arr[index] = obj;
    }
}

module.exports = sijainti;
