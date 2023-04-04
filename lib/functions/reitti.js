// reitti.js

const bot = require('../../bot');
const {request} = require('graphql-request');
var jp = require('jsonpath');
var muuttujia = require('../flow/muutujia');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var moment = require('moment');
moment.locale('fi-FI');
"use strict";

// Näppäimistö
let kayttajat = [];

let replyMarkup = bot.keyboard([[bot.button('/hae'), bot.button('/reitti'), bot.button('location', 'Sijaintisi mukaan 📍')]], {resize: true});

  var digiAPI = muuttujia.digiAPI;

function reitti(msg, lat, lon, toiminto) {
//tarkistetaan onks kayttajat-arrays
  if (!kayttajat.length || !kayttajat.some(i => i.userId === msg.from.id)) {
    kayttajat.push({userId:msg.from.id, lahtopaikka:null,maaranpaa:null});
  }

    let lahtopaikkaviesti;
    if (toiminto === "L") {
        lahtopaikkaviesti = Object.assign({...msg}, {text: [lat, lon], tyyppi: "sijainti"});

        return lahtopaikkahaku(lahtopaikkaviesti);
    } else if (toiminto === "M") {
        maaranpaaviesti = Object.assign({...msg}, {text: [lat, lon], tyyppi: "sijainti"});
        return maaranpaahaku(maaranpaaviesti);
    }


    if (msg.text.trim() === '/reitti') {
        console.info(' Kysytään lähtöpaikkaa.');
        return bot.sendMessage(msg.from.id, '<b>Reittihaku</b>\nAnna reitin lähtöpaikka!  😃', {replyMarkup: 'hide', ask: 'lahtopaikka', parseMode: 'html'});
    } else {
        const jaettu = msg.text.replace('/reitti', '').trim().split(",");
        //lahtöpaikaks ennen ,
        lahtopaikkaviesti = Object.assign({...msg}, {text: jaettu[0], tyyppi: jaettu.length > 1 ? "kakskomentoo" : "ykskomento"});
        let maaranpaaviesti;
        console.info('Käsitellään reittiä...');
        lahtopaikkahaku(lahtopaikkaviesti);
        if (jaettu[1]) {
            //määränpääks , jälkeen
            maaranpaaviesti = Object.assign({...msg}, {text: jaettu[1], tyyppi: "ykskomento"});
            if (jaettu.length > 2) {
                maaranpaaviesti.lahtoaika = lahtoaikaHandler(jaettu[2]);
            }
            return maaranpaahaku(maaranpaaviesti);
        } else if (maaranpaaviesti) {
            //jos puuttuu
            maaranpaaviesti.text = "";
            return maaranpaahaku(maaranpaaviesti);
        }

    }
}



// Kysyy lähtöpaikan ja määränpään
  bot.on('ask.lahtopaikka', msg => {
      if (msg.text.includes("/")) return tyhjennaArr(msg.from.id);
  if (!kayttajat.length) {
    kayttajat.push({userId:msg.from.id, lahtopaikka:null,maaranpaa:null});
    return lahtopaikkahaku(msg, false);
  }else {
    const index = kayttajat.findIndex(i => i.userId === msg.from.id); // userId:n indeksi
        if (index !== -1 && kayttajat[index].maaranpaa) {
            return lahtopaikkahaku(msg, true);
        }else if (index === -1) {
  kayttajat.push({userId:msg.from.id, lahtopaikka:null,maaranpaa:null});
  return lahtopaikkahaku(msg, false);
}
    if (!msg.text.includes("/") && !msg.text.includes(",") && index !== -1) {
        // Hakee osoitteen koordinaatit
      return lahtopaikkahaku(msg);
    } else if (!msg.text.includes("/") && msg.text.includes(",") && index !== -1) {
          reitti(msg);
    }
    }
});

bot.on('ask.maaranpaa', msg => {
    if (msg.text.includes("/")) {
      return  tyhjennaArr(msg.from.id);
    } else if (msg.text.includes(",") && msg.text.includes(":")) {
        let splitattu = msg.text.trim().split(",");
        msg.lahtoaika = lahtoaikaHandler(splitattu[1]);
        msg.text = splitattu[0];
        maaranpaahaku(msg);

    } else {
        // Hakee osoitteen koordinaatit
        maaranpaahaku(msg);
    }
});

