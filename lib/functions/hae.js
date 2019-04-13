// hae.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
var muuttujia = require('../flow/muutujia');
var lahtoListaus = require('./lahtoListaus')

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
       viesti =  poistaTurhatValit(viesti);
      viesti = capitalize(viesti);
      // Funktioon siirtyminen
      return valintafunktio(chatId, viesti, 1);
    } else {
      // Muuten etsii suoraan. Heittää viestin hetkinen ja menee pysäkkihaku funktioon
      console.log("[info] Etsitään pysäkkiä")
      bot.sendAction(chatId, 'typing')
      // Poistaa "/hae " tekstin
      viesti = poistaTurhatValit(viesti)
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
  let text = msg.text;

  // Komennot jotka ei tee pysökkihakua
  if (text == "/start" || text == undefined || text.includes("/hae") || text == "/help" || text.includes("/linja") || text == "/menu" || text == "/about" || text == "/poikkeukset") {
    // Keskeytetään kysymys jos sisältää toisen komennon
  } else {
    // jos numeroita 4
    if (numMaara(text) === 4) {
      text = capitalize(text);
      console.log("[info] Haetaan aikatauluja...")
      // Lähetetään actioni
      bot.sendAction(msg.from.id, 'typing')
      // Funktioon siirtyminen
      return valintafunktio(msg.from.id, text, 1);
    } else {
      console.log("[info] Etsitään pysäkkiä")
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
      platformCode
      name
      code
    }
  }`

  //Hakulauseen suoritus
  return request(digiAPI, query)
  .then(function (data) {
    //Data on vastaus GraphQL kyselystä
    //Muutuja vastaus stringifaijattu data
    var vastaus = JSON.stringify(data);
    //Jos pysäkin nimellä ei löydy pysäkkiä
    if (vastaus == tyhjavastaus) {
      //Lähettää viestin ja kysymyksen
      bot.sendMessage(chatId, `Pysäkkiä "${viesti}" ei valitettavasti löydy.\nKokeile uudestaan 😄`, { ask: 'pysakkinimi' });
      return console.log("[info] Pysäkkiä ei löytynyt.")
    } else {
      //Hakee pyäkit ja koodit niille
      var pysakit = jp.query(data, '$..name')
      var koodit = jp.query(data, '$..code')
      var laiturit = jp.query(data, '$..platformCode')
      //Erittelee pysäkit ja yhdistää koodit
      for (i = 0; i < pysakit.length; i += 1) {
        koodi = koodit[i];
        laituri = laiturit[i]
        if (laituri == null) {
          //Yhdistää muuttujaan valinnat
          var pk = "/" + koodi + " " + pysakit[i] + " - " + koodit[i] + "\n"
        } else {
          var pk = "/" + koodi + " " + pysakit[i] + " - " + koodit[i] + ' - Lait. ' + laituri + "\n"
        }
        //Tallentaa toiseen muuttujaan kaikki pk muuttujat
        //Jos tehdään ensinmäinen valinta
        if (pysakkivalinta == null) {
          //Viesti
          pysakkivalinta = pk;
          //Luodaan tyhjä näppäimistö
          var pysakkivaihtoehdot = []
          pysakkivaihtoehdot.push("/" + koodi)
        } else {
          //Viesti
          pysakkivalinta = pysakkivalinta += pk;
          //Näppäimistö
          pysakkivaihtoehdot.push("/" + koodi)
        }
      }
      //Näppäimistö jaetaan kahteen riviin
      var nappaimisto = chunkArray(pysakkivaihtoehdot, 5);
      //Rakennetaan nappaimisto
      let replyMarkup = bot.keyboard(nappaimisto, { resize: true });

      // Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
      console.log("[info] Valinnat lähetetty!")
      return bot.sendMessage(chatId, `Etsit pysäkkiä "${viesti}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${pysakkivalinta}\nVoit valita pysäkin myös näppäimistöstä! 😉`, { replyMarkup, ask: 'askpysakkivalinta' })
      var pysakkivalinta = undefined;
      var nappaimisto = undefined;
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
bot.on('ask.askpysakkivalinta', msg => {
  const valinta = msg.text;

  //Komennot jotka ei tee pysökkihakua
  if (valinta == "/start" || valinta == undefined || valinta.includes("/hae") || valinta == "/help" || valinta.includes("/linja") || valinta == "/menu" || valinta == "/about" || valinta == "/poikkeukset") {
    //Keskeytetään kysymys
  } else {
    //Jos sisältää "/" ja numroita on 4 kutsutaan valintafunktiota
    if (valinta.includes("/") && numMaara(valinta) === 4) {
      console.log("[info] Haetaan aikatauluja...")
      bot.sendAction(msg.from.id, 'typing')
      return valintafunktio(msg.from.id, valinta);
    }else if (valinta.includes("/") && numMaara(valinta) < 4) {
      bot.sendMessage(msg.from.id, `Liian lyhyt haku. Pysäkkikoodeissa on oltava 4 numeroa sekä mahdollinen etuliite`, { ask: 'askpysakkivalinta' });
      }else if (valinta.includes("/") && numMaara(valinta) > 4) {
        bot.sendMessage(msg.from.id, `Liian pitkä haku. Pysäkkikoodeissa on oltava 4 numeroa sekä mahdollinen etuliite`, { ask: 'askpysakkivalinta' });
      } else {
      //Jos ei siällä "/" niin kysytään uudelleen
      bot.sendMessage(msg.from.id, ``, { ask: 'askpysakkivalinta' }).catch(error => console.log('[info] Ei pysäkin koodia!'));
      //Do nothing
    }
  }
});

//Valinta - /HAE -> /xxxx (pysäkin tunnus)
function valintafunktio(chatId, valinta, asetus) {
  //Jos pelkästään kauttaviiva

  if (valinta == '/') {
    return bot.sendMessage(chatId, `"/" ei ole pysäkki. Kokeile uudestaan!`, { ask: 'askpysakkivalinta' });
  }
  //Poistaa "/" merkin ja tyhjän välin
  valintavastaus = valinta.replace('/', '');
  if (valintavastaus.includes(' ')) {
    valintavastaus = valintavastaus.replace(' ', '')
  }
  //Query
  const queryGetStopTimesForStops = `{
    stops(name: "${valintavastaus}") {
      platformCode
      name
      code
      stoptimesWithoutPatterns (numberOfDepartures: 10) {
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
      return bot.sendMessage(chatId, lahdotPysakeilta, { replyMarkup, ask: 'askpysakkivalinta' });
    } else {
      //Viestin lähetys
      console.log('[info] Lähdöt lähetetty')
      return bot.sendMessage(chatId, lahdotPysakeilta, { ask: 'askpysakkivalinta' });
    }
  })

  //Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
  .catch(err => {
    console.log("[ERROR] GraphQL error")
    console.log(err)
    return bot.sendMessage(chatId, `Ongelma valinnassa. Kokeile uudestaan!`, { ask: 'askpysakkivalinta' })
  })
}

function chunkArray(myArray, chunk_size) {
  var results = [];

  while (myArray.length) {
    results.push(myArray.splice(0, chunk_size));
  }
  results.push([bot.button('/hae'), bot.button('/linja'), bot.button('location', 'Sijaintisi mukaan 📍')])
  return results;
}
function numMaara(viesti) {
  //tarkistetaan numeroiden määrä
  return viesti.replace(/[^0-9]/g,"").length;

}

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function poistaTurhatValit (viesti) {

  let kirjaimet = viesti.replace("/hae", "").split("");
  for (let i = kirjaimet.length - 1; i >= 0; i--) {
    if (kirjaimet[i] === /\p{L}(\p{L}|\p{Nd})*/g) {
      break;
    }else if (kirjaimet[i] === " ") {
      kirjaimet.splice(i, 1)
    }
  }
return kirjaimet.join("");
}
