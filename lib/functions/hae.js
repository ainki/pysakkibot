// hae.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var muuttujia = require('../flow/muutujia');
var lahtoListaus = require('./lahtoListaus')
const chunkArray = require('./chunkArray')

// muuttujia
var digiAPI = muuttujia.digiAPI;
var tyhjavastaus = muuttujia.tyhjavastaus;
// numerocheck
var hasNumber = /\d/;

// Hae komento
function hae(chatId, viesti) {

  console.log("[info] Kysytty pysäkkiä.")
  // Jos tkesti on pelkästään /hae, ohjelma kysyy pysäkin nimeä tai koodia erikseen
  if (viesti === '/hae') {


    return bot.sendMessage(chatId, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysakkinimi' }).then(re => { })
  } else {
    if (hasNumber.test(viesti) == true && numMaara(viesti) === 4) {
      console.log("[info] Haetaan aikatauluja...")
      // Lähetetään actioni
      bot.sendAction(chatId, 'typing')
      viesti = viesti.replace("/hae", "").trim();
      viesti = capitalize(viesti);
      // Funktioon siirtyminen
      return valintafunktio(chatId, viesti, 1);
    } else {
      // Muuten etsii suoraan. Heittää viestin hetkinen ja menee pysäkkihakufunktioon
      console.log("[info] Etsitään pysäkkiä")
      bot.sendAction(chatId, 'typing')
      // Poistaa "/hae " tekstin
      viesti = viesti.replace("/hae", "").trim();
      console.log(viesti)
      // Kutuu funktion
      pysakkihaku(chatId, viesti);
    }
  }
}
//Exporttaa tän indexiin
module.exports = hae;

// Pysäkkinimi kysymys
bot.on('ask.pysakkinimi', msg => {
  let text = msg.text.toLowerCase();;

  //Komennot jotka ei tee pysökkihakua
  if (text == "/start" || text == undefined || text.includes("/hae") || text == "/help" || text.includes("/linja") || text == "/menu" || text == "/about" || text == "/poikkeukset"|| text.includes("/pys")) {
    // Keskeytetään kysymys jos sisältää toisen komennon

  } else {
    viesti = capitalize(text)
    // jos numeroita 4
    if (numMaara(text) === 4) {
      console.log("[info] Haetaan aikatauluja...")
      // Lähetetään actioni
      bot.sendAction(msg.from.id, 'typing')
      // Funktioon siirtyminen
      return valintafunktio(msg.from.id, viesti, 1);
    } else {
      console.log("[info] Etsitään pysäkkiä")
      //Lähetetään actioni
      bot.sendAction(msg.from.id, 'typing')
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
  }`

  //Hakulauseen suoritus
  return request(digiAPI, query)
  .then(function (data) {
    //Data on vastaus GraphQL kyselystä
      let koodit = jp.query(data, '$..code')
      let puuttuvat = [];
      for (var i = 0; i < koodit.length; i++) {
        if (koodit[i] === null) {
          console.log(koodit[i]);
          puuttuvat.push(koodit[i])
        }
      }
    //Jos pysäkin nimellä ei löydy pysäkkiä
    if (!Object.keys(data.stops).length || puuttuvat.length === koodit.length) {
       // || data.stops[0].code === null
      //Lähettää viestin ja kysymyksen
      bot.sendMessage(chatId, `Pysäkkiä "${viesti}" ei valitettavasti löydy.\nKokeile uudestaan 😄`, { ask: 'pysakkinimi' });
      return console.log("[info] Pysäkkiä ei löytynyt.")
    } else {
      //Hakee pyäkit ja koodit niille
      var pysakit = jp.query(data, '$..name')
        let koodit = jp.query(data, '$..code')
      var laiturit = jp.query(data, '$..platformCode')

      // arrayt vaihtoehdoille
      let nappainvaihtoehdot = []
      let viestivaihtoehdot = [];
      //Erittelee pysäkit ja yhdistää koodit
      console.log(pysakit.length);
      for (i = 0; i < pysakit.length; i++) {
        //viestiin ja näppäimistöön tuleva komento
        const komento = "/" + koodit[i];
        if (laiturit[i] === null && koodit[i] !== null && koodit[i] !== undefined) {
          //Yhdistää muuttujaan valinnat
          var pk = komento + " "+ pysakit[i] + " - " + koodit[i];
          // lisätään vaihtoehdot

          if (nappainvaihtoehdot.indexOf(komento) === -1) {
            viestivaihtoehdot.push(pk);
            nappainvaihtoehdot.push(komento)
          }

        } else if(laiturit[i] !== null && koodit[i] !== null && koodit[i] !== undefined) {
          var pk = komento + " "+ pysakit[i] + " - " + koodit[i] + ' - Lait. ' + laiturit[i];
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
        return valintafunktio(chatId,viesti);
      }
      //Näppäimistö jaetaan kahteen riviin
      var nappaimisto = chunkArray(nappainvaihtoehdot, 5);
      //Rakennetaan nappaimisto
      let replyMarkup = bot.keyboard(nappaimisto, { resize: true });

      // Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
      console.log("[info] Valinnat lähetetty!")
      return bot.sendMessage(chatId, `Etsit pysäkkiä "${viesti}".\nValitse alla olevista vaihtoehdoista oikea pysäkki!\n\n${viestivaihtoehdot.join("\n")}\n\nVoit valita pysäkin myös näppäimistöstä! 😉`, { replyMarkup, ask: 'askhaevalinta' })
      nappaimisto = undefined;
    }
  }
)
//Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
.catch(err => {
  console.log("[ERROR] GraphQL error")
  console.log(err)
  return bot.sendMessage(chatId, `Ongelma pyynnössä. Kokeile uudestaan!`)
})
};

//Pysäkkivalinta kysymys
bot.on('ask.askhaevalinta', msg => {
  const valinta = msg.text.toLowerCase();

  //Komennot jotka ei tee pysökkihakua
  if (valinta == "/start" || valinta == undefined || valinta.includes("/hae") || valinta == "/help" || valinta.includes("/linja") || valinta == "/menu" || valinta == "/about" || valinta == "/poikkeukset" ||  valinta.includes("/pys") || valinta.includes("/pysakki")) {
    //Keskeytetään kysymys


  } else {
    //Jos sisältää "/" ja numroita on 4 kutsutaan valintafunktiota
    if (valinta.includes("/") && numMaara(valinta) === 4) {
      console.log("[info] Haetaan aikatauluja...")
      bot.sendAction(msg.from.id, 'typing')
      return valintafunktio(msg.from.id, valinta);
    } else if (valinta.includes("/") && numMaara(valinta) < 4) {
      bot.sendMessage(msg.from.id, `Virheellinen haku. Pysäkkikoodeissa on oltava 4 numeroa sekä mahdollinen etuliite`, { ask: 'askhaevalinta' });
    } else if (valinta.includes("/") && numMaara(valinta) > 4) {
      bot.sendMessage(msg.from.id, `Virheellinen haku. Pysäkkikoodeissa on oltava 4 numeroa sekä mahdollinen etuliite`, { ask: 'askhaevalinta' });
    } else {
      //Jos ei siällä "/" niin kysytään uudelleen
      bot.sendMessage(msg.from.id, ``, { ask: 'askhaevalinta' }).catch(error => console.log('[info] Ei pysäkin koodia!'));
      //Do nothing
    }
  }
});

//Valinta - /HAE -> /xxxx (pysäkin tunnus)
function valintafunktio(chatId, valinta, asetus) {
  //Jos pelkästään kauttaviiva

  if (valinta == '/') {
    return bot.sendMessage(chatId, `"/" ei ole pysäkki. Kokeile uudestaan!`, { ask: 'askhaevalinta' });
  }
  //Poistaa "/" merkin ja tyhjän välin
  valintavastaus = valinta.replace('/', '').replace(' ', '');

  //Query
  const queryGetStopTimesForStops = `{
    stops(name: "${capitalize(valintavastaus)}") {
      platformCode
      name
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

    if (asetus == 1) {
      var valintaArr = []
      valintaArr.push('/' + valinta)
      var nappaimisto = chunkArray(valintaArr, 1);
      let replyMarkup = bot.keyboard(nappaimisto, { resize: true })
      console.log('[info] Lähdöt lähetetty')
      return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'askhaevalinta' });
    } else {
      //Viestin lähetys
      console.log('[info] Lähdöt lähetetty')
      return bot.sendMessage(chatId, lahdotPysakeilta, { ask: 'askhaevalinta' });
    }
  })

  //Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
  .catch(err => {
    console.log("[ERROR] GraphQL error")
    console.log(err)
    return bot.sendMessage(chatId, `Ongelma valinnassa. Kokeile uudestaan!`, { ask: 'askhaevalinta' })
  })
}

function numMaara(viesti) {
  //tarkistetaan numeroiden määrä
  return viesti.replace(/[^0-9]/g, "").length;
}

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}
