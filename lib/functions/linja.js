// linja.js

const bot = require('../../bot')
const { request } = require('graphql-request')
const jp = require('jsonpath')
const date = require('date-and-time')
const muuttujia = require('../flow/muutujia')
const chunkArray = require('./chunkArray')
var lahtoListaus = require('./lahtoListaus')
// var replyMarkup = require('../flow/nappaimisto')

let linjaVarasto = []
let maaranpaaVarasto = []

var digiAPI = muuttujia.digiAPI;

function linja(chatId, viesti) {
  // Jos saadaan vain /linja, kysytään ask.linjatunnuksella linjaa
  if (viesti === '/linja') {
    console.info(' Kysytään linjaa.')
    return bot.sendMessage(chatId, 'Anna linjan tunnus 😄', { replyMarkup: 'hide', ask: 'linjatunnus' })
  } else {
    bot.sendAction(chatId, 'typing')
    console.info("Etsitään linjaa")
    //Poistaa "/linja " tekstin
    viesti = viesti.replace('/linja ', '');
    viesti = viesti.toUpperCase()
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

    bot.sendAction(msg.from.id, 'typing')
    console.info(' Haetaan linjaa')
    // Kutsuu maaranpaat funtion
    return maaranpaat(msg.from.id, valinta);
  }
});


// maaranpaat funktio
function maaranpaat(chatId, viesti) {
  // päivämäärä queryä varten
const nyt = new Date();
  var tanaan = date.format(nyt, 'YYYYMMDD')

  // graphQL querylause
  const query = `{
    routes(name: "${viesti}") {
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
  }`

  return request(digiAPI, query)
  .then(function (data) {
    // Tekee näppäimistöt, vaihtoehdot arrayn ja vaihtoehtonumeron
    var nappaimistoVaihtoehdot = []
    var vaihtoehdot = []
    var numerot = []
    var codet = []
    var vaihtoehtoNumero = 0
    var maaranpaalista = ''

    // Hakee queryn vastauksesta tiettyjä arvoja
    var shortNames = jp.query(data, '$..shortName')
    var patterns = jp.query(data, '$..patterns')

    // Eritellään toisistaan
    for (let i = 0; i < shortNames.length; i++  ) {
      // Linjatunnus ja pattterni eritellään
      var linjatunnus = shortNames[i];
      var pattern = patterns[i];

      // Vain haettu tunnus kelpaa, query palauttaa kaikki tunnukset, jossa sama yhdistelmä (esim jos hakee '146' query palauttaa kaikki '146,146A,146N')
      if (linjatunnus == viesti) {

        // Hakee patternista maääränpäät, koodin ja päivän tripit
        var maaranpaat = jp.query(pattern, '$..headsign')
        var code = jp.query(pattern, '$..code')
        var tripsForDate = jp.query(pattern, '$..tripsForDate')
        var eiTrippeja = false

        //Jokaiselle määränpäälle
        for (let x = 0; x < maaranpaat.length; x++  ) {
          // Jos ei trippejä päivänä
          if (tripsForDate[x] == '') {
            eiTrippeja = true
            console.log('Ei trippejä')
            // Älä tee mitään
          } else {
            console.log('On trippejä. Code: ' + code[x] + ' - '+ maaranpaat[x] +' - ' + x)


            codet.push(code[x])

            // Lisää ykkösen jokaista määränpäärä varten
            vaihtoehtoNumero++
            maaranpaa = maaranpaat[x]

            //Lisää dataaa näppäimistöön ja vaihtoehtoihin
            nappaimistoVaihtoehdot.push(JSON.stringify(vaihtoehtoNumero))
            numerot.push(JSON.stringify(vaihtoehtoNumero))
            vaihtoehdot.push(JSON.stringify(vaihtoehtoNumero), code[x])

            //Määrnänpäät maaranpaalistaan viestiä varten
            maaranpaalista += JSON.stringify(vaihtoehtoNumero) + ' - ' + maaranpaat[x] + '\n'
          }
        } break;

      }

    }
    // Jos linja löytyy, muttei lähtöjä
    if (maaranpaalista == '' && eiTrippeja) {
      console.info(" Ei lähtöjä linjalla")
      return bot.sendMessage(chatId, `Linjalla '${linjatunnus}' ei ole lähtöjä.\n\nEtsi toista?`, { replyMarkup, ask: 'linjatunnus' });
    } else if (maaranpaalista == '') {
      // Jos määränpäälista on tyhjä, sovellus palauttaa ettei linjaa löydy
      console.info(" Linjaa ei löytynyt")
      return bot.sendMessage(chatId, `Linjaa '${viesti}' ei löytynyt.\n\nKokeile uudestaan!'`, { replyMarkup, ask: 'linjatunnus' });
    }

    // Tekee elementin johon talletetaan linjakoodeihin tarvittavan datan
    var element = {};
    element.userId = chatId
    element.numero = numerot
    element.koodit = codet
    linjaVarasto.push({ element })

    var nappaimisto = chunkArray(nappaimistoVaihtoehdot, 4)
    var replyMarkup = bot.keyboard(nappaimisto, { resize: true })
    // Lähettää vietin ja näppäimistön
    bot.sendMessage(chatId, `Määränpäät linjalle ${linjatunnus}:\n\n${maaranpaalista}\nValitse määränpää näppäimistöstä!`, { replyMarkup, ask: 'linjavalinta' })
    return console.info(" Määränpäät lähetetty")
  })
  .catch(err => {
    console.error(" GraphQL error")
    console.log(err)
    return bot.sendMessage(chatId, `Ongelma pyynnössä. Kokeile uudestaan!`)
  })
}

