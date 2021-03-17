// sijainti.js

const bot = require('../../bot');
const {request} = require('graphql-request');
var jp = require('jsonpath');

const muuttujia = require('../flow/muutujia');
const funktioita = require('../flow/funktioita');
const reitti = require('./reitti');
const pysakkiCheck = require('./pysakkiCheck');
const hae = require('./hae');

//funktioita
const chunkArray = funktioita.chunkArray;
const yonLahtoaika = funktioita.yonLahtoaika;
const numMaara = funktioita.numMaara;

//muuttujia
var digiAPI = muuttujia.digiAPI;
var tyhjavastausLOC = muuttujia.tyhjavastausLOC;

function sijainti(msg) {
    let lahdot = "";

    // erittelee lat ja lon
    var lat = jp.query(msg.location, '$..latitude');
    var lon = jp.query(msg.location, '$..longitude');
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
                  const replyMarkup = bot.inlineKeyboard([
                      [bot.inlineButton('aseta reitin lähtöpaikaksi', {callback: "L," + lat + "," + lon}), bot.inlineButton('aseta reitin määränpääksi', {callback: "M," + lat + "," + lon})],
                      [bot.inlineButton('/hae', {callback: "H"}), bot.inlineButton('/reitti', {callback: "R"})]
                  ]);
                    bot.sendMessage(msg.chat.id, `Läheltäsi ei valitettavastai löydy pysäkkejä.`,{replyMarkup});
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
                        let lahtopaiva = jp.query(stoptimes[i], '$..serviceDay')[0];
                        // Hakee linjan numeron tai kirjaimen
                        var shortname = jp.query(nodehaku[i], '$..shortName');
                        // Hakee Määränpään
                        var headsign = jp.query(stoptimes[i], '$..headsign');
                        // Hakee pysäkin koodin
                        var koodi = jp.query(stoptimes[i], '$..code')[0] ? jp.query(stoptimes[i], '$..code')[0] : "";
                        // Hakee pysäkin nimen
                        var pysakkinimi = jp.query(stoptimes[i], '$..name')[0];
                        // realtime
                        var realtime = jp.query(stoptimes[i], '$..realtime')[0];
                        //lahtoaika
                        var lahtoaika = jp.query(stoptimes[i], '$..realtimeDeparture')[0];

                        //jos oikeesti olemassa oleva lähtö
                        if (lahtoaika !== undefined && lahtopaiva !== undefined) {
                            //lisään objektiarrayhin pysakit
                            pushToArray(pysakit, {koodi: koodi, nimi: pysakkinimi, distance: distance[i], yksittaisetlahdot: []});
                            //lähdot
                            pysahdykset.push({koodi: koodi, pysakkinimi: pysakkinimi, lahtoaika: lahtoaika, distance: distance[i], realtime: realtime, lahtopaiva: lahtopaiva, shortname: shortname, headsign: headsign});
                        }

                    }
                    // järjestetään pysähdykset lähtöajan mukaan.
                    pysahdykset = sorttaaObj(pysahdykset, "lahtoaika");

                    // pysahdykset = sorttaaObj(pysahdykset);
                    for (let i = 0; i < pysahdykset.length; i++) {
                        //Hakee dataa requestista
                        pysahdykset[i].lahtoaika = yonLahtoaika(pysahdykset[i].lahtoaika, pysahdykset[i].lahtopaiva);

                        // rakennetaan yksittäinenlähtö
                        let  yksittainenlahto = pysahdykset[i].realtime ? "<b>" + pysahdykset[i].lahtoaika + "</b>•  <b>" + pysahdykset[i].shortname + "</b> " + pysahdykset[i].headsign : "<b>" + pysahdykset[i].lahtoaika + "</b>    <b>" + pysahdykset[i].shortname + "</b> " + pysahdykset[i].headsign;
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
                    lahdot = pysakit.map((x)=>{
                      if (numMaara(x.koodi) > 3) {
                          nappainvaihtoehdot.push(bot.inlineButton(x.koodi, {callback: "K,/" + x.koodi}));
                      }
                      //lisätään lähdöt
                      return "\n\n<b>" + x.nimi + "</b> - " + x.koodi + " → " + x.distance + "m" + "\n" + x.yksittaisetlahdot.join("\n");
                    });

                    const replyMarkup = bot.inlineKeyboard([
                        [ bot.inlineButton('aseta reitin lähtöpaikaksi', {callback: "L," + lat + "," + lon}), bot.inlineButton('aseta reitin määränpääksi', {callback: "M," + lat + "," + lon})],
                        nappainvaihtoehdot, [bot.inlineButton('/hae', {callback: "H"}), bot.inlineButton('/reitti', {callback: "R"})]]);
                      // Viestin lähetys
                      // Jos ei lähtöjä lähellä
                    if (lahdot == undefined) {
                        bot.sendMessage(msg.chat.id, `Ei lähtöjä lähistöllä`, {replyMarkup});
                        return console.info("'Ei lähtöjä' viesti lähetetty.");
                    } else { // Muuten lähettää lähdöt

                        bot.sendMessage(msg.chat.id, 'Lähdöt lähelläsi: ' + lahdot, {replyMarkup, parseMode: 'html'});
                        return console.info("Sijaintiviesti lähetetty!");
                    }
                }

            }).catch(err => {
        console.error("Ongelma pyynnössä");
        console.error(err);
        return bot.sendMessage(msg.chat.id, `Ongelma pyynnössä. Kokeile uudestaan!`);
    });
}

//vastaus inlinenappiin
bot.on('callbackQuery', msg => {

    const split = msg.data.split(",");
    switch (split[0]) {
        case "K":
        //koodi inlinest
            bot.answerCallbackQuery(msg.id);
            pysakkiCheck(msg, split[1]);
            break;
          case "L":
        //lähtöpaikka
            bot.answerCallbackQuery(msg.id);
            reitti(msg, split[1], split[2], split[0]);
            break;
          case "M":
          //määränpää
            bot.answerCallbackQuery(msg.id);
              reitti(msg, split[1], split[2], split[0]);
            break;
          case "H":
          //hae
            msg["text"] = "/hae";
            hae(msg);
            bot.answerCallbackQuery(msg.id);
            break;
          case "R":
          //tyhjä reitti
            msg["text"] = "/reitti";
            reitti(msg);
            bot.answerCallbackQuery(msg.id);

            break;

    }


});
//funktioita
function sorttaaObj(list, sortBy) {

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