// Functions

function reitinKasittely(msg) {

    // Lähtöpaikka
      const index = kayttajat.findIndex(i => i.userId === msg.from.id);

    const lahtopaikka =  kayttajat[index].lahtopaikka;
        lahtopaikka ? console.info('Lähtöpaikka OK') : console.error("Lähtöpaikka puuttuu!");
    const labelStart = lahtopaikka.label;
    const latStart = lahtopaikka.lat;
    const lonStart = lahtopaikka.lon;


    // Määränpää
    const maaranpaa =  kayttajat[index].maaranpaa;
      maaranpaa ? console.info('Määränpää OK, käsitellään reittiä...') : console.error("Määränpää puuttuu!");
    const labelDest = maaranpaa.label;
    const latDest = maaranpaa.lat;
    const lonDest = maaranpaa.lon;


    let plan;
    const date = moment(msg.lahtoaika).locale("eu").format('L');
    const time = moment(msg.lahtoaika).locale("et").format('LTS');

    plan = msg.lahtoaika ? `plan(from: {lat: ${latStart}, lon: ${lonStart}}, to: {lat: ${latDest}, lon: ${lonDest}},date:"${date}",time:"${time}", numItineraries: 3) {` :
                            `plan(from: {lat: ${latStart}, lon: ${lonStart}}, to: {lat: ${latDest}, lon: ${lonDest}}, numItineraries: 3) {`;
                    const query = `{
                ${plan}
                itineraries {
                  startTime
                  endTime
                  duration
                  walkDistance
                  fares {
                    components {
                      fareId
                    }
                  }
                  legs {
                    startTime
                    endTime
                    mode
                    realTime
                    distance
                    route {
                      shortName
                    }
                    trip {
                      tripHeadsign
                    }
                    to {
                      name
                      stop {
                        code
                        platformCode
                      }
                    }
                  }
                }
              }
            }`;

                    return request(digiAPI, query)
                            .then(data => {
                                // kayttajat.splice(i, 1);
                                return reittienListaus(msg, labelStart, labelDest, data);
                            }).catch(err => {
                        console.error("Ongelma valinnassa");
                        console.error(err);
                        tyhjennaArr(msg.from.id)
                        return bot.sendMessage(msg.from.id, `Ongelma valinnassa. Kokeile uudestaan!`, {ask: 'askhaevalinta'});
                      });

                    }

  function reittienListaus(msg, lahtopaikka, maaranpaa, data) {
    // Tekee viestin yläosan
    var legs = jp.query(data, '$..legs');
    if (!legs.length) {
        // jos ei reittiehdotuksia
        tyhjennaArr(msg.from.id);

        return bot.sendMessage(msg.from.id, "Reittiehdotuksia ei valitettavasti löytynyt lähtöpaikan " + lahtopaikka + " ja määränpään " + maaranpaa + " välille", {ask: 'lahtopaikka',replyMarkup, parseMode: 'html'});
    }
    const ylaosa = msg.lahtoaika ? '<b>Reittiehdotukset\n' + moment(msg.lahtoaika).format("DoMM.YYYY, H:mm") + '</b>\n' + lahtopaikka + '\n' + maaranpaa + '\n\n' : '<b>Reittiehdotukset</b>\n' + lahtopaikka + '\n' + maaranpaa + '\n\n';

    // var duration = jp.query(data, '$..duration');
    let ehdotukset = '';

    for (let i = 0; i < legs.length; i++) {

        var mode = jp.query(legs[i], '$..mode');
        var dist = jp.query(legs[i], '$..distance');

        // reittivaihtoehdon lähtöaika, saapumisaika ja kävelymatkat yhteensä
        const routeStartTime = data.plan.itineraries[i].startTime;
        const routeEndTime = data.plan.itineraries[i].endTime;
        var walkDistance = data.plan.itineraries[i].walkDistance;

        // Walk distancen roundaaminen
        if (walkDistance >= 1000) {
            walkDistance = Math.round(walkDistance / 100) / 10 + "km";
        } else {
            walkDistance = Math.round(walkDistance) + "m";
        }

        // Käytetään matka-ajan laskemiseen
        var mEndTime = moment(routeEndTime);

        let vLegs = '';

        for (let x = 0; x < mode.length; x++) {
            let legHeadsign;
            let legDestination;


            // Legin aloitusaika ja mode
            const legStartTime = data.plan.itineraries[i].legs[x].startTime;
            const legEndTime = data.plan.itineraries[i].legs[x].endTime;
            const mode = data.plan.itineraries[i].legs[x].mode;
            let lait;
            let odotusaika;

            // yritetään hakea laituri
            try {
                lait = data.plan.itineraries[i].legs[x].to.stop.platformCode;
            } catch (e) {
                //jos ei oo otetaan laiturii siit tullu errori kiinni
                // console.error("varmaa turha:", e);
                lait = null;
            }
            //jos odotusaika on yli 4min ja jos ei olla legie alus tai lopus
            if (x>0 && x < data.plan.itineraries[i].legs.length-1 && data.plan.itineraries[i].legs[x+1].mode !== 'WALK' && data.plan.itineraries[i].legs[x+1].startTime - legEndTime >= 240000) odotusaika = odotusaikaHandler(data.plan.itineraries[i].legs[x+1].startTime - legEndTime);

            if (dist[x] >= 1000) {
                dist[x] = Math.round(dist[x] / 100) / 10 + "km";
            } else {
                dist[x] = Math.round(dist[x]) + "m";
            }
            // Jos mode on WALK on walk tkee kävele tekstin jos ei niin ottaa linjan tunnuksen ja linjakilven
            if (mode == 'WALK') {
                legHeadsign = 'Kävele' + " " + dist[x];
            } else {
              legHeadsign = data.plan.itineraries[i].legs[x].route.shortName + ' ' + data.plan.itineraries[i].legs[x].trip.tripHeadsign;
            }
              // Yhden legin määränpään filteröinti
            if (data.plan.itineraries[i].legs[x].to.name == 'Destination') {
                legDestination = 'Määränpää';
                //jos ei oo koodia, jätetää se pois jottei tuu nullii
            } else if (mode === 'WALK' && data.plan.itineraries[i].legs[x].to.stop.code) {

                legDestination = data.plan.itineraries[i].legs[x].to.name + ' ' + data.plan.itineraries[i].legs[x].to.stop.code;
            } else {
                legDestination = data.plan.itineraries[i].legs[x].to.name;
            }

            // Rakentaa yhden legin
            lait ? vLegs += '  ' + moment(legStartTime).format('HH:mm') + '  ' + legHeadsign + ' → ' + legDestination + ' Lait. ' + lait + '\n' : vLegs += '  ' + moment(legStartTime).format('HH:mm') + '  ' + legHeadsign + ' → ' + legDestination + '\n';
            // Lisää yhden legin kaikkiin  legeihin
            //lisäätään odotusaika jos on + sen alotusaika
            if(odotusaika) vLegs += '  ' + moment(legEndTime).format('HH:mm')+"  Odota "+odotusaika+'\n';

        }
        vLegs += '  ' + moment(routeEndTime).format('HH:mm') + '  ' + "Perillä\n";
        // Joka reittivaihtoehdon rakentamien
        ehdotukset += '<b>' + moment(routeStartTime).format('HH:mm') + ' - ' + moment(routeEndTime).format('HH:mm') + ' – 🕑 ' + mEndTime.diff(routeStartTime, 'minutes') + 'min  🚶 ' + walkDistance + '</b>\n' + vLegs + '\n';
    }
    // Lähettää viestin
    tyhjennaArr(msg.from.id);
    return bot.sendMessage(msg.from.id, ylaosa + ehdotukset, {replyMarkup, parseMode: 'html'});
}


