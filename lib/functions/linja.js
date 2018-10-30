// linja.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss');
var limit = require('limit-string-length');
var muuttujia = require('../flow/muutujia');
let replyMarkup = require('../flow/nappaimisto')

var digiAPI = muuttujia.digiAPI;

let linjakoodit = [];
let linjakoodit2 = [];
let pysakit = []


function linja(chatId, text) {
    //Jos saadaan vain /linja, kysytään ask linjatunnuksella linjaa
    if (text == '/linja') {
        console.log("[info] Kysytty linjaa.")
        return bot.sendMessage(chatId, 'Anna linjan tunnus 😄', { replyMarkup: 'hide', ask: 'linjatunnus' }).then(re => { })
    } else { //Muuten mennään suoraan maaranpaat funktioon
        bot.sendAction(msg.from.id, 'typing')
        console.log("[info] Etsitään linjaa")
        //Poistaa "/linja " tekstin
        text = text.replace('/linja ', '');
        //Kutuu funktion
        return maaranpaat(chatId, re.message_id, text);
    }
}
// Exporttaa linja funktion index.js:sään
module.exports = linja;


// Kysyy linjatunnusta
bot.on('ask.linjatunnus', msg => {
    const valinta = msg.text.toUpperCase();
    // Tähän komennot joita jotka ei tee hakua
    if (valinta.includes("/")) {
        // Älä tee mitään
    } else {
        // Siirtyy maaranpaat funtioon 
        console.log("[info] Haetaan linjaa")
        bot.sendAction(msg.from.id, 'typing')
        return maaranpaat(msg.from.id, valinta);
    }
});


