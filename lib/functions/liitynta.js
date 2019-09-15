const bot = require('../../bot');
const {request} = require('graphql-request');
var jp = require('jsonpath');
var muuttujia = require('../flow/muutujia');
var lahtoListaus = require('./lahtoListaus');
const chunkArray = require('./chunkArray');
const fs = require('fs');

//muuttujat
var digiAPI = muuttujia.digiAPI;
let kooditJaNimet = {liityntalista: [], lastUpdated: null};


function liitynta(chatId, viesti) {
    // Jos viesti on pelkkä '/liitynta', botti kysyy liitynnän koodia
    if (viesti === "/liitynta") {
        bot.sendMessage(chatId, 'Anna liitynnän koodi tai nimi.', {replyMarkup: 'hide', ask: 'liityntakoodi'});
        return console.info(' Kysytty liitynnän koodia.');
    } else {
        // Jos viesti sisältää muutakin kuin '/liitynta', botti menee suoraan nimiHakufunktioon
        viesti.includes("/liitynta") ? viesti = viesti.replace("/liitynta", "").trim() : viesti = viesti.replace("/as", "").trim();

        // Kutsuu funktiota
        return tarkistaKoodi(chatId, viesti);

    }
}
async function haeliitynnat() {
    //jos liityntalista on tyhjä haetaan lista tiedostosta
    if (kooditJaNimet.liityntalista.length === 0) {
        let haettuJSON = await haeJSON();
        if (haettuJSON !== null) {
            //jos tiedosto ei tyhjä eikä viallinen
            kooditJaNimet = haettuJSON;
        }
    }

    //viimeksi päivitetty unixaikana
    let lastUpdated = Math.round(new Date(kooditJaNimet.lastUpdated).getTime())
    //viimeksi päivitetty + vuorokausi
    const oneDayOld = lastUpdated + 86400000
    //tämänhetkinen unixaika
    let nyt = (new Date).getTime();
    if (kooditJaNimet.liityntalista.length !== 0 && nyt < oneDayOld) {
        //jos liityntalista ei ole tyhjä eikä lista ole vanhentunut
        console.log("ei päivitystä");
        return kooditJaNimet;
    } else {
        //jos jompikumpi on
        console.log("päivitys");
        const querynimiHaku = `{
      carParks {
        name
        carParkId
      }
    }`
        return request(digiAPI, querynimiHaku)
                .then(function (data) {
                    //Haetaan kaikki liitynnat (nimet ja koodit jos ei olla jo haettu)

                    var carParksName = jp.query(data, '$..name')
                    var carParksId = jp.query(data, '$..carParkId')

                    const carParksNameArr = Array.from(carParksName);
                    const carParksIdArr = Array.from(carParksId)

                    // tyhjennetään liityntalista ja annetaan sille uusi aikaleima
                    kooditJaNimet = {liityntalista: [], lastUpdated: new Date()};
                    for (var i = 0; i < carParksNameArr.length; i++) {
                        //lisätään liitynnat listaan
                        kooditJaNimet.liityntalista.push({id: carParksIdArr[i], name: carParksNameArr[i]})
                    }
                    //muutetaan JSONiksi
                    var json = JSON.stringify(kooditJaNimet);
                    fs.writeFile('liitynnat.json', json, (err) => {
                        if (err) {
                            throw err
                        } else {
                            //jos ei ole erroreita liitynnat tallennetaan
                            console.log('Tallennetaan liitynnat');
                        }
                    });
                    return kooditJaNimet;
                })
                .catch(function (error) {
                    //jos Tallennusvirhe
                    console.error("Tallennusvirhe.");
                })
    }
}
async function nimiHaku(chatId, viesti) {
    //haetaan liitynnat
    kooditJaNimet = await haeliitynnat();
    viesti = viesti.toLowerCase();

    let viestiListaAlku = [];
    let objViestiListaAlku = [];
    let nappaimistoListaAlku = [];
    let viestiLista = [];
    let objViestiLista = [];
    let nappaimistoLista = [];
    let loyty = false;

//sortataan akkosjärjestykseen
kooditJaNimet.liityntalista.sort((a, b) => {
var nameA = a.name.toUpperCase(); // ignore upper and lowercase
var nameB = b.name.toUpperCase(); // ignore upper and lowercase
if (nameA < nameB) {
return -1;
}
if (nameA > nameB) {
return 1;
}

// names must be equal
return 0;
});
 //Haetaan kysyttyä liityntaa arraysta
    for (var i = 0; i < kooditJaNimet.liityntalista.length; i++) {

        //jos liityntalistalta löytyy haettu liitynta
        if (kooditJaNimet.liityntalista[i].name.toLowerCase() === viesti) {
            // jos löytyy
            loyty = true;
            liityntaHaku(chatId, kooditJaNimet.liityntalista[i].id);
            break;
        } else {
            //jos ei
            loyty = false;
        }

        //samankaltaiset liitynnat, mitä haettiin
        //splitataan liitynnät välilyönillä nii voi löytää niitki jos on joku turha sana siin ees
        for (var x = 0; x < kooditJaNimet.liityntalista[i].name.split(" ").length; x++) {
            if (kooditJaNimet.liityntalista[i].name.split(" ")[x].slice(0, viesti.length).toLowerCase() === viesti) {
                if (x === 0) {

                    viestiListaAlku.push(kooditJaNimet.liityntalista[i].name + " " + kooditJaNimet.liityntalista[i].id + "\n");
                    objViestiListaAlku.push({id: kooditJaNimet.liityntalista[i].id, name: kooditJaNimet.liityntalista[i].name});
                    nappaimistoListaAlku.push(kooditJaNimet.liityntalista[i].id);
                    break;
                } else {

                    viestiLista.push(kooditJaNimet.liityntalista[i].name + " " + kooditJaNimet.liityntalista[i].id + "\n");
                    objViestiLista.push({id: kooditJaNimet.liityntalista[i].id, name: kooditJaNimet.liityntalista[i].name});
                    nappaimistoLista.push(kooditJaNimet.liityntalista[i].id);
                }
            }else if (kooditJaNimet.liityntalista[i].name.slice(0, viesti.length).toLowerCase() === viesti) {

              viestiLista.push(kooditJaNimet.liityntalista[i].name + " " + kooditJaNimet.liityntalista[i].id + "\n");
              objViestiLista.push({id: kooditJaNimet.liityntalista[i].id, name: kooditJaNimet.liityntalista[i].name});
              nappaimistoLista.push(kooditJaNimet.liityntalista[i].id);
              break;
            }
        }
    }

    viestiLista = viestiListaAlku.concat(viestiLista);
    objViestiLista = objViestiListaAlku.concat(objViestiLista);
    nappaimistoLista = nappaimistoListaAlku.concat(nappaimistoLista);
    //jos tietty liitynta löytyi haetaan se
    if (viestiLista.length >= 1) {
        nappaimistoLista = nappaimistoLista.slice(0, 8)
        viestiLista = viestiLista.slice(0, 8)
        viestiLista = viestiLista.toString().replace(/,/g, "");
        //liityntavaihtoehdot
        nappaimisto = chunkArray(nappaimistoLista, 5);
        let replyMarkup = bot.keyboard(nappaimisto, {resize: true});
        bot.sendMessage(chatId, `liityntäpysäköintipaikat: \n${viestiLista}\n`, {replyMarkup, ask: 'liityntakoodi'})
        console.info("vaihtoehdot lähetetty ");
        nappaimisto = undefined;
    } else if (!loyty) {
        //ei löydy
        bot.sendMessage(chatId, 'Ei löydy, anna liitynnän koodi tai nimi', {replyMarkup: 'hide', ask: 'liityntakoodi'})

    }

}

