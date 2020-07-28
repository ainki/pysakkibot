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

function linja(msg) {
  let pysakki;
  let haettuLinja;
  // Jos saadaan vain /linja, kysytään ask.linjatunnuksella linjaa
  if (msg.text === '/linja') {
    console.info('Kysytään linjaa.');
    return bot.sendMessage(msg.chat.id, 'Anna linjan tunnus 😄', { replyMarkup: 'hide', ask: 'linjatunnus' });

  }else {
    //jätetty et jos sais sen linjan pysäkkihaun toimii joskus
    let splitattu = msg.text.trim().split(",");
    haettuLinja = splitattu[0];
    if (splitattu[1]) {
      return maaranpaat(msg.from.id, valinta, splitattu[1]);

      }
    bot.sendAction(msg.chat.id, 'typing');
    console.info("Etsitään linjaa");
    //Poistaa "/linja " tekstin
    haettuLinja = haettuLinja.replace('/linja ', '').toUpperCase();
    //Kutuu funktion
    return maaranpaat(msg.chat.id, haettuLinja);
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
  const tanaan = date.format(nyt, 'YYYYMMDD');

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
    var linjatunnus;
    var eiTrippeja = false;
    let linjanIdt = [];
    // Eritellään toisistaan
    for (let i = 0; i < shortNames.length; i++  ) {
      // Linjatunnus ja pattterni eritellään
       linjatunnus = shortNames[i];
      var pattern = patterns[i];

      // Vain haettu tunnus kelpaa, query palauttaa kaikki tunnukset, jossa sama yhdistelmä (esim jos hakee '146' query palauttaa kaikki '146,146A,146N')
      if (linjatunnus.toUpperCase() === linja) {

        // Hakee patternista maääränpäät, koodin ja päivän tripit
        var linjakilpi = jp.query(pattern, '$..headsign');
        var linjanId = jp.query(pattern, '$..code');
        var tripsForDate = jp.query(pattern, '$..tripsForDate');



        //Jokaiselle määränpäälle
        for (let x = 0; x < linjakilpi.length; x++  ) {
          // Jos ei trippejä päivänä
          if (tripsForDate[x] == '') {
            eiTrippeja = true;
            console.info('Ei trippejä');
            // Älä tee mitään
          } else {
            console.info('On trippejä. linjanId: ' + linjanId[x] + ' - '+ linjakilpi[x] +' - ' + x);


            linjanIdt.push(linjanId[x]);

            // Lisää ykkösen jokaista määränpäärä varten
            vaihtoehtoNumero++;

            //Lisää dataaa näppäimistöön ja vaihtoehtoihin
            nappaimistoVaihtoehdot.push(JSON.stringify(vaihtoehtoNumero));
            numerot.push(JSON.stringify(vaihtoehtoNumero));
            vaihtoehdot.push(JSON.stringify(vaihtoehtoNumero), linjanId[x]);

            //Määrnänpäät maaranpaalistaan linjaä varten
            maaranpaalista += JSON.stringify(vaihtoehtoNumero) + ' - ' + linjakilpi[x] + '\n';
          }
        } break;

      }

    }
    // Jos linja löytyy, muttei lähtöjä

    var nappaimisto = chunkArray([]);
    let replyMarkup = bot.keyboard(nappaimisto, { resize: true });

    if (maaranpaalista === '' && eiTrippeja) {
      console.info("Ei lähtöjä linjalla");
      return bot.sendMessage(chatId, `Linjalla <i>${linjatunnus}</i> ei ole lähtöjä.\n\nEtsi toista?`, { replyMarkup, ask: 'linjatunnus', parseMode: 'html' });
    } else if (maaranpaalista == '') {
      // Jos määränpäälista on tyhjä, sovellus palauttaa ettei linjaa löydy
      console.info("Linjaa ei löytynyt");
      return bot.sendMessage(chatId, `Linjaa <i>${linja}</i> ei löytynyt.\n\nKokeile uudestaan!`, { replyMarkup, ask: 'linjatunnus', parseMode: 'html' });
    }

    // Tekee elementin johon talletetaan linjakoodeihin tarvittavan datan
    linjaVarasto.push({ userId: chatId,numero:numerot,linjanIdt:linjanIdt });

     nappaimisto = chunkArray(nappaimistoVaihtoehdot, 4);
     replyMarkup = bot.keyboard(nappaimisto, { resize: true });
    // Lähettää vietin ja näppäimistön
    pysakki ? linjanPysakki(chatId,linja,pysakki) : bot.sendMessage(chatId, `Määränpäät linjalle <i>${linjatunnus}</i>:\n\n${maaranpaalista}\nValitse määränpää näppäimistöstä!`, { replyMarkup, ask: 'maaranpaavalinta', parseMode: 'html' });
    return console.info("Määränpäät lähetetty");
  })
  .catch(err => {
    console.error(" GraphQL error \n",err);
    return bot.sendMessage(chatId, `Ongelma pyynnössä 😕. Kokeile uudestaan!`);
  });
}