// maaranpaat funktio
function maaranpaat(chatId, viesti) {

    // graphQL querylause
    const query = `{
        routes(name: "${viesti}") {
          shortName
          longName
          patterns {
            headsign
            code
          }
        }
        }`

    return request(digiAPI, query)
        .then(function (data) {
            // Tekee näppäimistöt ja vaihtoehdot arrayt
            var nappaimisto = []
            var vaihtoehdot = []
            // Hakee queryn vastauksesta tiettyjä arvoja
            var shortNames = jp.query(data, '$..shortName')
            var patterns = jp.query(data, '$..patterns')

            // Eritellään toisistaan
            for (i = 0; i < shortNames.length; i += 1) {
                // Linjatunnus ja pattterni eritellään
                var linjatunnus = shortNames[i];
                var pattern = patterns[i];

                // Vain haettu tunnus kelpaa
                if (linjatunnus == viesti) {
                    // Hakee patternista maääränpäät ja koodin
                    var maaranpaat = jp.query(pattern, '$..headsign')
                    var code = jp.query(pattern, '$..code')

                    //Jokaiselle määränpäälle
                    for (i = 0; i < maaranpaat.length; i += 1) {
                        var maaranpaa = maaranpaat[i]

                        //Lisää dataaa arraylisteihin
                        nappaimisto.push(maaranpaa)
                        vaihtoehdot.push(maaranpaa, code)

                        //Määrnänpäät maaranpaalistaan viestiä varten
                        var maaranpaalista
                        if (maaranpaalista == undefined) {
                            maaranpaalista = maaranpaa + "\n"
                        } else {
                            maaranpaalista = maaranpaalista + maaranpaa
                        }
                    } break
                } else {
                    // Do nothing
                }
            }
            // Jos määränpäälista on tyhjä eli undetifined, sovellus palauttaa ettei linjaa löydy
            if (maaranpaalista == undefined) {
                console.log("[info] Linjaa ei löytynyt")
                let replyMarkup = bot.keyboard([[bot.button('/hae'), bot.button('/linja'), bot.button('location', 'Sijaintisi mukaan 📍')]], { resize: true });
                return bot.sendMessage(chatId, `Linjaa '${viesti}' ei löytynyt.\n\nKokeile uudestaan!'`, { replyMarkup });
            }
            // Tekee elementin johon talletetaan linjakoodeihin tarvittavan datan
            var element = {};
            element.id = chatId
            element.maaranpaat = maaranpaat
            element.koodit = code
            linjakoodit.push({ element })

            //Näppäimistö jaetaan kahteen riviin
            nappaimisto2 = nappaimisto.splice(0, Math.ceil(nappaimisto.length / 2));
            //Näppäimistön alaosa
            var nappaimistoAla1 = [bot.button('/hae'), bot.button('/linja'), bot.button('location', 'Sijaintisi mukaan 📍')]
            //Rakennetaan lopullinen nappaimisto
            let replyMarkup = bot.keyboard([nappaimisto2, nappaimisto, nappaimistoAla1], { resize: true });
            // Lähettää vietin ja näppäimistön
            bot.sendMessage(chatId, `Määränpäät linjalle ${linjatunnus}:\n\n${maaranpaalista}\n\nValitse määränpää näppäimistöstä!`, { replyMarkup, ask: 'linjavalinta' })
            return console.log("[Info] Määränpäät lähetetty")
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
    // Typing
    bot.sendAction(msg.from.id, 'typing')

    //Tää on sit vitun sotku et älä ees yritä ymmärtää...
    var element = jp.query(linjakoodit, '$..element')
    var iideet = jp.query(element, '$..id')
    var koodit = jp.query(element, '$..koodit.*')
    var headsignit = jp.query(element, '$..maaranpaat.*')

    if (valinta.includes("/")) {
        // Poistaa 
        for (i = 0; i < iideet.length; i += 1) {
            koodi = koodit[i]

            if (iideet[i] == chatId) {
                // Poistaa linjakoodit kakkosesta datan
                linjakoodit.splice(i, 1)
                console.log("[info] Ei vastattu kysymykseen")
            }
        }

    } else {
        for (i = 0; i < iideet.length; i += 1) {
            var del = i;
            if (iideet[i] == chatId) {
                for (i = 0; i < headsignit.length; i += 1) {
                    maaranpaa = headsignit[i]
                    code = koodit[i]
                    if (maaranpaa == valinta) {
                        // Element tallennetaan linjakoodit2 seuraavaa vaihetta varten.
                        var element = {};
                        element.id = chatId
                        element.koodi = code
                        linjakoodit2.push({ element })

                        // Poistaa linjakoodit ykkösestä tiedot
                        linjakoodit.splice(del, 1)
                        // Menee pysäkkihaku funktioon
                        return pysakkihaku(chatId, code)
                    } else {
                        console.log("[Error] Linjavalinnassa.")
                        // Älä tee mitään
                    }
                }
            } else {
                // Älä tee mitään
            }
        }
    }
});


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
            stopshaku = jp.query(data, '$..stops')
            pysakkinimet = jp.query(stopshaku, '$..name')
            pysakkikoodit = jp.query(stopshaku, '$..code')
            // Tekee arrayt
            stops = [];
            stops2 = [];
            pysakkikooditarray = [];
            var nappaimisto = [];

            // Jokaiselle pysäkkimelle tallettaa arrayheihin dataa
            for (i = 0; i < pysakkinimet.length; i += 1) {
                pysakkikooditarray.push(pysakkikoodit[i])
                stops.push(pysakkinimet[i])
                stops2.push(pysakkinimet[i])
            }
            // Tallentaa pysakit objektiin pysäkkien nimet ja koodit 
            var element = {};
            element.id = chatId
            element.names = stops2
            element.codes = pysakkikooditarray
            pysakit.push({ element })

            // Näppäimitö on kaikki pysäkit
            var nappaimisto = stops;

            // Väliaikainen ratkaisu näppäimistöä varten. Tehdään uusi versio kakkosessa
            nappaimisto2 = nappaimisto.splice(0, Math.ceil(nappaimisto.length / 2));
            nappaimisto4 = nappaimisto2.splice(0, Math.ceil(nappaimisto.length / 2));
            nappaimisto3 = nappaimisto.splice(0, Math.ceil(nappaimisto.length / 2));
            var nappaimistoAla1 = [bot.button('/hae'), bot.button('/linja'), bot.button('location', 'Sijaintisi mukaan 📍')]
            let replyMarkup = bot.keyboard([nappaimisto4, nappaimisto2, nappaimisto3, nappaimisto, nappaimistoAla1], { resize: true });
            // Lähettää pysäkkivaihtoehdot käyttäjälle
            bot.sendMessage(chatId, 'Valitse pysäkki näppäimistöstä', { replyMarkup, ask: 'pysakkivalinta' });
            return console.log("[info] Kysytty pysäkkkivalintaa")
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

    //  Datan haku linjakoodit2
    var element = jp.query(linjakoodit2, '$..element')
    var iideet = jp.query(element, '$..id')
    var koodit = jp.query(element, '$..koodi')
    // Datan haku pysakit
    var kaikkipysakit = jp.query(pysakit, '$..element')
    var pysakkinimet = jp.query(kaikkipysakit, '$..names.*')
    var pysakkikoodit = jp.query(kaikkipysakit, '$..codes.*')

    // Jos valinnassa "/" sovellus poistaa pysakeista ja linjakoodeista tiedot
    if (valinta.includes("/")) {
        // Poistaa valinnoista tallennetun datan
        for (i = 0; i < iideet.length; i += 1) {
            koodi = koodit[i]
            // Kun chat id matchaa
            if (iideet[i] == chatId) {
                // Poistaa valinnoista datan
                linjakoodit2.splice(i, 1)
                pysakit.splice(i, 1)
                console.log("[info] Ei vastattu kysymykseen")
                return
            }
        }
    } else {
        // Kerää datan ja poistaa datan sen jälkeen
        for (i = 0; i < iideet.length; i += 1) {
            koodi = koodit[i]
            if (iideet[i] == chatId) {
                // Poistaa linjakoodit kakkosesta datan
                linjakoodit2.splice(i, 1)
                pysakit.splice(i, 1)
                // Hakee pysäkkikoodin joka vastaa määränpäätä
                for (i = 0; i < pysakkinimet.length; i += 1) {
                    pysakkikoodi = pysakkikoodit[i]
                    if (pysakkinimet[i] == valinta) {
                        // Pysäyttää loopin
                        break
                    } else {
                        // Älä tee mitään
                    }
                }
                //Hakulause
                const query = `{
                    stops(name: "${pysakkikoodi}") {
                        name
                        code
                        stopTimesForPattern(
                          id:"${koodi}"
                            numberOfDepartures: 10) {
                          realtimeDeparture
                          realtime
                          headsign
                          trip {route{shortName}}
                        }
                        }
                    }`

                return request(digiAPI, query)
                    .then(function (data) {
                        //Datan haku queryn vastauksesta
                        var stopshaku = jp.query(data, '$..stops')
                        var pysakkikoodit = jp.query(stopshaku, '$..code')
                        var stoptimeshaku = jp.query(stopshaku, '$..stopTimesForPattern')
                        var lahtoaikahaku = jp.query(stoptimeshaku, '$..realtimeDeparture')
                        var realtimes = jp.query(stoptimeshaku, '$..realtime')
                        var maaranpaa = jp.query(stopshaku, '$..headsign')
                        var linjatunnus = jp.query(data, '$..shortName')
                        var lahdot;

                        for (i = 0; i < pysakkikoodit.length; i += 1) {
                            var stoptimesif = JSON.stringify(stoptimeshaku[i])
                            // Jos ei lähtöä
                            if (stoptimesif == "[]") {
                                // Do nothing
                            } else {
                                for (i = 0; i < lahtoaikahaku.length; i += 1) {
                                    var linja = linjatunnus[i];
                                    var realtime = realtimes[i]
                                    //Hakee ajan ja muuttaa sen numeroksi
                                    var lahtoaikaNUM = Number(lahtoaikahaku[i])
                                    //Muuntaa ajan sekunneista minuutiksi
                                    var departuretime = TimeFormat.fromS(lahtoaikaNUM, 'hh:mm');
                                    //Limitoi sekunnit pois
                                    var departuretimeshort = limit(departuretime, 5)
                                    //Kellonaikojen korjaus
                                    if (lahtoaikaNUM > 86400) {
                                        var departuretimeshort = departuretimeshort.replace('24:', '00:')
                                    } if (lahtoaikaNUM > 90000) {
                                        var departuretimeshort = departuretimeshort.replace('25:', '01:')
                                    } if (lahtoaikaNUM > 93600) {
                                        var departuretimeshort = departuretimeshort.replace('26:', '02:')
                                    } if (lahtoaikaNUM > 97200) {
                                        var departuretimeshort = departuretimeshort.replace('27:', '03:')
                                    } if (lahtoaikaNUM > 100800) {
                                        var departuretimeshort = departuretimeshort.replace('28:', '04:')
                                    }
                                    //Jos määränpää on tyhjä
                                    if (maaranpaa[i] == null) {
                                        //Älä tee mitään
                                    } else {
                                        //Tarkistaa onko reaaliaikainen vai aikataulun mukainen aika
                                        if (realtime == true) {
                                            //Yhdistää ajan, reaaliaikamerkin, numeron/kirjaimen ja määränpään
                                            var yksittainenlahto = departuretimeshort + "•  " + maaranpaa[i] + "\n";
                                        } else {
                                            //Yhdistää ajan, numeron/kirjaimen ja määränpäänn
                                            var yksittainenlahto = departuretimeshort + "    " + maaranpaa[i] + "\n";
                                        }
                                        //Yhdistää yksittäiset lähdöt viestiä varten
                                        if (lahdot == null) {
                                            lahdot = yksittainenlahto;
                                        } else {
                                            lahdot = lahdot + yksittainenlahto;
                                        }
                                    }
                                }
                                if (lahdot == undefined) {
                                    console.log("[info] Ei lähtöjä")
                                    return bot.sendMessage(chatId, `Ei lähtöjä pysäkiltä.`, { ask: 'pysakkivalinta' });
                                    var lahdot = undefined;
                                } else { //Muuten lähettää viestin ja kysyy pysäkkivalintaa
                                    console.log("[info] Vastaus lähetetty")
                                    return bot.sendMessage(chatId, `Lähdöt pysäkiltä ${valinta} linjalle ${linja}:\n\n${lahdot}`, { replyMarkup });
                                    var lahdot = undefined;
                                }
                            }
                        }
                        return bot.sendMessage(chatId, `Ei lähtöjä pysäkiltä.`, { replyMarkup });
                    })
            }
        }
    }
}