bot.on('ask.linjavalinta', msg => {
  const valinta = msg.text;
  const chatId = msg.chat.id

  // Hakee linjaVaraston
  var varasto = jp.query(linjaVarasto, '$..element')
  // Hakee linjaVarastosta tarvittavat tiedot
  var userId = jp.query(varasto, '$..userId')
  var koodit = jp.query(varasto, '$..koodit.*')
  var valintaNumerot = jp.query(varasto, '$..numero.*')

  // Jos valinnassa on kauttaviiva, sovellus poistaa linjaVarastosta tiedot
  if (valinta.includes("/")) {
    // Poistaa linjaVarastosta user id:n perusteella
    for (let i = 0; i < userId.length; i++  ) {
      let koodi = koodit[i]

      if (userId[i] == chatId) {
        // Poistaa linjaVarastosta datan
        linjaVarasto.splice(i, 1)
        console.info(" Ei vastattu kysymykseen.")
      }
    }
  } else {
    // Action typing
    bot.sendAction(msg.from.id, 'typing')
    // Jokaiselle userId:lle
    for (let i = 0; i < userId.length; i++  ) {
      var del = i;
      if (userId[i] == chatId) {
        // console.log(userId[i])
        for (let x = 0; x < valintaNumerot.length; x++  ) {
          valintaNumero = valintaNumerot[x]
          code = koodit[x]
          if (valintaNumero == valinta) {
            // Element tallennetaan maaranpaaVarastoon seuraavaa vaihetta varten.
            var element = {};
            element.id = chatId
            element.koodi = code
            maaranpaaVarasto.push({ element })
            // Poistaa linjaVarastosta tiedot
            linjaVarasto.splice(del, 1)

            // Kutsuu pysäkkihaku funktioon
            return pysakkihaku(chatId, code)

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
  }`

  return request(digiAPI, query)
  .then(function (data) {
    // vastaus = JSON.stringify(data)
    stopsHaku = jp.query(data, '$..stops')
    pysakkinimet = jp.query(stopsHaku, '$..name')
    pysakkikoodit = jp.query(stopsHaku, '$..code')
    // Tekee arrayt
    var pysakkikooditArray = [];
    var kaikkiPysakitArray = [];

    // Jokaiselle pysäkkimelle tallettaa arrayheihin dataa
    for (let i = 0; i < pysakkinimet.length; i++  ) {
      pysakkikooditArray.push(pysakkikoodit[i])
      kaikkiPysakitArray.push(pysakkinimet[i])
    }
    // Tallentaa pysakit objektiin pysäkkien nimet ja koodit
    var element = {
      id: chatId,
      pysakitJaKoodit: {
        stopNames: pysakkinimet,
        stopCodes: pysakkikoodit
      }
    };
    pysakit.push({ element })

    // Uusi näppäimistö
    var nappaimisto = chunkArray(kaikkiPysakitArray, 3);
    let replyMarkup = bot.keyboard(nappaimisto, { resize: true });
    // Lähettää pysäkkivaihtoehdot käyttäjälle
    bot.sendMessage(chatId, 'Valitse pysäkki näppäimistöstä', { replyMarkup, ask: 'pysakkivalinta' });
    return console.info(" Kysytty pysäkkkivalintaa")
  })
}

bot.on('ask.pysakkivalinta', msg => {
  const valinta = msg.text;
  const chatId = msg.chat.id
  // Typing action
  bot.sendAction(msg.from.id, 'typing')
  return aikataulut(chatId, valinta);
});

function aikataulut(chatId, valinta) {
  // Datan haku maaranpaaVarastosta
  var element = jp.query(maaranpaaVarasto, '$..element')
  var userId = jp.query(element, '$..id')
  var linjanKoodit = jp.query(element, '$..koodi')
  // console.log(linjanKoodi)

  // Datan haku pysakit
  var pysakitElement = jp.query(pysakit, '$..element')
  var pysakitUserId = jp.query(pysakitElement, '$..id')
  var pysakitJaKoodit = jp.query(pysakitElement, '$..pysakitJaKoodit')

  // Jos valinnassa "/" sovellus poistaa pysakeista ja linjakoodeista tiedot
  if (valinta.includes('/')) {
    // Poistaa valinnoista tallennetun datan
    for (let i = 0; i < userId.length; i++  ) {
      // Kun chat id matchaa
      if (userId[i] == chatId) {
        // Poistaa valinnoista datan
        maaranpaaVarasto.splice(i, 1)
        pysakit.splice(i, 1)
        return console.info(" Ei vastattu kysymykseen.")
      }
    }
  }
  for (let i = 0; i < userId.length; i++  ) {
    if (userId[i] == chatId) {
      linjanKoodi = linjanKoodit[i]
      for (let y = 0; y < pysakitUserId.length; y++  ) {
        if (pysakitUserId[y] == chatId) {
          var pysakitJaKooditForId = pysakitJaKoodit[y]
          var pysakinKoodit = pysakitJaKooditForId.stopCodes
          var pysakinNimet = pysakitJaKooditForId.stopNames
          for (let x = 0; x < pysakinNimet.length; x++  ) {
            pysakinKoodi = pysakinKoodit[x]
            if (pysakinNimet[x] == valinta) {
              // Pysäyttää loopin
              break;
            }
          }
        }
      }
    }
  }

  console.log('[debug]  Pysäkin koodi: ' + pysakinKoodi + ' - Linjan koodi: ' +linjanKoodi)
  //Hakulause

  const query = `{
    stops(name: "${pysakinKoodi}") {
      platformCode
      name
      code
      zoneId
      stopTimesForPattern(id:"${linjanKoodi}",numberOfDepartures: 10, omitCanceled: false) {
        realtimeDeparture
        realtimeState
        pickupType
        headsign
        trip {
          route{
            shortName
            alerts {
              alertDescriptionText
            }
          }
        }
      }
    }
  }`

  return request(digiAPI, query)
  .then(function (data) {
lahtoHandler(data, chatId, valinta)
  })
}
function lahtoHandler(data,chatId, valinta) {
  var asetus = 2;
  var lahdotPysakilta = lahtoListaus(data, asetus);

        bot.sendMessage(chatId, lahdotPysakilta, { ask: 'pysakkivalinta' })

}
