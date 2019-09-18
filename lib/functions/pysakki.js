// pysakki.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
var muuttujia = require('../flow/muutujia');
var lahtoListaus = require('./lahtoListaus');
var nappaimisto;
const replyMarkup = bot.keyboard(nappaimisto, { resize: true })
// muuttujia
var digiAPI = muuttujia.digiAPI;
var tyhjavastaus = muuttujia.tyhjavastaus;
var nappaimistonpohja =  [bot.button('/hae'), bot.button('/pysakki'), bot.button('/linja'), bot.button('location', 'Sijaintisi mukaan 📍')];
// numerocheck
var hasNumber = /\d/;
let koodit = [];

// Hae komento
function hae(chatId, viesti) {

  console.info("Kysytty pysäkkiä.")
  // Jos tkesti on pelkästään /pys, ohjelma kysyy pysäkin nimeä tai koodia erikseen
  if (viesti === '/pys') {
    return bot.sendMessage(chatId, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysnimi' }).then(re => { })
  } else if(viesti === '/pysakki') {
    return bot.sendMessage(chatId, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysnimi' }).then(re => { })
  }else{
    viesti = viesti.trim();
    if (hasNumber.test(viesti) == true && numMaara(viesti) === 4) {
      console.info("Haetaan aikatauluja...")
      // Lähetetään actioni
      bot.sendAction(chatId, 'typing')

      viesti = capitalize(viesti);
      // Funktioon siirtyminen
      return valintafunktio(chatId, viesti, 1);
    } else {
      // Muuten etsii suoraan. Heittää viestin hetkinen ja menee pysäkkihaku funktioon
      console.info("Etsitään pysäkkiä")
      bot.sendAction(chatId, 'typing')
      // Poistaa "/pys " tekstin

      console.log(viesti)
      // Kutuu funktion
      pysakkihaku(chatId, viesti);
    }
  }
}
//Exporttaa tän indexiin
module.exports = hae;

// Pysäkkinimi kysymys
bot.on('ask.pysnimi', msg => {
  let text = msg.text.toLowerCase();;

  // Komennot jotka ei tee pysökkihakua
  if (text == "/start" || text == undefined || text.includes("/hae") || text == "/help" || text.includes("/linja") || text == "/menu" || text == "/about" || text == "/poikkeukset"|| text.includes("/pys") || text.includes("/pysakki") || text.includes("/liitynta")) {
    // Keskeytetään kysymys jos sisältää toisen komennon
  } else {
    // jos numeroita 4
    if (numMaara(text) === 4) {
      text = capitalize(text);
      console.info("Haetaan aikatauluja...")
      // Lähetetään actioni
      bot.sendAction(msg.from.id, 'typing')
      // Funktioon siirtyminen
      return valintafunktio(msg.from.id, text, 1);
    }else {
      console.info("Etsitään pysäkkiä")
      //Lähetetään actioni
      bot.sendAction(msg.from.id, 'typing')
      //Funktioon siirtyminen
      pysakkihaku(msg.chat.id, text);
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
  }`

  //Hakulauseen suoritus
  return request(digiAPI, query)
  .then(function (data) {
    //Data on vastaus GraphQL kyselystä
   koodit = jp.query(data, '$..code')
    let puuttuvat = [];
    for (var i = 0; i < koodit.length; i++) {
      if (koodit[i] === null) {

        puuttuvat.push(koodit[i])
      }
    }
  //Jos pysäkin nimellä ei löydy pysäkkiä
  if (!Object.keys(data.stops).length || puuttuvat.length === koodit.length) {
      //Lähettää viestin ja kysymyksen
      bot.sendMessage(chatId, `Pysäkkiä "${viesti}" ei valitettavasti löydy.\nKokeile uudestaan 😄`, { ask: 'pysnimi' });
      return console.info("Pysäkkiä ei löytynyt.")
    } else {
      //Hakee pyäkit ja koodit niille
      var pysakit = jp.query(data, '$..name')
      var laiturit = jp.query(data, '$..platformCode')

      //Erittelee pysäkit ja yhdistää koodit
      var nappainvaihtoehdot = []
      let viestivaihtoehdot = [];
      for (let i = 0; i < pysakit.length+1; i++) {
        //viestiin ja näppäimistöön tuleva komento
        const komento = "/pys " + koodit[i];
        if (laiturit[i] === null && koodit[i] !== null && koodit[i] !== undefined) {
          //Yhdistää muuttujaan valinnat
          var pk = pysakit[i] + " - " + koodit[i];
          // lisätään vaihtoehdot

          if (nappainvaihtoehdot.indexOf(komento) === -1) {
            viestivaihtoehdot.push(pk);
            nappainvaihtoehdot.push(komento)
          }

        } else if(laiturit[i] !== null && koodit[i] !== null && koodit[i] !== undefined) {
          var pk =pysakit[i] + " - " + koodit[i] + ' - Lait. ' + laiturit[i];
          // lisätään vaihtoehdot jos sitä ei ole jo vaihtoehdoissa
          if (nappainvaihtoehdot.indexOf(komento) === -1) {
            viestivaihtoehdot.push(pk);
            nappainvaihtoehdot.push(komento)
          }else {
            if (laiturit[i]) {
              //lisätään laiturit
              viestivaihtoehdot[nappainvaihtoehdot.indexOf(komento)].includes("Lait.") ? viestivaihtoehdot[nappainvaihtoehdot.indexOf(komento)] +=  ', ' + laiturit[i] : viestivaihtoehdot[nappainvaihtoehdot.indexOf(komento)] +=' - Lait. ' + laiturit[i];

            }
          }
        }

      }

      if (nappainvaihtoehdot.length === 1 && pysakit[0].toLowerCase() === viesti.toLowerCase()) {
        console.log("haetaan suoraan");
        return valintafunktio(chatId,viesti,2);
      }
      //Näppäimistö jaetaan kahteen riviin
      nappaimisto = chunkArray(nappainvaihtoehdot, 5);
      //Rakennetaan nappaimisto
      let replyMarkup = bot.keyboard(nappaimisto, { resize: true });

      // Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
      console.info("Valinnat lähetetty!")
      return bot.sendMessage(chatId, `Etsit pysäkkiä "${viesti}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${viestivaihtoehdot.join("\n")}\n\nValitse pysäkki näppämistöstä`, { replyMarkup, ask: 'askpysakkivalinta' })
      var pysakkivalinta = undefined;
      var nappaimisto = undefined;
    }
  }
)
//Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
.catch(err => {
  console.error(" GraphQL error")
  console.error(err)
  return bot.sendMessage(chatId, `Ongelma pyynnössä. Kokeile uudestaan!`)
})
};

//Pysäkkivalinta kysymys
bot.on('ask.askpysakkivalinta', msg => {
  const valinta = msg.text.toLowerCase();;

  //Komennot jotka ei tee pysökkihakua
  if (valinta == "/start" || valinta == undefined || valinta.includes("/hae") || valinta == "/help" || valinta.includes("/linja") || valinta == "/menu" || valinta == "/about" || valinta == "/poikkeukset") {
    //   //Keskeytetään kysymys
  }


});

//Valinta - /pys -> /xxxx (pysäkin tunnus)
function valintafunktio(chatId, valinta, asetus) {

  //Jos pelkästään kauttaviiva
  if (valinta == '/') {
    return bot.sendMessage(chatId, `"/" ei ole pysäkki. Kokeile uudestaan!`, { ask: 'askpysakkivalinta' });
  }
  //Poistaa "/" merkin ja tyhjän välin
   let valintavastaus = "";
        valinta.includes("/pysakki") ?    valintavastaus = valinta.replace("/pysakki", "").trim() :  valintavastaus = valinta.replace("/pys", "").trim();
  //Query
  const queryGetStopTimesForStops = `{
    stops(name: "${valintavastaus}") {
      platformCode
      name
      zoneId
      lat
      lon
      code
      stoptimesWithoutPatterns (numberOfDepartures: 10, omitCanceled: false) {
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
  }`


  //Hakulauseen suoritus
  return request(digiAPI, queryGetStopTimesForStops)
  .then(function (data) {
    // lahtoListuas hoitaa lähtöjen listauksen
    var lahdotPysakeilta = lahtoListaus(data);
    if (!koodit.includes(valintavastaus)) {
      var valintaArr = []
      valintaArr.push(valinta)
      var nappaimisto = chunkArray(valintaArr, 1);
      let replyMarkup = bot.keyboard(nappaimisto, { resize: true });
koodit = [];
      console.info('Lähdöt lähetetty1')
      if (data.stops[0]) {
lahetaPysakinSijainti(chatId, data.stops[0].lat, data.stops[0].lon)
      }
      return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'askpysakkivalinta' });

    } else {
      //Viestin lähetys
      console.info('Lähdöt lähetetty2')
      lahetaPysakinSijainti(chatId, data.stops[0].lat, data.stops[0].lon)
      return bot.sendMessage(chatId, lahdotPysakeilta, { ask: 'askpysakkivalinta' });
    }
  })

  //Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
  .catch(err => {
    console.error("GraphQL error")
    console.error(err)
    return bot.sendMessage(chatId, `Ongelma valinnassa. Kokeile uudestaan!`, { ask: 'askpysakkivalinta' })
  })
}

function chunkArray(myArray, chunk_size) {
  var results = [];

  while (myArray.length) {
    results.push(myArray.splice(0, chunk_size));
  }
  results.push(nappaimistonpohja)
  return results;
}

function numMaara(viesti) {
  //tarkistetaan numeroiden määrä
  return viesti.replace(/[^0-9]/g, "").length;
}

const capitalize = (str) => {
        str.includes("/pysakki") ?  str = str.replace("/pysakki", "").trim() : str = str.replace("/pys", "").trim();
  if (typeof str !== 'string') return '';
  return "/pys " + str.charAt(0).toUpperCase() + str.slice(1)
}
function lahetaPysakinSijainti(chatId, stationLat, stationLon) {
  // Kasaa ja lähettää aseman sijainnin 250ms aseman tietojen jälkeen
  setTimeout(function () {
    return bot.sendLocation(chatId, [parseFloat(stationLat), parseFloat(stationLon)], { replyMarkup })
  }, 250)
}