bot.on('ask.maaranpaavalinta', msg => {
  // Hakee linjaVarastosta tarvittavat tiedot
  var userId = jp.query(linjaVarasto, '$..userId');
  var linjanIdt = jp.query(linjaVarasto, '$..linjanIdt.*');
  var valintaNumerot = jp.query(linjaVarasto, '$..numero.*');

  // Jos valinnassa on kauttaviiva, sovellus poistaa linjaVarastosta tiedot
  if (msg.text.includes("/")) {
    // Poistaa linjaVarastosta user id:n perusteella
    for (let i = 0; i < userId.length; i++  ) {
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

            maaranpaaVarasto.push({ id: msg.chat.id,linjanId: linjanIdt[x] });
            // Poistaa linjaVarastosta tiedot
            linjaVarasto.splice(i, 1);

            // Kutsuu pysäkkihaku funktioon
            return pysakkienhaku(msg.chat.id, linjanIdt[x]);

          }
        }
      }
    }
  }
});

var pysakit = [];

function pysakkienhaku(chatId, linjanId, pysakki) {

  //Hakulause
  const query = `{
    pattern(id: "${linjanId}") {
      headsign
      name
      stops {
        gtfsId
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
    let pysakinKoodit = jp.query(stopsHaku, '$..code');
    let pysakinIdt = jp.query(stopsHaku, '$..gtfsId');
    // Tekee arrayt
    var kaikkiPysakitArray = [];

    // Jokaiselle pysäkkimelle tallettaa arrayheihin dataa
    for (let i = 0; i < pysakkinimet.length; i++  ) {
      kaikkiPysakitArray.push(pysakkinimet[i]);
    }
    // Tallentaa pysakit objektiin pysäkkien nimet ja koodit

    pysakit.push({id: chatId,pysakitKooditJaIdt: {stopNames: pysakkinimet, stopCodes: pysakinKoodit, stopIds: pysakinIdt}});

    // Uusi näppäimistö
    var nappaimisto = chunkArray(kaikkiPysakitArray, 3);
    let replyMarkup = bot.keyboard(nappaimisto, { resize: true });
    // Lähettää pysäkkivaihtoehdot käyttäjälle
    bot.sendMessage(chatId, 'Valitse pysäkki näppäimistöstä!', { replyMarkup, ask: 'pysakkivalinta' });
        return console.info("Kysytty pysäkkkivalintaa");
  });
}

bot.on('ask.pysakkivalinta', msg => {

  // Typing action
  bot.sendAction(msg.from.id, 'typing');
  return aikataulut(msg.chat.id, capitalize(msg.text));
});

function aikataulut(chatId, valinta) {
  // Datan haku maaranpaaVarastosta
  var userId = jp.query(maaranpaaVarasto, '$..id');
  var linjanId = jp.query(maaranpaaVarasto, '$..linjanId');

  // Datanhaku pysakit
  var pysakitUserId = jp.query(pysakit, '$..id');
  var pysakitKooditJaIdt = jp.query(pysakit, '$..pysakitKooditJaIdt');

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
  let pysakinId;

  for (let i = 0; i < userId.length; i++  ) {
    if (userId[i] == chatId) {

      for (let y = 0; y < pysakitUserId.length; y++  ) {
        if (pysakitUserId[y] == chatId) {
          const pysakinKoodit = pysakitKooditJaIdt[y].stopCodes;
          const pysakinNimet = pysakitKooditJaIdt[y].stopNames;
          const pysakinIdt = pysakitKooditJaIdt[y].stopIds;
          let eiLoydy = true;

          for (let x = 0; x < pysakinNimet.length; x++  ) {
            pysakinId = pysakinIdt[x];
            if (valinta === pysakinNimet[x] || valinta === pysakinKoodit[x] ) {
              // Pysäyttää loopin
              eiLoydy = false;
              break;
            }
          }
          if (eiLoydy) {
          bot.sendMessage(chatId, `Pysäkkiä <i>${valinta}</i> ei valitettavasti löydy valitulle linjalle.\nKokeile uudestaan!`, {ask: 'pysakkivalinta', parseMode: 'html'});
          return;
          }

        }
      }
    }
  }

  // console.debug('Pysäkin koodi: ' + pysakinKoodit[x] + ' - Linjan koodi: ' +linjanId)
  //Hakulause

  const query = `{
    stop(id: "${pysakinId}") {
      platformCode
      name
      code
      zoneId
      desc
      stopTimesForPattern(id:"${linjanId}",numberOfDepartures: 10, omitCanceled: false) {
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
      data.stops = [];
        data.stops.push(data.stop);
       delete data.stop;

          bot.sendMessage(chatId, lahtoListaus(data, true), { ask: 'pysakkivalinta', parseMode: 'html' });
});
}
