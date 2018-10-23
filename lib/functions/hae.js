// hae.js

const bot = require('../../bot')
const { request } = require('graphql-request')
//const digiAPI = require('../flow/muutujia')
const tyhjavastaus = require('../flow/muutujia')
var jp = require('jsonpath');

const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';

// Hae komento
function hae(chatId, viesti) {
    //Jos tkesti on pelkästään /hae, ohjelma kysyy pysäkin nimeä tai koodia erikseen
    if (viesti == '/hae') {
        console.log("[info] Kysytty pysäkkiä.")
        return bot.sendMessage(chatId, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysakkinimi' }).then(re => { })
    } else { 
        //Muuten etsii suoraan. Heittää viestin hetkinen ja menee pysäkkihaku funktioon
        console.log("[info] Hetkinen...")
        return bot.sendMessage(chatId, `Hetkinen...`).then(re => {
            //Poistaa "/hae " tekstin
            viesti = viesti.replace('/hae ', '');
            //Kutuu funktion
            pysakkihaku(chatId, re.message_id, viesti);
        })
    }
}
//Exporttaa tän indexiin
module.exports = hae;

//Funktio pysäkkihaku
function pysakkihaku(chatId, messageId, viesti) {
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
                //Lähettää tyhjän viestin joka tekee kysymyksen
                bot.sendMessage(chatId, ``, { ask: 'pysakkinimi' }).catch(error => console.log('[info] Pysäkkejä ei löytynyt!'));
                //Editoi viestin
                return bot.editMessageText({ chatId, messageId }, `Pysäkkiä "${viesti}" ei valitettavasti löydy.\nKokeile uudestaan 😄`, { ask: 'pysakkinimi' });
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
                        var nappaimisto = []
                        nappaimisto.push("/" + koodi)
                    } else {
                        //Viesti
                        pysakkivalinta = pysakkivalinta += pk;
                        //Näppäimistö
                        nappaimisto.push("/" + koodi)
                    }
                }
                //Näppäimistö jaetaan kahteen riviin
                nappaimisto2 = nappaimisto.splice(0, Math.ceil(nappaimisto.length / 2));
                //Näppäimistön alaosa
                var nappaimistoAla1 = [bot.button('/hae'), bot.button('location', 'Sijaintisi mukaan 📍')]
                //Rakennetaan nappaimisto
                let replyMarkup = bot.keyboard([nappaimisto2, nappaimisto, nappaimistoAla1], { resize: true });

                //Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
                console.log("[info] Valinnat lähetetty!")
                bot.editMessageText({ chatId, messageId }, `Etsit pysäkkiä "${viesti}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${pysakkivalinta}`)
                return bot.sendMessage(chatId, `Voit valita pysäkin myös näppäimistöstä! 😉`, { replyMarkup, ask: 'askpysakkivalinta' })//.catch(error => console.log('[info] Valinnat lähetetty!'));
                //return bot.sendMessage(chatId , `Etsit pysäkkiä "${viesti}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${pysakkivalinta}`, { ask: 'askpysakkivalinta' })
                var pysakkivalinta = undefined;
                var nappaimisto = undefined;
            }
        }
        )
        //Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
        .catch(err => {
            console.log("[ERROR] GraphQL error")
            console.log(err)
            return bot.editMessageText({ chatId, messageId }, `Ongelma pyynnössä. Kokeile uudestaan!`)
        })
}; 