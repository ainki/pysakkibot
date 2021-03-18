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
                if (vastaus === tyhjavastausLOC) {
                  const replyMarkup = bot.inlineKeyboard([
                      [bot.inlineButton('aseta reitin lähtöpaikaksi', {callback: "L," + lat + "," + lon}), bot.inlineButton('aseta reitin määränpääksi', {callback: "M," + lat + "," + lon})],
                      [bot.inlineButton('/hae', {callback: "H"}), bot.inlineButton('/reitti', {callback: "R"})]
                  ]);
                    bot.sendMessage(msg.chat.id, `Läheltäsi ei valitettavastai löydy pysäkkejä.`,{replyMarkup});
                    return console.info("Ei pysäkkejä lähellä.");
                } else {
                    // Datan haku queryn vastauksesta
                    const nodehaku = jp.query(data, '$..node');
                      let pysakit = [];
                      let pysahdykset = [];

                    // Erotellaan lähdöt toisitaan
                  pysakit = nodehaku.reduce((a,e) => {
                    // a on viimeks returnattu arvo, johon kertyy pushin kaut arvoi; e on tänhetkinen arvo iteroinnis
                        const stoptimes = e.place.stoptimes[0];
                        if (stoptimes) {
                          //jos on pysähdyksiä
                          const distance = e.distance;
                          const stop = stoptimes.stop;
                          const lahtopaiva = stoptimes.serviceDay;
                        // Linjan numero tai kirjain
                         const shortname = stoptimes.trip.pattern.route.shortName;
                        const koodi = stop.code;
                        const pysakkinimi = stop.name;
                        const lahtoaika = stoptimes.realtimeDeparture;

                      pysahdykset.push({koodi: koodi, pysakkinimi: pysakkinimi, lahtoaika: stoptimes.realtimeDeparture, distance: distance, realtime: stoptimes.realtime, lahtopaiva: stoptimes.serviceDay, shortname: shortname, headsign: stoptimes.headsign});
                      //jos ei oo lisätty jo a:han, jotta lisättäis vaan uniikkei
                            if (!a.some( x => x.koodi === koodi)) a.push({koodi: koodi, nimi: pysakkinimi, distance: distance, yksittaisetlahdot: []});

                        }
                        return a; //returnaa aina muuten ei toimi!
                  },[]); // [] kosk käsitellää arrayt

                  let nappainvaihtoehdot = [];
                  const replyMarkup = bot.inlineKeyboard([
                      [ bot.inlineButton('aseta reitin lähtöpaikaksi', {callback: "L," + lat + "," + lon}), bot.inlineButton('aseta reitin määränpääksi', {callback: "M," + lat + "," + lon})],
                      nappainvaihtoehdot, [bot.inlineButton('/hae', {callback: "H"}), bot.inlineButton('/reitti', {callback: "R"})]]);
                      //jos ei lähtöjä
                  if (!pysahdykset.length) {
                    bot.sendMessage(msg.chat.id, `Ei lähtöjä lähistöllä`, {replyMarkup});
                    return console.info("'Ei lähtöjä' viesti lähetetty.");
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
                    pysakit = sorttaaObj(pysakit, "distance");
                    lahdot = pysakit.map((x)=>{
                      if (numMaara(x.koodi) > 3) {
                          nappainvaihtoehdot.push(bot.inlineButton(x.koodi, {callback: "K,/" + x.koodi}));
                      }
                      //lisätään lähdöt
                      return "\n\n<b>" + x.nimi + "</b> - " + x.koodi + " → " + x.distance + "m" + "\n" + x.yksittaisetlahdot.join("\n");
                    });


                      // Viestin lähetyss
                      bot.sendMessage(msg.chat.id, 'Lähdöt lähelläsi: ' + lahdot, {replyMarkup, parseMode: 'html'});
                      return console.info("Sijaintiviesti lähetetty!");
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
            msg.text = "/hae";
            hae(msg);
            bot.answerCallbackQuery(msg.id);
            break;
          case "R":
          //tyhjä reitti
            msg.text = "/reitti";
            reitti(msg);
            bot.answerCallbackQuery(msg.id);
              break;
          default:
          //jos ei mikään ylläolevista
            console.error("Tuntematon nappi!");
            bot.sendMessage(msg.chat.id, `Tapahtui virhe, Kokeile uudestaan!`);
    }


});
//funktioita
const sorttaaObj = ((list, sortBy) => list.sort(({[sortBy]:a}, {[sortBy]:b}) => a - b));

module.exports = sijainti;
