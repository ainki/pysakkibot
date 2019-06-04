// linja.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath')
let date = require('date-and-time')
var muuttujia = require('../flow/muutujia')
const chunkArray = require('./chunkArray')
var lahtoListaus = require('./lahtoListaus')
// var replyMarkup = require('../flow/nappaimisto')

let linjaVarasto = []
let maaranpaaVarasto = []

var digiAPI = muuttujia.digiAPI;

function linja(chatId, viesti) {
    // Jos saadaan vain /linja, kysytään ask.linjatunnuksella linjaa
    if (viesti === '/linja') {
        console.log('[info]  Kysytään linjaa.')
        return bot.sendMessage(chatId, 'Anna linjan tunnus 😄', { replyMarkup: 'hide', ask: 'linjatunnus' })
    } else {
        bot.sendAction(chatId, 'typing')
        console.log("[info]  Etsitään linjaa")
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
    if (valinta.includes("/")) {
        // Älä tee mitään
    } else {
        bot.sendAction(msg.from.id, 'typing')
        console.log('[info]  Haetaan linjaa')
        // Kutsuu maaranpaat funtion
        return maaranpaat(msg.from.id, valinta);
    }
});


// maaranpaat funktio
function maaranpaat(chatId, viesti) {
    // päivämäärä queryä varten
    let now = new Date();
    var tanaan = date.format(now, 'YYYYMMDD')

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
            var vaihtoehtoNumero = 0
            var maaranpaalista = ''

            // Hakee queryn vastauksesta tiettyjä arvoja
            var shortNames = jp.query(data, '$..shortName')
            var patterns = jp.query(data, '$..patterns')

            // Eritellään toisistaan
            for (i = 0; i < shortNames.length; i += 1) {
                // Linjatunnus ja pattterni eritellään
                var linjatunnus = shortNames[i];
                var pattern = patterns[i];

                // Vain haettu tunnus kelpaa, query palauttaa kaikki tunnukset, jossa sama yhdistelmä (esim jos hakee '146' query palauttaa kaikki '146,146A,146N')
                if (linjatunnus == viesti) {

                    // Hakee patternista maääränpäät, koodin ja päivän tripit
                    var maaranpaat = jp.query(pattern, '$..headsign')
                    var code = jp.query(pattern, '$..code')
                    var tripsForDate = jp.query(pattern, '$..tripsForDate')

                    //Jokaiselle määränpäälle
                    for (i = 0; i < maaranpaat.length; i += 1) {
                        // Jos ei trippejä päivänä
                        if (tripsForDate[i] == '') {
                            var eiTrippeja = 1
                            // Älä tee mitään
                        } else {
                            // Lisää ykkösen jokaista määränpäärä varten
                            vaihtoehtoNumero = vaihtoehtoNumero + 1
                            maaranpaa = maaranpaat[i]

                            //Lisää dataaa näppäimistöön ja vaihtoehtoihin
                            nappaimistoVaihtoehdot.push(JSON.stringify(vaihtoehtoNumero))
                            numerot.push(JSON.stringify(vaihtoehtoNumero))
                            vaihtoehdot.push(JSON.stringify(vaihtoehtoNumero), code)

                            //Määrnänpäät maaranpaalistaan viestiä varten
                            maaranpaalista = maaranpaalista + JSON.stringify(vaihtoehtoNumero) + ' - ' + maaranpaat[i] + '\n'
                        }
                    } break
                } else {
                    // Älä tee mitään
                }
            }
            // Jos linja löytyy, muttei lähtöjä
            if (maaranpaalista == '' && eiTrippeja == 1) {
                console.log("[info]  Ei lähtöjä linjalla")
                return bot.sendMessage(chatId, `Linjalla '${linjatunnus}' ei ole lähtöjä.\n\nEtsi toista?`, { replyMarkup, ask: 'linjatunnus' });
            } else if (maaranpaalista == '') {
                // Jos määränpäälista on tyhjä, sovellus palauttaa ettei linjaa löydy
                console.log("[info]  Linjaa ei löytynyt")
                return bot.sendMessage(chatId, `Linjaa '${viesti}' ei löytynyt.\n\nKokeile uudestaan!'`, { replyMarkup, ask: 'linjatunnus' });
            }

            // Tekee elementin johon talletetaan linjakoodeihin tarvittavan datan
            var element = {};
            element.userId = chatId
            element.numero = numerot
            element.koodit = code
            linjaVarasto.push({ element })

            var nappaimisto = chunkArray(nappaimistoVaihtoehdot, 4)
            var replyMarkup = bot.keyboard(nappaimisto, { resize: true })
            // Lähettää vietin ja näppäimistön
            bot.sendMessage(chatId, `Määränpäät linjalle ${linjatunnus}:\n\n${maaranpaalista}\nValitse määränpää näppäimistöstä!`, { replyMarkup, ask: 'linjavalinta' })
            return console.log("[Info]  Määränpäät lähetetty")
        })
        .catch(err => {
            console.log("[ERROR] GraphQL error")
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
        for (i = 0; i < userId.length; i += 1) {
            koodi = koodit[i]

            if (userId[i] == chatId) {
                // Poistaa linjaVarastosta datan
                linjaVarasto.splice(i, 1)
                console.log("[info]  Ei vastattu kysymykseen.")
            }
        }
    } else {
        // Action typing
        bot.sendAction(msg.from.id, 'typing')
        // Jokaiselle userId:lle
        for (i = 0; i < userId.length; i += 1) {
            var del = i;
            if (userId[i] == chatId) {
                // console.log(userId[i])
                for (x = 0; x < valintaNumerot.length; x += 1) {
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
                    } else {
                        // Älä tee mitään
                    }
                }
            } else {
                // Älä tee mitään
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
            for (i = 0; i < pysakkinimet.length; i += 1) {
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
            return console.log("[info]  Kysytty pysäkkkivalintaa")
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

    var linjanKoodi

    // Datan haku pysakit
    var pysakitElement = jp.query(pysakit, '$..element')
    var pysakitUserId = jp.query(pysakitElement, '$..id')
    var pysakitJaKoodit = jp.query(pysakitElement, '$..pysakitJaKoodit')

    // Jos valinnassa "/" sovellus poistaa pysakeista ja linjakoodeista tiedot
    if (valinta.includes('/')) {
        // Poistaa valinnoista tallennetun datan
        for (i = 0; i < userId.length; i += 1) {
            // Kun chat id matchaa
            if (userId[i] == chatId) {
                // Poistaa valinnoista datan
                maaranpaaVarasto.splice(i, 1)
                pysakit.splice(i, 1)
                return console.log("[info]  Ei vastattu kysymykseen.")
            }
        }
    }
    for (i = 0; i < userId.length; i += 1) {
        if (userId[i] == chatId) {
            linjanKoodi = linjanKoodit[i]
            for (y = 0; y < pysakitUserId.length; y += 1) {
                if (pysakitUserId[y] == chatId) {
                    var pysakitJaKooditForId = pysakitJaKoodit[y]
                    var pysakinKoodit = pysakitJaKooditForId.stopCodes
                    var pysakinNimet = pysakitJaKooditForId.stopNames
                    for (x = 0; x < pysakinNimet.length; x += 1) {
                        pysakinKoodi = pysakinKoodit[x]
                        if (pysakinNimet[x] == valinta) {
                            // Pysäyttää loopin
                            break
                        }
                    }
                }
            }
        }
    }

    console.log('[debug]  Pysäkin koodi:' + pysakinKoodi + ' - Linjan koodi: ' +linjanKoodi)
    //Hakulause
    const query = `{
    stops(name: "${pysakinKoodi}") {
        platformCode
        name
        code
        stopTimesForPattern(id:"${linjanKoodi}",numberOfDepartures: 10) {
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
            var asetus = 2
            var lahdotPysakilta = lahtoListaus(data, asetus);
            bot.sendMessage(chatId, lahdotPysakilta, { ask: 'pysakkivalinta' })
        })
}
