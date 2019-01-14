// hae.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
var muuttujia = require('../flow/muutujia');

var digiAPI = muuttujia.digiAPI;
var tyhjavastaus = muuttujia.tyhjavastaus;

//Numerocheck
var hasNumber = /\d/;

// Hae komento
function hae(chatId, viesti) {
    //Jos tkesti on pelkästään /hae, ohjelma kysyy pysäkin nimeä tai koodia erikseen
    if (viesti == '/hae') {
        console.log("[info] Kysytty pysäkkiä.")
        return bot.sendMessage(chatId, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysakkinimi' }).then(re => { })
    } else {
        if (hasNumber.test(viesti) == true) {
            console.log("[info] Haetaan aikatauluja...")
            //Lähetetään actioni
            bot.sendAction(chatId, 'typing')
            viesti = viesti.replace('/hae ', '');
            viesti = capitalize(viesti);
            // Funktioon siirtyminen
            return valintafunktio(chatId, viesti, 1);
        } else {
            //Muuten etsii suoraan. Heittää viestin hetkinen ja menee pysäkkihaku funktioon
            console.log("[info] Etsitään pysäkkiä")
            bot.sendAction(chatId, 'typing')
            //Poistaa "/hae " tekstin
            viesti = viesti.replace('/hae ', '');
            console.log(viesti)
            //Kutuu funktion
            pysakkihaku(chatId, viesti);
        }
    }
}
//Exporttaa tän indexiin
module.exports = hae;

//Pysäkkinimi kysymys
bot.on('ask.pysakkinimi', msg => {
    let text = msg.text;

    //Komennot jotka ei tee pysökkihakua
    if (text == "/start" || text == undefined || text.includes("/hae") || text == "/help" || text.includes("/linja") || text == "/menu" || text == "/about") {
        //Keskeytetään kysymys
    } else {
        if (hasNumber.test(text) == true) {
            text = capitalize(text);
            console.log("[info] Haetaan aikatauluja...")
            //Lähetetään actioni
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
                //Erittelee pysäkit ja yhdistää koodit
                for (i = 0; i < pysakit.length; i += 1) {
                    koodi = koodit[i];
                    //Yhdistää muuttujaan valinnat
                    var pk = "/" + koodi + " " + pysakit[i] + " - " + koodit[i] + "\n"
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
    if (valinta == "/start" || valinta == undefined || valinta.includes("/hae") || valinta == "/help" || valinta.includes("/linja") || valinta == "/menu" || valinta == "/about") {
        //Keskeytetään kysymys
    } else {
        //Jos sisältää "/" mennään suoraan valintafunktioon
        if (valinta.includes("/")) {
            console.log("[info] Haetaan aikatauluja...")
            bot.sendAction(msg.from.id, 'typing')
            return valintafunktio(msg.from.id, valinta);
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
                headsign
                trip {
                  pattern {
                    route {
                      shortName
                    }
                  }
                }
              }
            }
          }`


    //Hakulauseen suoritus
    return request(digiAPI, queryGetStopTimesForStops)
        .then(function (data) {
            //Datan haku queryn vastauksesta
            var stopsHaku = jp.query(data, '$..stops')
            var stoptimesHaku = jp.query(stopsHaku, '$..stoptimesWithoutPatterns')
            var lahtoHaku = jp.query(data, '$..realtimeDeparture')
            var realtimeTila = jp.query(data, '$..realtimeState')
            var pickupType = jp.query(data, '$..pickupType')

            //Eritellään vastaukset
            for (i = 0; i < lahtoHaku.length; i += 1) {
                var stoptimesif = JSON.stringify(stoptimesHaku[i])
                //Jos ei lähtöä
                if (stoptimesif == "[]") {
                    //Do nothing
                } else {
                    //Hakee datasta nimen ja koodin
                    var pysakki = jp.query(stopsHaku, '$..name')
                    var koodi = jp.query(stopsHaku, '$..code')

                    //Hakee ajan ja muuttaa sen numeroksi
                    var lahtoaikaNUM = Number(lahtoHaku[i])
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
                    //Hakee linjan numeron tai kirjaimen
                    var linjatunnus = jp.query(data, '$..shortName')
                    //Hakee määränpään
                    var maaranpaat = jp.query(stopsHaku, '$..headsign')

                    // Korjataan jo määränpää on null
                    if (maaranpaat[i] == null) {
                        maaranpaa = ""
                    } else {
                        maaranpaa = maaranpaat[i]
                    }

                    // Yhdistää tiedot yhteen
                    // Jos lähtö on suunniteltu
                    if (realtimeTila[i] == 'SCHEDULED') {
                        // Jos linjalla
                        if (pickupType[i] == 'SCHEDULED') {
                            var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjatunnus[i] + " " + maaranpaa + "\n";
                        } else if (pickupType[i] == 'NONE') {
                            var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjatunnus[i] + " ⇥ Päätepysäkki\n";
                        }
                        // Jos lähtö on reaaliaikainen
                    } else if (realtimeTila[i] == 'UPDATED') {
                        if (pickupType[i] == 'SCHEDULED') {
                            var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjatunnus[i] + " " + maaranpaa + "\n";
                        } else if (pickupType[i] == 'NONE') {
                            var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjatunnus[i] + " ⇥ Päätepysäkki\n";
                        }
                        // Jos peruttu vuoro
                    } else if (realtimeTila[i] == 'CANCELED') {
                        var yksittainenlahto = departuretimeshort + "×‏‏‎   " + linjatunnus[i] + " PERUTTU\n";
                    } else if (realtimeTila[i] == 'MODIFIED') {
                        var yksittainenlahto = departuretimeshort + "!‏‏‎   " + linjatunnus[i] + " " + maaranpaa + "\n";
                    } 
                    // Muuten
                    else {
                        // Älä tee mitään
                    }
                    
                    // Yhdistää yksittäiset lähdöt viestiä varten
                    if (lahdot == null) {
                        lahdot = yksittainenlahto;
                    } else {
                        lahdot = lahdot + yksittainenlahto;
                    }
                }
            }
            //Viestin lähetys
            //Jos ei lähtöjä pysäkiltä
            if (lahdot == undefined) {
                console.log("[info] Ei lähtöjä")
                return bot.sendMessage(chatId, `Ei lähtöjä pysäkiltä.`, { ask: 'askpysakkivalinta' })
                var lahdot = undefined;
            } else { //Muuten lähettää viestin ja kysyy uudelleen pysäkkivalintaa
                if (asetus == 1) {
                    var valintaArr = [];
                    valintaArr.push("/" + valinta);
                    var nappaimisto = chunkArray(valintaArr, 1);
                    let replyMarkup = bot.keyboard(nappaimisto, { resize: true });
                    console.log("[info] Lähdöt lähetetty")
                    return bot.sendMessage(chatId, `Lähdöt pysäkiltä ${pysakki} - ${koodi}:\n\n${lahdot}`, { replyMarkup, ask: 'askpysakkivalinta' });
                    var lahdot = undefined;
                    var nappaimisto = undefined;
                } else {
                    console.log("[info] Lähdöt lähetetty")
                    return bot.sendMessage(chatId, `Lähdöt pysäkiltä ${pysakki} - ${koodi}:\n\n${lahdot}`, { ask: 'askpysakkivalinta' });
                    var lahdot = undefined;
                }
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

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}