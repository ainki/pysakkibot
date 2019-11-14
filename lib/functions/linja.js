// linja.js

const bot = require('../../bot');
const { request } = require('graphql-request');
const jp = require('jsonpath');
const date = require('date-and-time');
const muuttujia = require('../flow/muutujia');
const funktioita = require('../flow/funktioita');
var lahtoListaus = require('./lahtoListaus');
"use strict";

//funktioita
const chunkArray = funktioita.chunkArray;
const capitalize = funktioita.capitalize;

let linjaVarasto = [];
let maaranpaaVarasto = [];

var digiAPI = muuttujia.digiAPI;

function linja(chatId, viesti) {
  // Jos saadaan vain /linja, kysytään ask.linjatunnuksella linjaa
  if (viesti === '/linja') {
    console.info('Kysytään linjaa.');
    return bot.sendMessage(chatId, 'Anna linjan tunnus 😄', { replyMarkup: 'hide', ask: 'linjatunnus' });

  }
  // else if (viesti.includes(" ")) {
  //
  //   viesti = viesti.replace('/linja ', '').toUpperCase();
  //   let splitattu = viesti.split(" ");
  //   return maaranpaat(chatId,splitattu[0],splitattu[1]);
  // }
  else {
    bot.sendAction(chatId, 'typing');
    console.info("Etsitään linjaa");
    //Poistaa "/linja " tekstin
    viesti = viesti.replace('/linja ', '').toUpperCase();
    //Kutuu funktion
    return maaranpaat(chatId, viesti);
  }
}
// Exporttaa linja funktion index.js:sään'
module.exports = linja;


// Kysyy linjatunnusta
bot.on('ask.linjatunnus', msg => {
  const valinta = msg.text.toUpperCase();
  // Tähän komennot joita jotka ei tee hakua
  if (!valinta.includes("/")) {

    bot.sendAction(msg.from.id, 'typing');
    console.info('Haetaan linjaa');
    // Kutsuu maaranpaat funtion
    return maaranpaat(msg.from.id, valinta);
  }
});


// maaranpaat funktio
function maaranpaat(chatId, linja, pysakki) {
  // päivämäärä queryä varten
const nyt = new Date();
  var tanaan = date.format(nyt, 'YYYYMMDD')

  // graphQL querylause
  const query = `{
    routes(name: "${linja}") {
      shortName
      longName
      patterns {
        headsign
        code
        tripsForDate(serviceDate: "${tanaan}") {
          tripHeadsign
        }
      }
    }
  }`;

  return request(digiAPI, query)
  .then(function (data) {
    // Tekee näppäimistöt, vaihtoehdot arrayn ja vaihtoehtonumeron
    var nappaimistoVaihtoehdot = [];
    var vaihtoehdot = [];
    var numerot = [];
    var koodit = [];
    var vaihtoehtoNumero = 0;
    var maaranpaalista = '';

    // Hakee queryn vastauksesta tiettyjä arvoja
    var shortNames = jp.query(data, '$..shortName');
    var patterns = jp.query(data, '$..patterns');

    // Eritellään toisistaan
    for (let i = 0; i < shortNames.length; i++  ) {
      // Linjatunnus ja pattterni eritellään
      var linjatunnus = shortNames[i];
      var pattern = patterns[i];

      // Vain haettu tunnus kelpaa, query palauttaa kaikki tunnukset, jossa sama yhdistelmä (esim jos hakee '146' query palauttaa kaikki '146,146A,146N')
      if (linjatunnus === linja) {

        // Hakee patternista maääränpäät, koodin ja päivän tripit
        var maaranpaat = jp.query(pattern, '$..headsign');
        var code = jp.query(pattern, '$..code');
        var tripsForDate = jp.query(pattern, '$..tripsForDate');
        var eiTrippeja = false;

        //Jokaiselle määränpäälle
        for (let x = 0; x < maaranpaat.length; x++  ) {
          // Jos ei trippejä päivänä
          if (tripsForDate[x] == '') {
            eiTrippeja = true;
            console.log('Ei trippejä');
            // Älä tee mitään
          } else {
            console.log('On trippejä. Code: ' + code[x] + ' - '+ maaranpaat[x] +' - ' + x);


            koodit.push(code[x]);

            // Lisää ykkösen jokaista määränpäärä varten
            vaihtoehtoNumero++;

            //Lisää dataaa näppäimistöön ja vaihtoehtoihin
            nappaimistoVaihtoehdot.push(JSON.stringify(vaihtoehtoNumero));
            numerot.push(JSON.stringify(vaihtoehtoNumero));
            vaihtoehdot.push(JSON.stringify(vaihtoehtoNumero), code[x]);

            //Määrnänpäät maaranpaalistaan linjaä varten
            maaranpaalista += JSON.stringify(vaihtoehtoNumero) + ' - ' + maaranpaat[x] + '\n';
          }
        } break;

      }

    }
    // Jos linja löytyy, muttei lähtöjä

    var nappaimisto = chunkArray([]);
    let replyMarkup = bot.keyboard(nappaimisto, { resize: true });

    if (maaranpaalista == '' && eiTrippeja) {
      console.info("Ei lähtöjä linjalla");
      return bot.sendMessage(chatId, `Linjalla '${linjatunnus}' ei ole lähtöjä.\n\nEtsi toista?`, { replyMarkup, ask: 'linjatunnus' });
    } else if (maaranpaalista == '') {
      // Jos määränpäälista on tyhjä, sovellus palauttaa ettei linjaa löydy
      console.info("Linjaa ei löytynyt");
      return bot.sendMessage(chatId, `Linjaa '${linja}' ei löytynyt.\n\nKokeile uudestaan!'`, { replyMarkup, ask: 'linjatunnus' });
    }

    // Tekee elementin johon talletetaan linjakoodeihin tarvittavan datan
    linjaVarasto.push({ userId: chatId,numero:numerot,koodit:koodit });

     nappaimisto = chunkArray(nappaimistoVaihtoehdot, 4);
     replyMarkup = bot.keyboard(nappaimisto, { resize: true });
    // Lähettää vietin ja näppäimistön
    pysakki ? linjanPysakki(chatId,linja,pysakki) : bot.sendMessage(chatId, `Määränpäät linjalle ${linjatunnus}:\n\n${maaranpaalista}\nValitse määränpää näppäimistöstä!`, { replyMarkup, ask: 'linjavalinta' });
    return console.info("Määränpäät lähetetty");
  })
  .catch(err => {
    console.error(" GraphQL error \n",err);
    return bot.sendMessage(chatId, `Ongelma pyynnössä. Kokeile uudestaan!`);
  });
}




