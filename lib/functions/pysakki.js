// pysakki.js

const bot = require('../../bot');
const { request } = require('graphql-request');
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss');
var limit = require('limit-string-length');
var muuttujia = require('../flow/muutujia');
var lahtoListaus = require('./lahtoListaus');
const funktioita = require('../flow/funktioita');
"use strict";

var nappaimisto;
let replyMarkup = bot.keyboard(nappaimisto, { resize: true });

//funktioita
const chunkArray = funktioita.chunkArray;
const filter = funktioita.filter;
const numMaara = funktioita.numMaara;
const capitalize = funktioita.capitalize;
// muuttujia
var digiAPI = muuttujia.digiAPI;
var tyhjavastaus = muuttujia.tyhjavastaus;
var nappaimistonpohja =  [bot.button('/hae'), bot.button('/pysakki'), bot.button('/linja'), bot.button('location', 'Sijaintisi mukaan 📍')];
// numerocheck
var hasNumber = /\d/;
let koodit = [];

// Hae komento
function hae(chatId, viesti) {

  console.info("Kysytty pysäkkiä.");
  // Jos tkesti on pelkästään /pys, ohjelma kysyy pysäkin nimeä tai koodia erikseen
  if (viesti.trim() === '/pys') {
    return bot.sendMessage(chatId, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysnimi' }).then(re => { });
  } else if(viesti.trim() === '/pysakki') {
    return bot.sendMessage(chatId, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysnimi' }).then(re => { });
  }else{


    if (hasNumber.test(viesti) == true && numMaara(viesti) === 4) {
      console.info("Haetaan aikatauluja...");
      // Lähetetään actioni
      bot.sendAction(chatId, 'typing');

      viesti = capitalize(viesti);
      // Funktioon siirtyminen
      return valintafunktio(chatId, viesti);
    } else {
      // Muuten etsii suoraan. Heittää viestin hetkinen ja menee pysäkkihaku funktioon
      console.info("Etsitään pysäkkiä");
      bot.sendAction(chatId, 'typing');
      // Kutuu funktion
      pysakkihaku(chatId, viesti);
    }
  }
}
//Exporttaa tän indexiin
module.exports = hae;

// Pysäkkinimi kysymys
bot.on('ask.pysnimi', msg => {
let viesti;
  if (msg.text) {
    viesti = msg.text.toLowerCase();
  }


  // Komennot jotka ei tee pysökkihakua
  if (filter(viesti, "pysakki")) {
    viesti = viesti.replace("/pysakki", "").replace("/pys", "").trim();
    // jos numeroita 4
    if (numMaara(viesti) === 4) {
      viesti = capitalize(viesti);
      console.info("Haetaan aikatauluja...");
      // Lähetetään actioni
      bot.sendAction(msg.from.id, 'typing');
      // Funktioon siirtyminen
      return valintafunktio(msg.from.id, viesti);
    }else {
      console.info("Etsitään pysäkkiä");
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
      zoneId
      platformCode
      name
      code
    }
  }`;

  //Hakulauseen suoritus
  return request(digiAPI, query)
  .then(function (data) {
    //Data on vastaus GraphQL kyselystä
   koodit = jp.query(data, '$..code');
    let puuttuvat = [];
    for (var i = 0; i < data.stops.length; i++) {
        if (!data.stops[i].code) {
          //jos pysäkistä puuttuu koodi, se poistetaan
          data.stops.splice(i,1);
          i--;

        }
    }
  //Jos pysäkin nimellä ei löydy pysäkkiä
  if (!Object.keys(data.stops).length || puuttuvat.length === koodit.length) {
      //Lähettää viestin ja kysymyksen
      bot.sendMessage(chatId, `Pysäkkiä "${viesti.replace("/pysakki", "").replace("/pys", "").trim()}" ei valitettavasti löydy.\nKokeile uudestaan 😄`, { ask: 'pysnimi' });
      return console.info("Pysäkkiä ei löytynyt.");
    } else {
      //Hakee pyäkit ja koodit niille
      var pysakit = jp.query(data, '$..name');
      var laiturit = jp.query(data, '$..platformCode');

      //Erittelee pysäkit ja yhdistää koodit
      var nappainvaihtoehdot = [];
      let viestivaihtoehdot = [];
      for (let i = 0; i < pysakit.length; i++) {
        //viestiin ja näppäimistöön tuleva komento
        const komento = "/pys " + koodit[i];
        var  pysakkikoodi;
        if (!data.stops[i].platformCode && koodit[i] !== null && koodit[i] !== undefined) {
          //Yhdistää muuttujaan valinnat
          pysakkikoodi = pysakit[i] + " - " + koodit[i];
          // lisätään vaihtoehdot

          if (nappainvaihtoehdot.indexOf(komento) === -1) {
            viestivaihtoehdot.push(pysakkikoodi);
            nappainvaihtoehdot.push(komento);
          }

        } else if(data.stops[i].platformCode && koodit[i] !== null && koodit[i] !== undefined) {
          pysakkikoodi = pysakit[i] + " - " + koodit[i] + ' - Lait. ' + data.stops[i].platformCode;
          // lisätään vaihtoehdot jos sitä ei ole jo vaihtoehdoissa
          if (nappainvaihtoehdot.indexOf(komento) === -1) {
            viestivaihtoehdot.push(pysakkikoodi);
            nappainvaihtoehdot.push(komento);
          }else {
            if (data.stops[i].platformCode) {
              //lisätään laiturit
            viestivaihtoehdot[nappainvaihtoehdot.indexOf(komento)] +=  viestivaihtoehdot[nappainvaihtoehdot.indexOf(komento)].includes("Lait.") ?   ', ' + data.stops[i].platformCode : ' - Lait. ' + data.stops[i].platformCode;

            }
          }
        }

      }
const replaced = viesti.replace("/pysakki", "").replace("/pys", "").trim();
      if (nappainvaihtoehdot.length === 1 && pysakit[0].toLowerCase() === replaced.toLowerCase()) {
        console.log("haetaan suoraan");
        return valintafunktio(chatId,replaced);
      }



      //Rakennetaan nappaimisto
      replyMarkup = bot.keyboard(chunkArray(nappainvaihtoehdot, 5), { resize: true });

      // Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
      console.info("Valinnat lähetetty!");
      return bot.sendMessage(chatId, `Etsit pysäkkiä "${replaced}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${viestivaihtoehdot.join("\n")}\n\nValitse pysäkki näppämistöstä`, { replyMarkup, ask: 'askpysakkivalinta' });
    }
  }
)
//Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
.catch(err => {
  console.error(" GraphQL error");
  console.error(err);
  return bot.sendMessage(chatId, `Ongelma pyynnössä. Kokeile uudestaan!`);
});
}

