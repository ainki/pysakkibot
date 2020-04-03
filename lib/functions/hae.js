// hae.js

const bot = require('../../bot');
const {request} = require('graphql-request');
var jp = require('jsonpath');
var muuttujia = require('../flow/muutujia');
var lahtoListaus = require('./lahtoListaus');
const funktioita = require('../flow/funktioita');

//funktioita
const filter = funktioita.filter;
const numMaara = funktioita.numMaara;
const chunkArray = funktioita.chunkArray;
const capitalize = funktioita.capitalize;

// muuttujia
var digiAPI = muuttujia.digiAPI;
var tyhjavastaus = muuttujia.tyhjavastaus;
// numerocheck
var hasNumber = /\d/;

// Hae komento
function hae(chatId, viesti) {

    console.info("Kysytty pysäkkiä.");
    // Jos tkesti on pelkästään /hae, ohjelma kysyy pysäkin nimeä tai koodia erikseen
    if (viesti === '/hae') {


        return bot.sendMessage(chatId, 'Anna pysäkin nimi tai koodi 😄', {replyMarkup: 'hide', ask: 'pysakkinimi'}).then(re => {
        });
    } else {
        if (hasNumber.test(viesti) && numMaara(viesti) === 4) {
            console.info("Haetaan aikatauluja...1", viesti);
                        viesti = viesti.replace("/hae", "").trim();
            // Lähetetään actioni
            bot.sendAction(chatId, 'typing');
            // viesti = viesti.replace("/hae", "").trim();
            viesti = capitalize(viesti);
            // Funktioon siirtyminen
            return valintafunktio(chatId, viesti, 1);
        } else {
            // Muuten etsii suoraan. Heittää viestin hetkinen ja menee pysäkkihakufunktioon
            console.info("Etsitään pysäkkiä");
            bot.sendAction(chatId, 'typing');
            // Poistaa "/hae " tekstin
            // viesti = viesti.replace("/hae", "").trim();
            // Kutuu funktion
            pysakkihaku(chatId, viesti);
        }
    }
}
//Exporttaa tän indexiin
module.exports = hae;

// Pysäkkinimi kysymys
bot.on('ask.pysakkinimi', msg => {
    let text = msg.text.toLowerCase();



    //Komennot jotka ei tee pysökkihakua
    if (filter(text)) {


        viesti = capitalize(text);
        // jos numeroita 4
        if (numMaara(text) === 4) {
            console.info("Haetaan aikatauluja...1");
            // Lähetetään actioni
            bot.sendAction(msg.from.id, 'typing');
            // Funktioon siirtyminen
            return valintafunktio(msg.from.id, viesti, 1);
        } else if (!text) {
            return;
        } else {
            console.info("Etsitään pysäkkiä",text);
            //Lähetetään actioni
            bot.sendAction(msg.from.id, 'typing');
            //Funktioon siirtyminen
            pysakkihaku(msg.chat.id, viesti);
        }
    }
});

//Funktio pysäkkihaku
function pysakkihaku(chatId, viesti) {
    //graphQL hakulause
    const query = `{
    stops(name: "${viesti}") {
      gtfsId
      platformCode
      name
      code
    }
  }`;

    //Hakulauseen suoritus
    return request(digiAPI, query)
            .then(function (data) {
                //Data on vastaus GraphQL kyselystä
                let koodit = jp.query(data, '$..code');
                for (var i = 0; i < data.stops.length; i++) {
                    if (!data.stops[i].code) {
                      //jos pysäkistä puuttuu koodi, se poistetaan
                      data.stops.splice(i,1);
                      i--;

                    }
                }
                //Jos pysäkin nimellä ei löydy pysäkkiä
                if (!Object.keys(data.stops).length) {
                    // || data.stops[0].code === null
                    //Lähettää viestin ja kysymyksen
                    bot.sendMessage(chatId, `Pysäkkiä <i>${viesti.replace("/hae","").trim()}</i> ei valitettavasti löydy.\nKokeile uudestaan 😄`, {ask: 'pysakkinimi', parseMode: 'html'});
                    return console.info("Pysäkkiä ei löytynyt.");
                } else {
                    //Hakee pyäkit ja koodit niille
                    var pysakit = jp.query(data, '$..name');
                    let koodit = jp.query(data, '$..code');

                    // arrayt vaihtoehdoille
                    let nappainvaihtoehdot = [];
                    let viestivaihtoehdot = [];
                    //Erittelee pysäkit ja yhdistää koodit
                    for (let i = 0; i < pysakit.length; i++) {
                        //viestiin ja näppäimistöön tuleva komento
                        const komento = "/" + koodit[i];
                        var pk;
                        if (!data.stops[i].platformCode && koodit[i] !== null && koodit[i] !== undefined) {
                            //Yhdistää muuttujaan valinnat
                             pk = komento + " " + pysakit[i] + " - " + koodit[i];
                            // lisätään vaihtoehdot

                            if (nappainvaihtoehdot.indexOf(komento) === -1) {
                                viestivaihtoehdot.push(pk);
                                nappainvaihtoehdot.push(komento);
                            }

                        } else if (data.stops[i].platformCode && koodit[i] !== null && koodit[i] !== undefined) {
                             pk = komento + " " + pysakit[i] + " - " + koodit[i] + ' - Lait. ' + data.stops[i].platformCode;
                            // lisätään vaihtoehdot jos sitä ei ole jo vaihtoehdoissa
                            if (nappainvaihtoehdot.indexOf(komento) === -1) {
                                viestivaihtoehdot.push(pk);
                                nappainvaihtoehdot.push(komento);
                            } else {
                                if (data.stops[i].platformCode) {
                                    //lisätään laiturit
                                viestivaihtoehdot[nappainvaihtoehdot.indexOf(komento)] +=    viestivaihtoehdot[nappainvaihtoehdot.indexOf(komento)].includes("Lait.") ? ', ' + data.stops[i].platformCode : ' - Lait. ' + data.stops[i].platformCode;
                                }
                            }
                        }

                    }
                    const replaced = viesti.replace("/hae","").trim();
                    if (nappainvaihtoehdot.length === 1 && pysakit[0].toLowerCase() === replaced.toLowerCase()) {

                        console.log("haetaan suoraan");
                        return valintafunktio(chatId, replaced);
                    }
                    //Näppäimistö jaetaan kahteen riviin
                    var nappaimisto = chunkArray(nappainvaihtoehdot, 5);
                    //Rakennetaan näppaimistö
                    let replyMarkup = bot.keyboard(nappaimisto, {resize: true});

                    // Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
                    console.log("Valinnat lähetetty!");
                    return bot.sendMessage(chatId, `Etsit pysäkkiä <i>${replaced}</i>.\nValitse alla olevista vaihtoehdoista oikea pysäkki!\n\n${viestivaihtoehdot.join("\n")}\n\nVoit valita pysäkin myös näppäimistöstä! 😉`, {replyMarkup, ask: 'askhaevalinta', parseMode: 'html'});

                }
            })
//Jos errori koko höskässä konsoliin errorviesti.
            .catch(err => {
                console.error("Ongelma pyynnössä");
                console.error(err);
                return bot.sendMessage(chatId, `Ongelma pyynnössä 😕. Kokeile uudestaan!`);
            });
}


