// pysakkiCheck.js
const bot = require('../../bot');
const muuttujia = require('../flow/muutujia');
var lahtoListaus = require('./lahtoListaus');
const { request } = require('graphql-request');
const funktioita = require('../flow/funktioita');

//funktioita
const filter = funktioita.filter;
const numMaara = funktioita.numMaara;
const chunkArray = funktioita.chunkArray;
// muuttujia
var digiAPI = muuttujia.digiAPI;



function pysakkiCheck(chatId, valinta, viimekomento) {
valinta = valinta.toLowerCase();
//tarkistetaan onko muu komento
if (filter(valinta,"pysakkiCheck")) {
//jos ei ole
        if (valinta.includes('/') && numMaara(valinta) === 4  && !valinta.trim().includes(" ")) {
            valinta = capitalizeCommand(valinta);
            console.info("Haetaan aikatauluja...");
            // Lähetetään actioni
            bot.sendAction(chatId, 'typing');
            // Funktion kutsuminen
            return valintafunktio(chatId, valinta, viimekomento);
        }     //Jos sisältää "/" ja numroita on 4 kutsutaan valintafunktiota

       if (valinta.includes("/") && numMaara(valinta) === 0 ) {
            return bot.sendMessage( chatId,'Virheellinen komento. Komennolla /help saat listan komennoista ', { ask: 'ask/valinta' });
            } else if (valinta.includes("/") && numMaara(valinta) < 4) {

            return  bot.sendMessage( chatId,`Virheellinen haku. Pysäkkikoodeissa on oltava 4 numeroa sekä mahdollinen etuliite`, { ask: 'ask/valinta' });
          } else if (valinta.includes("/") && numMaara(valinta) > 4) {
            return  bot.sendMessage(chatId,`Virheellinen haku. Pysäkkikoodeissa on oltava 4 numeroa sekä mahdollinen etuliite`, { ask: 'ask/valinta' });

            }
            // else if ( viimekomento !== "/liitynta") {
            //   //Jos ei siällä "/" niin kysytään uudelleen
            //    bot.sendMessage(chatId, ``, { ask: 'ask/valinta' }).catch(error => console.error('ps Ei pysäkin koodia!', error));
            //
            // }
        }
}
module.exports = pysakkiCheck;

function valintafunktio(chatId, valinta,viimekomento) {
console.log(chatId,valinta);
    const queryGetStopTimesForStops = `{
    stops(name: "${valinta.replace('/', '')}") {
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
                alertDescriptionText
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
            var lahdotPysakeilta = lahtoListaus(data,false);
                let replyMarkup = bot.keyboard(chunkArray([]), { resize: true });
              if (viimekomento !== "/hae") {
                var valintaArr = [];
                valintaArr.push(valinta);
                let replyMarkup = bot.keyboard(chunkArray(valintaArr, 1), { resize: true });
                console.info('Lähdöt lähetetty');
                return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'ask/valinta', parseMode: 'html'});
            } else if (lahdotPysakeilta !== "") {

                //Viestin lähetys
                console.info('Lähdöt lähetetty');
                return bot.sendMessage(chatId, lahdotPysakeilta, { ask: 'ask/valinta', parseMode: 'html'});
            }
        });
}



const capitalizeCommand = (str) => {
  if (typeof str !== 'string') return '';
    if (!str.match('[a-zA-Z]')){
return str;
}else {
return str[0] + str.match('[a-zA-Z]')[0].toUpperCase() + str.slice(2);
}
};