// XMLHttpRequests

function httpGet(theUrl) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", theUrl, false); // false for synchronous request
    xmlHttp.setRequestHeader("Content-Type", "application/json; charset=utf-8;");
    xmlHttp.setRequestHeader("digitransit-subscription-key", process.env.digitransitApiKey);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

function lahtopaikkahaku(msg, maaranpaasta) {
    if (msg.tyyppi !== "sijainti") {
        const features = tekstiLabelHandler(msg.text, "L",msg.from.id);
        console.log(features.geometry.coordinates)
        if (features) {
            var [lon, lat] = features.geometry.coordinates;
            var label = features.properties.label;

              // Tallennetaan tiedot
              lisaaKayttajalle("lahtopaikka",label,lat,lon,msg.from.id);
        } else if (msg.tyyppi !== "kakskomentoo") {
            return bot.sendMessage(msg.from.id, 'Lähtöpaikkaa ei löytynyt .\nKokeile uudestaan!', {replyMarkup: 'hide', ask: 'lahtopaikka'});

        } else {
          return;
        }
    } else {
      if (kayttajat.length) {
        for (var i = 0; i < kayttajat.length; i++) {
          if (kayttajat[i].userId === msg.from.id) {
  const sijainninLabel = sijaintiLabelHandler(msg.text[0], msg.text[1]);
  lisaaKayttajalle("lahtopaikka",sijainninLabel,msg.text[0],msg.text[1],msg.from.id);

  if (!maaranpaasta && !kayttajat[i].maaranpaa) {
      //kysytään määränpäätä jos ei oo
      return maaranpaaKysymys(msg);
 }else {
   //jos on
   reitinKasittely(msg);
 }

          }

        }
      }

        const sijainninLabel = sijaintiLabelHandler(msg.text[0], msg.text[1]);
          lisaaKayttajalle("lahtopaikka",sijainninLabel,msg.text[0],msg.text[1],msg.from.id);
    }

    setTimeout(() => {
        if (kayttajat.length === 0) {
            if (maaranpaasta) {
                reitinKasittely(msg);
            }
            return maaranpaaKysymys(msg);
        } else {
            for (var i = 0; i < kayttajat.length; i++) {
                if (kayttajat[i].userId === msg.from.id && !kayttajat[i].maaranpaa) {
                    return maaranpaaKysymys(msg);
                } else if (kayttajat[i].userId === msg.from.id && maaranpaasta) {
                    reitinKasittely(msg);
                }
            }
        }
    }, 10);



}