//Pysäkkivalinta kysymys
bot.on('ask.askhaevalinta', msg => {
    let valinta = msg.text.toLowerCase();

    //Komennot jotka ei tee pysökkihakua
    if (filter(valinta)) {
valinta = valinta.replace("/hae", "").trim();

        //Jos sisältää "/" ja numroita on 4 kutsutaan valintafunktiota
        if (valinta.includes("/") && numMaara(valinta) === 4) {
              console.log("Haetaan aikatauluja...");
              bot.sendAction(msg.from.id, 'typing');
               return valintafunktio(msg.from.id, valinta);
        } else if (valinta.includes("/") && numMaara(valinta) < 4) {
            bot.sendMessage(msg.from.id, `Virheellinen haku. Pysäkkikoodeissa on oltava 4 numeroa sekä mahdollinen etuliite`, {ask: 'askhaevalinta'});
        } else if (valinta.includes("/") && numMaara(valinta) > 4) {
            bot.sendMessage(msg.from.id, `Virheellinen haku. Pysäkkikoodeissa on oltava 4 numeroa sekä mahdollinen etuliite`, {ask: 'askhaevalinta'});
        } else {
            //Jos ei siällä "/" niin kysytään uudelleen
            bot.sendMessage(msg.from.id, ``, {ask: 'askhaevalinta'}).catch(error => console.error('Ei pysäkin koodia!', error));
            //Do nothing
        }
    }
});

//Valinta - /HAE -> /xxxx (pysäkin tunnus)
function valintafunktio(chatId, valinta, asetus) {
    //Jos pelkästään kauttaviiva

    if (valinta == '/') {
        return bot.sendMessage(chatId, `"/" ei ole pysäkki. Kokeile uudestaan!`, {ask: 'askhaevalinta'});
    }
    //Poistaa "/" merkin ja tyhjän välin
    // valinta = valinta.replace('/', '').replace(' ', '');
    if (!valinta.includes('/')) {

        //Query
        const queryGetStopTimesForStops = `{
    stops(name: "${capitalize(valinta)}") {
      platformCode
      name
      code
      zoneId
      desc
      stoptimesWithoutPatterns (numberOfDepartures: 10, omitCanceled: false) {
        serviceDay
        realtimeDeparture
        realtimeState
        pickupType
        dropoffType
        headsign
        trip {
          pattern {
            route {
              shortName
              alerts {
                alertSeverityLevel
              }
            }
          }
        }
      }
    }
  }`;


        //Hakulauseen suoritus
        return request(digiAPI, queryGetStopTimesForStops)
                .then(function (data) {
  const koodit = jp.query(data, '$..code');
                    // lahtoListuas hoitaa lähtöjen listauksen
                    var lahdotPysakeilta = lahtoListaus(data);

                    var nappaimisto;
                    var valintaArr = [];
                     if (numMaara(valinta) < 4) {
                       //suoran haun näppäimistö
                       valintaArr.push(valinta);
                        nappaimisto = chunkArray(["/" + koodit[0]], 1);
                       let replyMarkup = bot.keyboard(nappaimisto, { resize: true });
                       console.info('Lähdöt lähetetty2');
                       return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'askpysakkivalinta', parseMode: 'html'});
                     } else {
                       //Viestin lähetys ja näppäimistö /hae E4444 haulle

                       valintaArr.push(valinta);
                       nappaimisto = koodit[0] ? chunkArray(["/" + koodit[0]], 1) : chunkArray([]);
                       let replyMarkup = bot.keyboard(nappaimisto, { resize: true });
                       console.info('Lähdöt lähetetty3');
                       return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'askpysakkivalinta', parseMode: 'html' });
                     }

                })

                //Jos errori koko höskässä konsoliin errorviesti.
                .catch(err => {
                    console.error("Ongelma valinnassa");
                    console.error(err);
                    return bot.sendMessage(chatId, `Ongelma valinnassa 😕. Kokeile uudestaan!`, {ask: 'askhaevalinta'});
                });
    }
}