bot.on('ask.linjavalinta', msg => {
  // Hakee linjaVarastosta tarvittavat tiedot
  var userId = jp.query(linjaVarasto, '$..userId');
  var koodit = jp.query(linjaVarasto, '$..koodit.*');
  var valintaNumerot = jp.query(linjaVarasto, '$..numero.*');

  // Jos valinnassa on kauttaviiva, sovellus poistaa linjaVarastosta tiedot
  if (msg.text.includes("/")) {
    // Poistaa linjaVarastosta user id:n perusteella
    for (let i = 0; i < userId.length; i++  ) {
      let koodi = koodit[i];

      if (userId[i] == msg.chat.id) {
        // Poistaa linjaVarastosta datan
        linjaVarasto.splice(i, 1);
        console.info("Ei vastattu kysymykseen.");
      }
    }
  } else {
    // Action typing
    bot.sendAction(msg.from.id, 'typing');
    // Jokaiselle userId:lle
    for (let i = 0; i < userId.length; i++  ) {

      if (userId[i] == msg.chat.id) {
        for (let x = 0; x < valintaNumerot.length; x++  ) {
          if (valintaNumerot[x] === msg.text) {
            // Element tallennetaan maaranpaaVarastoon seuraavaa vaihetta varten.

            maaranpaaVarasto.push({ id: msg.chat.id,koodi: koodit[x] });
            // Poistaa linjaVarastosta tiedot
            linjaVarasto.splice(i, 1);

            // Kutsuu pysäkkihaku funktioon
            return pysakkihaku(msg.chat.id, koodit[x]);

          }
        }
      }
    }
  }
});

var pysakit = [];