function maaranpaahaku(msg, lahtopaikasta) {
  const eiLahtopaikkaa = msg.text && kayttajat.some(i => i.userId === msg.from.id && !i.lahtopaikka);
    if (msg.tyyppi !== "sijainti") {
      const features = tekstiLabelHandler(msg.text, "M",msg.from.id); //haetaan label
        if (features) {
            if (eiLahtopaikkaa) {
                return bot.sendMessage(msg.from.id, 'Lähtöpaikkaa ei löytynyt.\nKokeile toista!', {replyMarkup: 'hide', ask: 'lahtopaikka'});
            }
              var [lon, lat] = features.geometry.coordinates;
            // Tallennetaan tiedot
            lisaaKayttajalle("maaranpaa",features.properties.label,lat,lon,msg.from.id);
            console.info('Käsitellään määränpäätä...');
            bot.sendAction(msg.from.id, 'typing');

            return reitinKasittely(msg);

          } else if (!eiLahtopaikkaa) {

            return bot.sendMessage(msg.from.id, 'Määränpäätä ei löytynyt.\nKokeile uudestaan!', {replyMarkup: 'hide', ask: 'maaranpaa'});
        } else {
            return bot.sendMessage(msg.from.id, 'Lähtöpaikkaa eikä määränpäätä löytynyt.\nKokeile uudestaan!', {replyMarkup: 'hide', ask: 'lahtopaikka'});

        }
    } else {
      if (kayttajat.length && !lahtopaikasta) {
        const index = kayttajat.findIndex(i => i.userId === msg.from.id);
if (index !== -1) {
  const sijainninLabel = sijaintiLabelHandler(msg.text[0], msg.text[1]);
  lisaaKayttajalle("maaranpaa",sijainninLabel,msg.text[0],msg.text[1],msg.from.id);
  if (!kayttajat[index].lahtopaikka) {
  return lahtopaikkaKysymys(msg.from.id);
}else {
  return reitinKasittely(msg);
  }
      }
    }
    }

}