function liityntaHaku(chatId, viesti) {
    // GraphQL query
    const querynimiHaku = `{
    carParks (ids: "${viesti}") {
      carParkId
      name
      spacesAvailable
      maxCapacity
      realtime
      lat
      lon
    }
  }`

    return request(digiAPI, querynimiHaku)
            .then(function (data) {
                // Hakee kyselyn vastauksesta liitynnän tiedot
                var realtime = jp.query(data, '$..realtime')
                var carParks = jp.query(data, '$..carParks')
                var carParksId = jp.query(data, '$..carParkId')
                var carParksName = jp.query(data, '$..name')
                var maxCapacity = jp.query(data, '$..maxCapacity')
                var spacesAvailable = jp.query(data, '$..spacesAvailable')
                var carParksLat = jp.query(data, '$..lat')
                var carParksLon = jp.query(data, '$..lon')


                if (carParks == '') {
                    // Jos liityntaa ei ole olemassa

                    bot.sendMessage(chatId, `liityntäpysäköintipaikkaa ${viesti} ei löydy.\nKokeile uudestaan!`, {ask: 'liityntakoodi'})
                    return console.info(' liityntaa ei löydy.')
                } else {
                    // Jatkaa rakentamalla viestin
                    realtime[0] ? bot.sendMessage(chatId, carParksName + ' - ' + carParksId + '\n\nPaikkoja vapaana: ' + spacesAvailable + '/' + maxCapacity, {ask: 'liityntakoodi'}) : bot.sendMessage(chatId, carParksName + ' - ' + carParksId + '\n\nPaikkoja vapaana: ?/' + maxCapacity, {ask: 'liityntakoodi'})
                    return console.info(' liitynnän tiedot lähetetty.')
                }
            })

}
function haeJSON() {
    //haetaan liityntalista tiedostosta
    return new Promise((resolve, reject) => {
        fs.readFile("liitynnat.json", 'utf8', function (error, data) {
            if (error) {
                console.error("Tiedostoa ei voida lukea");
                if (error.code === 'ENOENT') {
                    console.error('koska tiedostoa ei löydy');
                    return resolve(null);
                } else {
                    console.log("muu syy");
                    return reject(error);
                }

            } else if (data !== "" && data !== null && data !== undefined) {
                console.log("luetaan tiedostoa");
                let output;
                // yritetään muuntaa tiedostosta haettu data objektiksi
                try {
                    output = resolve(JSON.parse(data));
                } catch (e) {
                    //jos epäonnistuu
                    console.error("Virhe JSON:issa");
                    //jos palautetaan tyhjää haetaan liitynnat uudelleen
                    output = resolve(null);
                } finally {
                    return output;
                }

            } else {

                console.log("tyhjä tiedosto liitynnat.json");
                //jos palautetaan tyhjää haetaan liitynnat uudelleen
                return resolve(null);
            }
        })
    });
}
function tarkistaKoodi(chatId, viesti) {
    console.log("tarkistaKoodi");
    // Tarkistaa onko viestissä koodi vai tekstiä
    nollienMaara = viesti.split('0').length - 1;
    if (isNaN(viesti)) {
        //jos viestissä on tekstiä, tehdän nimihaku
        nimiHaku(chatId, viesti);
        return console.info('nimihaku')

        // Jos on numeroita tarkistaa numeron pituuden ja lisää tarvittaessa nollat koodin eteen lisäksi jos koodi on virheellinen turhaa hakua ei tehdä
    }
    if (nollienMaara === viesti.length) {
        // viestissä vain nollia
        console.log(viesti.length, nollienMaara)
        bot.sendMessage(chatId, `liityntäpysäköintipaikkaa ${viesti} ei löydy.\nKokeile uudestaan!`, {ask: 'liityntakoodi'})
        return console.info(' Vain nollia liityntakoodissa.')
    } else if (viesti.length > 4) {
        // viesti on liian pitkä
        console.log(viesti.length, nollienMaara)
        bot.sendMessage(chatId, `liityntäpysäköintipaikkaa ${viesti} ei löydy.\n\nKaupunkipyöräasemien koodit ovat Helsingissä ja Espoossa kolmen numeron pituisia ja Vantaalla neljän numeron pituisia.\nKokeile uudestaan!`, {ask: 'liityntakoodi'})
        return console.info(' Liian pitkä liityntakoodi.')
    } else {
        // Jatkaa liityntaHakuun
        liityntaHaku(chatId, viesti);
    }
}
bot.on('ask.liityntakoodi', msg => {
    const valinta = msg.text;
    const chatId = msg.chat.id
    // Typing
    bot.sendAction(msg.from.id, 'typing')
    if (!isNaN(valinta)) {
        return liitynta(chatId, valinta)
    }
})
module.exports = liitynta;