function pysakkihaku(chatId, code) {

  //Hakulause
  const query = `{
    pattern(id: "${code}") {
      headsign
      name
      stops {
        name
        code
      }
    }
  }`;

  return request(digiAPI, query)
  .then(function (data) {
    // vastaus = JSON.stringify(data);
    let stopsHaku = jp.query(data, '$..stops');
    let pysakkinimet = jp.query(stopsHaku, '$..name');
    let pysakkikoodit = jp.query(stopsHaku, '$..code');
    // Tekee arrayt
    var pysakkikooditArray = [];
    var kaikkiPysakitArray = [];

    // Jokaiselle pysäkkimelle tallettaa arrayheihin dataa
    for (let i = 0; i < pysakkinimet.length; i++  ) {
      pysakkikooditArray.push(pysakkikoodit[i])
      kaikkiPysakitArray.push(pysakkinimet[i])
    }
    // Tallentaa pysakit objektiin pysäkkien nimet ja koodit

    pysakit.push({id: chatId,pysakitJaKoodit: {stopNames: pysakkinimet,stopCodes: pysakkikoodit }});

    // Uusi näppäimistö
    var nappaimisto = chunkArray(kaikkiPysakitArray, 3);
    let replyMarkup = bot.keyboard(nappaimisto, { resize: true });
    // Lähettää pysäkkivaihtoehdot käyttäjälle
    bot.sendMessage(chatId, 'Valitse pysäkki näppäimistöstä', { replyMarkup, ask: 'pysakkivalinta' });
        return console.info("Kysytty pysäkkkivalintaa");
  })
}

bot.on('ask.pysakkivalinta', msg => {

  // Typing action
  bot.sendAction(msg.from.id, 'typing');
  return aikataulut(msg.chat.id, capitalize(msg.text));
});

function aikataulut(chatId, valinta) {
  // Datan haku maaranpaaVarastosta
  var userId = jp.query(maaranpaaVarasto, '$..id');
  var linjanKoodit = jp.query(maaranpaaVarasto, '$..koodi');

  // Datan haku pysakit
  var pysakitUserId = jp.query(pysakit, '$..id');
  var pysakitJaKoodit = jp.query(pysakit, '$..pysakitJaKoodit');

  // Jos valinnassa "/" sovellus poistaa pysakeista ja linjakoodeista tiedot
  if (valinta.includes('/')) {
    // Poistaa valinnoista tallennetun datan
    for (let i = 0; i < userId.length; i++  ) {
      // Kun chat id matchaa
      if (userId[i] === chatId) {
        // Poistaa valinnoista datan
        maaranpaaVarasto.splice(i, 1);
        pysakit.splice(i, 1);
        return console.info("Ei vastattu kysymykseen.");
      }
    }
  }
  let pysakinKoodi;
  for (let i = 0; i < userId.length; i++  ) {
    if (userId[i] == chatId) {
      linjanKoodi = linjanKoodit[i];
      for (let y = 0; y < pysakitUserId.length; y++  ) {
        if (pysakitUserId[y] == chatId) {
          var pysakitJaKooditForId = pysakitJaKoodit[y];
          var pysakinKoodit = pysakitJaKooditForId.stopCodes;
          var pysakinNimet = pysakitJaKooditForId.stopNames;
          let eiLoydy = true;

          for (let x = 0; x < pysakinNimet.length; x++  ) {
            pysakinKoodi = pysakinKoodit[x];
            if (valinta === pysakinNimet[x] || valinta === pysakinKoodit[x] ) {
              // Pysäyttää loopin
              eiLoydy = false;
              break;
            }
          }
          if (eiLoydy) {
          bot.sendMessage(chatId, `Pysäkkiä <i>${valinta}</i> ei valitettavasti löydy.\nKokeile uudestaan!`, {ask: 'pysakkivalinta', parseMode: 'html'});
          return;
          }

        }
      }
    }
  }

  // console.debug('Pysäkin koodi: ' + pysakinKoodi + ' - Linjan koodi: ' +linjanKoodi)
  //Hakulause

  const query = `{
    stops(name: "${pysakinKoodi}") {
      platformCode
      name
      code
      zoneId
      desc
      stopTimesForPattern(id:"${linjanKoodi}",numberOfDepartures: 10, omitCanceled: false) {
        serviceDay
        realtimeDeparture
        realtimeState
        pickupType
        headsign
        trip {
          route{
            shortName
            alerts {
              alertSeverityLevel
            }
          }
        }
      }
    }
  }`;

  return request(digiAPI, query)
  .then(function (data) {
lahtoHandler(data, chatId, valinta);
});
}
function lahtoHandler(data,chatId, valinta) {
  // var asetus = 2;
  var lahdotPysakilta = lahtoListaus(data, true);

        bot.sendMessage(chatId, lahdotPysakilta, { ask: 'pysakkivalinta', parseMode: 'html' });

}