function tyhjennaArr(chatId) {
kayttajat = kayttajat.filter(i =>i.userId !== chatId);
console.info("poistettu reitin arraysta");
}
function lahtoaikaHandler(lahtoaika) {
    lahtoaika = lahtoaika.trim().split(" ");
    const lahtoKellonaika = lahtoaika[0].split(":");
    let lahtoPvm = "";
    if (lahtoaika.length > 1) {
        lahtoPvm = lahtoaika[1].split(".");
    }
    const tanaan = new Date();
    if (lahtoKellonaika.length === 2 && lahtoPvm.length === 0) {
        return new Date(tanaan.getFullYear(), tanaan.getMonth(), tanaan.getDate(), lahtoKellonaika[0], lahtoKellonaika[1], 0);
    } else if (lahtoKellonaika.length === 2 && lahtoPvm.length === 2) {
        return new Date(tanaan.getFullYear(), lahtoPvm[1] - 1, lahtoPvm[0], lahtoKellonaika[0], lahtoKellonaika[1], 0);
    } else if (lahtoKellonaika.length === 2 && lahtoPvm.length === 3) {
        return new Date(lahtoPvm[2], lahtoPvm[1] - 1, lahtoPvm[0], lahtoKellonaika[0], lahtoKellonaika[1], 0);

    }


}
function maaranpaaKysymys(msg) {
    console.info(' Kysytään määränpäätä.');
    bot.sendMessage(msg.from.id, 'Anna vielä määränpää!  😉', {replyMarkup: 'hide', ask: 'maaranpaa'});


}
function lahtopaikkaKysymys(chatId) {
  console.info(' Kysytään lähtöpaikkaa.');
  return bot.sendMessage(chatId, '<b>Reittihaku</b>\nAnna vielä reitin lähtöpaikka!  😃', {replyMarkup: 'hide', ask: 'lahtopaikka', parseMode: 'html'});

}
function sijaintiLabelHandler(lat, lon) {
    try {
        const  osoiteHaku = JSON.parse(httpGet(encodeURI(`http://api.digitransit.fi/geocoding/v1/reverse?point.lat=${lat}&point.lon=${lon}&size=1`)));
        return osoiteHaku.features[0].properties.label;
    } catch (e) {
        console.error("POIta ei löytynyt/voitu hakea",e);
        return "[sijainti]";
    }
}
function tekstiLabelHandler(text, tyyppi,chatId) {
    try {
        const  startingCords = JSON.parse(httpGet(encodeURI(`http://api.digitransit.fi/geocoding/v1/search?text=${text}&size=1&lang=fi&boundary.rect.min_lat=59.9&boundary.rect.max_lat=60.45&boundary.rect.min_lon=24.0&boundary.rect.max_lon=25.5`)));
        return startingCords.features[0];
    } catch (e) {
        console.error("POIta ei löytynyt/voitu hakea",e);
        if (tyyppi === "M") {
            return bot.sendMessage(chatId, 'Määränpään haussa tapahtui virhe.\nKokeile uudestaan!', {replyMarkup: 'hide', ask: 'maaranpaa'});
        } else {
            return bot.sendMessage(chatId, 'Lähtöpaikan haussa tapahtui virhe.\nKokeile uudestaan!', {replyMarkup: 'hide', ask: 'lahtopaikka'});

        }
    }
}
function lisaaKayttajalle(tyyppi,label,lat,lon,chatId) {
  for(let i=0; i<kayttajat.length; i++){
  if (kayttajat[i].userId === chatId) kayttajat[i][tyyppi] = { label: label,lat: lat, lon: lon};
}
  }
  function odotusaikaHandler(duration) {
    const seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    let minutes0 = (minutes < 10) ? "0" + minutes : minutes;
    if (!hours) {
      return minutes + "min";
    }else if (hours === 1 && !minutes) {
    return hours + "h";
    }else if (hours > 1 && minutes) {
    return hours+"h:"+minutes0 + "min";
    }
  }
//Exporttaa tän indexiins
module.exports = reitti;
