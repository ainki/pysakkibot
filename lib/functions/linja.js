// linja.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
var muuttujia = require('../flow/muutujia');
var admin = require('./admin');
const replyMarkup = require('../flow/nappaimisto')

var digiAPI = muuttujia.digiAPI;

let linjakoodit = [];
let linjakoodit2 = [];

// ATM aika sotku. Siivotaan myöhemmin

function linja(chatId, text) {
    //Jos saadaan vain /linja, kysytään ask linjatunnuksella linjaa
    if (text == '/linja') {
        console.log("[info] Kysytty linjaa.")
        return bot.sendMessage(chatId, 'Anna linjan tunnus 😄', { replyMarkup: 'hide', ask: 'linjatunnus' }).then(re => { })
    } else { //Muuten mennään suoraan maaranpaat funktioon
        console.log("[info] Hetkinen...")
        return bot.sendMessage(chatId, `Hetkinen...`).then(re => {
            //Poistaa "/linja " tekstin
            text = text.replace('/linja ', '');
            //Kutuu funktion
            maaranpaat(chatId, re.message_id, text);
        })
    }
}

module.exports = linja;

bot.on('ask.linjatunnus', msg => {
    const valinta = msg.text;

    // Tähän komennot joita jotka ei tee hakua
    if (valinta == "/start" || valinta == "/hide" || valinta == undefined || valinta.includes("/hae") || valinta == "/help" || valinta == "/menu" || valinta.includes("/admin")) {
        //Älä tee mitään
    } else {

        bot.sendMessage(msg.from.id, 'Haetaan määränpäitä...').then(re => {
            console.log("[info] Haetaan määränpäät...")

            return maaranpaat(msg.from.id, re.message_id, valinta);
        })
    }
});



function maaranpaat(chatId, messageId, viesti) {

    //Hakulause
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
            var nappaimisto = []
            var vaihtoehdot = []
            //Datan haku kyselyn vastauksesta
            var shortNames = jp.query(data, '$..shortName')
            var patterns = jp.query(data, '$..patterns')

            //Eritellään kaikki 
            for (i = 0; i < shortNames.length; i += 1) {
                //Linjatunnus ja pattterni
                var linjatunnus = shortNames[i];
                var pattern = patterns[i];

                //Vain haettu tunnus kelpaa
                if (linjatunnus == viesti) {
                    //Hakee patternista maääränpäät
                    var maaranpaat = jp.query(pattern, '$..headsign')
                    var code = jp.query(pattern, '$..code')

                    //Tallentaa linjakoodeihin id:n ja määränpäät.

                    //Jokaiselle määränpäälle
                    for (i = 0; i < maaranpaat.length; i += 1) {
                        var maaranpaa = maaranpaat[i]

                        //Lisää dataaa arraylisteihin
                        nappaimisto.push(maaranpaa)
                        vaihtoehdot.push(maaranpaa, code)


                        //Määrnänpäät siististi muuttujaan viestiä varten
                        var maaranpaalista
                        if (maaranpaalista == undefined) {
                            maaranpaalista = maaranpaa + "\n"
                        } else {
                            maaranpaalista = maaranpaalista + maaranpaa
                        }
                    }
                } else {
                    //DO NOTHING
                }
            }

            var element = {};

            element.id = chatId
            element.maaranpaat = maaranpaat
            element.koodit = code
            linjakoodit.push({ element })
            console.log("Linjakoodit:")
            console.log(linjakoodit)

            //Näppäimistö jaetaan kahteen riviin
            nappaimisto2 = nappaimisto.splice(0, Math.ceil(nappaimisto.length / 2));
            //Näppäimistön alaosa
            var nappaimistoAla1 = [bot.button('/hae'), bot.button('location', 'Sijaintisi mukaan 📍')]
            //Rakennetaan nappaimisto
            let replyMarkup = bot.keyboard([nappaimisto2, nappaimisto, nappaimistoAla1], { resize: true });
            //console.log(maaranpaalista)

            bot.editMessageText({ chatId, messageId }, `Määränpäät linjalle ${linjatunnus}:\n\n${maaranpaalista}`);
            bot.sendMessage(chatId, `Valitse määränpää näppäimistä!`, { replyMarkup, ask: 'linjavalinta' })
            return console.log("[Info] Määränpäät lähetetty")
        })
}

