// pysakkiCheck.js

const bot = require('../../bot');
const muuttujia = require('../flow/muutujia');
var lahtoListaus = require('./lahtoListaus');
const {request} = require('graphql-request');
const funktioita = require('../flow/funktioita');

//funktioita
const filter = funktioita.filter;
const numMaara = funktioita.numMaara;
const chunkArray = funktioita.chunkArray;
const capitalize = funktioita.capitalize;
// muuttujia
var digiAPI = muuttujia.digiAPI;



function pysakkiCheck(msg, valinta, viimekomennot) {
    let maara = 10;
    //jaetaan valinta kahtia: 0 on haettun pysäkin koodi, 1 on lähtöjen määrä
let pyskoodi;
    if (msg.text) {
    let splitattu = msg.text.trim().split(",");
     pyskoodi = splitattu[0];
    if (splitattu[1]) {
        maara = splitattu[1];
    }
    }
    else {
      pyskoodi = valinta;
      console.log("valinta",valinta);
    }
    if (maara > 50) {
        return  bot.sendMessage(msg.from.id, `Virheellinen haku. Liian monta lähtöä`, {ask: 'ask/valinta'});

    }

    valinta = valinta.toLowerCase();
//tarkistetaan onko muu komento
    if (filter(valinta, "pysakkiCheck")) {
//jos ei ole

        if (valinta.includes('/') && numMaara(pyskoodi) === 4 && !pyskoodi.trim().includes(" ")) {
          pyskoodi = capitalize(pyskoodi.replace('/', ''));
          //lisätään H jos ei etuliitettä
          if (!isNaN(pyskoodi)) pyskoodi = "H" + pyskoodi;

            console.info("Haetaan aikatauluja...");
            // Lähetetään actioni
            bot.sendAction(msg.from.id, 'typing');
            // Funktion kutsuminen
            return valintafunktio(msg.from.id, pyskoodi, viimekomennot, maara);
        }     //Jos sisältää "/" ja numroita on 4 kutsutaan valintafunktiota

        if (valinta.includes("/") && numMaara(pyskoodi) === 0) {
            return bot.sendMessage(msg.from.id, 'Virheellinen komento. Komennolla /help saat listan komennoista ', {ask: 'ask/valinta'});
        } else if (valinta.includes("/") && numMaara(valinta) < 4) {

            return  bot.sendMessage(msg.from.id, `Virheellinen haku. Pysäkkikoodeissa on oltava 4 numeroa sekä mahdollinen kuntaetuliite`, {ask: 'ask/valinta'});
        } else if (valinta.includes("/") && numMaara(pyskoodi) > 4) {
            return  bot.sendMessage(msg.from.id, `Virheellinen haku. Pysäkkikoodeissa on oltava 4 numeroa sekä mahdollinen kuntaetuliite`, {ask: 'ask/valinta'});

        }
        // else if ( viimekomennot !== "/liitynta") {
        //   //Jos ei siällä "/" niin kysytään uudelleen
        //    bot.sendMessage(msg.from.id, ``, { ask: 'ask/valinta' }).catch(error => console.error('ps Ei pysäkin koodia!', error));
        //
        // }
    }
}
module.exports = pysakkiCheck;

function valintafunktio(chatId, valinta, viimekomennot, maara) {
    const queryGetStopTimesForStops = `{
    stops(name: "${valinta}") {
      platformCode
      name
      code
      zoneId
      desc
      stoptimesWithoutPatterns (numberOfDepartures: ${maara}, omitCanceled: false) {
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
                // lahtoListuas hoitaa lähtöjen listauksen

                var lahdotPysakeilta = lahtoListaus(data, false);
                let replyMarkup = bot.keyboard(chunkArray([]), {resize: true});
                let jatka = false;
if (viimekomennot) {
  for (var i = 0; i < viimekomennot.length; i++) {

      if (viimekomennot[i].id !== chatId && viimekomennot[i] !== "/hae") {
          jatka = true;
      }
  }
}

                if (jatka) {
                    var valintaArr = [];
                    valintaArr.push(valinta);
                    let replyMarkup = bot.keyboard(chunkArray(valintaArr, 1), {resize: true});
                    console.info('Lähdöt lähetetty');
                    return bot.sendMessage(chatId, lahdotPysakeilta, {replyMarkup, ask: 'ask/valinta', parseMode: 'html'});
                } else if (lahdotPysakeilta !== "") {

                    //Viestin lähetys
                    console.info('Lähdöt lähetetty');
                    return bot.sendMessage(chatId, lahdotPysakeilta, {ask: 'ask/valinta', parseMode: 'html'});
                }
            }).catch(err => {
        console.error("Ongelma pyynnössä");
        console.error(err);
        return bot.sendMessage(chatId, `Ongelma pyynnössä. Kokeile uudestaan!`);
    });
}