//Pysäkkivalinta kysymys
bot.on('ask.askpysakkivalinta', msg => {
  const valinta = msg.text.toLowerCase();

  //Komennot jotka ei tee pysökkihakua
  if (!filter(valinta,"pysakki")) {
    //   //Keskeytetään kysymys
  }


});

//Valinta - /pys -> /xxxx (pysäkin tunnus)
function valintafunktio(chatId, valinta) {

  //Jos pelkästään kauttaviiva
  if (valinta == '/') {
    return bot.sendMessage(chatId, `"/" ei ole pysäkki. Kokeile uudestaan!`, { ask: 'askpysakkivalinta' });
  }
  let valintavastaus = valinta.replace("/pysakki", "").replace("/pys", "").trim();

 const queryGetStopTimesForStops = `{
   stops(name: "${capitalize(valintavastaus)}") {
     platformCode
     name
     
     lat
     lon
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
       var valintaArr = [];
   // lahtoListuas hoitaa lähtöjen listauksen
   var lahdotPysakeilta = lahtoListaus(data,false);
   if (!koodit.includes(valintavastaus) && numMaara(valintavastaus) === 4) {

      valintaArr.push(valinta);
       replyMarkup = bot.keyboard(chunkArray(valintaArr, 1), { resize: true });
koodit = [];
      console.info('Lähdöt lähetetty1');
      if (data.stops[0]) {
lahetaPysakinSijainti(chatId, data.stops[0].lat, data.stops[0].lon);
      }
      return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'askpysakkivalinta', parseMode: 'html' });

    }else if (numMaara(valintavastaus) < 4) {
      //suoran haun näppäimistö

      valintaArr.push(valinta);
     nappaimisto = chunkArray(["/pys " + koodit[0]], 1);
      let replyMarkup = bot.keyboard(nappaimisto, { resize: true });
koodit = [];
      console.info('Lähdöt lähetetty2');
      if (data.stops[0]) {
lahetaPysakinSijainti(chatId, data.stops[0].lat, data.stops[0].lon);
      }
      return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'askpysakkivalinta', parseMode: 'html' });
    } else {
      //Viestin lähetys

      console.info('Lähdöt lähetetty3');
      lahetaPysakinSijainti(chatId, data.stops[0].lat, data.stops[0].lon);
      return bot.sendMessage(chatId, lahdotPysakeilta, { ask: 'askpysakkivalinta', parseMode: 'html' });
    }

  })

  //Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
  .catch(err => {
    console.error("GraphQL error");
    console.error(err);
    return bot.sendMessage(chatId, `Ongelma valinnassa. Kokeile uudestaan!`, { ask: 'askpysakkivalinta' });
  });
}


function lahetaPysakinSijainti(chatId, stationLat, stationLon) {
  // Kasaa ja lähettää aseman sijainnin 250ms aseman tietojen jälkeen
  setTimeout(function () {
    return bot.sendLocation(chatId, [parseFloat(stationLat), parseFloat(stationLon)], { replyMarkup });
  }, 250);
}