bot.on('ask.linjavalinta', msg => {
    const valinta = msg.text;
    const chatId = msg.chat.id
    //console.log("Valinta: "+valinta)

    if (valinta == "/start" || valinta == "/hide" || valinta == undefined || valinta.includes("/hae") || valinta == "/help" || valinta == "/menu" || valinta.includes("/admin")) {
        //Älä tee mitään
        //Lisää entisen linjakoodien poisto
    } else {
        //Tää on sit vitun sotku et älä ees yritä ymmärtää...
        var element = jp.query(linjakoodit, '$..element')
        var iideet = jp.query(element, '$..id')
        var koodit = jp.query(element, '$..koodit')
        console.log(koodit)
        var headsignit = jp.query(element, '$..maaranpaat')

        for (i = 0; i < iideet.length; i += 1) {
            var del = i;
            if (iideet[i] == chatId) {
                headsign = headsignit[i]
                koodi = koodit[i]
                for (i = 0; i < headsign.length; i += 1) {
                    maaranpaa = headsign[i]
                    code = koodi[i]
                    if (maaranpaa == valinta) {
                        bot.sendMessage(chatId, `Määränpää: ${maaranpaa} ja linjan koodi: ${code}`)
                        // bot.sendMessage(chatId, `Pysäkkejä haetaan...`)
                        console.log("Succ: " + maaranpaa + " - " + code)
                        // linjakoodit.splice(del, 1)
                        console.log(linjakoodit)
                        return pysakkihaku(chatId, code)

                    } else {
                        console.log("Err headsign")
                    }

                }
            } else {
                console.log("Err chat id")
                //do nothing
            }

        }

    }
})

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
            stopnames = jp.query(stopshaku, '$..name')
            codes = jp.query(stopshaku, '$..code')
            stops = []
            var nappaimisto = [];
            for (i = 0; i < stopnames.length; i += 1) {
                stop = stopnames[i]
                stops.push(stop)
                console.log
                // nappaimisto.push([{stop}],)
            }

            // nappaimisto = JSON.stringify(nappaimisto)
            // console.log(stops)
            // console.log(nappaimisto)
            var nappaimisto = stops;


            nappaimisto2 = nappaimisto.splice(0, Math.ceil(nappaimisto.length / 2));
            nappaimisto4 = nappaimisto2.splice(0, Math.ceil(nappaimisto.length / 2));
            nappaimisto3 = nappaimisto.splice(0, Math.ceil(nappaimisto.length / 2));
            // var nappaimistoAla2 = [bot.button('<<'), bot.button('>>')]
            var nappaimistoAla1 = [bot.button('/hae'), bot.button('/linja'), bot.button('location', 'Sijaintisi mukaan 📍')]
            // console.log(nappaimisto)
            // console.log(nappaimistoAla1)
            // let replyMarkup = bot.keyboard([nappaimisto,nappaimistoAla1], { resize: true });
            let replyMarkup = bot.keyboard([nappaimisto4, nappaimisto2, nappaimisto3, nappaimisto, nappaimistoAla1], { resize: true });

            return bot.sendMessage(chatId, 'Pysäkit:\n\n' + JSON.stringify(stops), { replyMarkup, ask: 'pysakkivalinta' })

        })
}

bot.on('ask.pysakkivalinta', msg => {
    const valinta = msg.text;
    const chatId = msg.chat.id

    if (valinta == '/linja') {
        //Do nothing
    } else {

        //Tää on sit vitun sotku et älä ees yritä ymmärtää...
        var element = jp.query(linjakoodit, '$..element')
        var iideet = jp.query(element, '$..id')
        var koodit = jp.query(element, '$..koodit')

        for (i = 0; i < iideet.length; i += 1) {
            koodi = koodit[i]

            if (iideet[i] == chatId) {
                var element = {};

                element.id = chatId
                element.koodi = maaranpaat
                element.pysakki = valinta
                linjakoodit2.push({ element })

                console.log("Poisto")
                console.log(koodi)
            }
        }
        console.log(valinta)
    }

})