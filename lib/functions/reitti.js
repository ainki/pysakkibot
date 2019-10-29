// reitti.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var muuttujia = require('../flow/muutujia');
const chunkArray = require('./chunkArray')
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var moment = require('moment');
moment.locale('fi-FI');

var digiAPI = muuttujia.digiAPI;

function reitti(chatId, viesti) {
    if (viesti === '/reitti') {
        console.info(' Kysytään lähtöpaikkaa.');
        return bot.sendMessage(chatId, 'Anna lähtöpaikka', { replyMarkup: 'hide', ask: 'lahtopaikka' });
    } else {
        return bot.sendMessage(chatId, 'Anna lähtöpaikka', { replyMarkup: 'hide', ask: 'lahtopaikka' });
        bot.sendAction(chatId, 'typing');

        console.info('Käsitellään reittiä...');
        //Poistaa "/reitti " tekstin
        viesti = viesti.replace('/reitti ', '')
        //Kutuu xx funktion
        // return aaa(chatId, viesti);
    }
}

//Exporttaa tän indexiin
module.exports = reitti;

// Kysyy lähtöpaikan ja määränpään

// Arrayt

var lahtopaikat = []
var maaranpaat = []


bot.on('ask.lahtopaikka', msg => {
    if (!msg.text.includes("/")) {
        // Hakee osoitteen koordinaatit
        // startingCords = JSON.parse(httpGet(`http://api.digitransit.fi/geocoding/v1/search?text=${msg.text}&size=1&lang=fi`));
        startingCords = JSON.parse(httpGet(encodeURI(`http://api.digitransit.fi/geocoding/v1/search?text=${msg.text}&size=1&lang=fi&boundary.rect.min_lat=59.9&boundary.rect.max_lat=60.45&boundary.rect.min_lon=24.3&boundary.rect.max_lon=25.5`)));

        if (startingCords.features[0]) {
            var [lon, lat] = startingCords.features[0].geometry.coordinates;
            var label = startingCords.features[0].properties.label;
            console.log(label)
            console.log(lat, lon)

            // [Debug] lähettää osotteen takasin
            // return bot.sendLocation(msg.from.id, [parseFloat(lat), parseFloat(lon)]);

            // Tallennetaan tiedot
            var element = {};
            element.userId = msg.from.id;
            element.label = label;
            element.lon = lon;
            element.lat = lat;
            lahtopaikat.push(element)

            console.info(' Kysytään määränpäätä.');
            return bot.sendMessage(msg.from.id, 'Anna vielä määränpääsi!', { replyMarkup: 'hide', ask: 'maaranpaa' });
        } else {
            return bot.sendMessage(msg.from.id, 'Lähtöpaikkaa ei löytynyt.\nKokeile uudestaan!', { replyMarkup: 'hide', ask: 'lahtopaikka' });
        }
    }
});

bot.on('ask.maaranpaa', msg => {
    if (!msg.text.includes("/")) {
        // Hakee osoitteen koordinaatit
        // startingCords = JSON.parse(httpGet(`http://api.digitransit.fi/geocoding/v1/search?text=${msg.text}&size=1&lang=fi`));
        startingCords = JSON.parse(httpGet(encodeURI(`http://api.digitransit.fi/geocoding/v1/search?text=${msg.text}&size=1&lang=fi&boundary.rect.min_lat=59.9&boundary.rect.max_lat=60.45&boundary.rect.min_lon=24.3&boundary.rect.max_lon=25.5`)));

        if (startingCords.features[0]) {
            var [lon, lat] = startingCords.features[0].geometry.coordinates;
            var label = startingCords.features[0].properties.label;
            console.log(label)
            console.log(lat, lon)

            // [Debug] lähettää osotteen takasin
            // return bot.sendLocation(msg.from.id, [parseFloat(lat), parseFloat(lon)]);

            // Tallennetaan tiedot
            var element = {};
            element.userId = msg.from.id;
            element.label = label;
            element.lon = lon;
            element.lat = lat;
            maaranpaat.push(element)

            console.info('Käsitellään reittiä...');
            bot.sendAction(msg.from.id, 'typing');
            return reitinKasittely(msg.from.id);
        } else {
            return bot.sendMessage(msg.from.id, 'Määränpäätä ei löytynyt.\nKokeile uudestaan!', { replyMarkup: 'hide', ask: 'maaranpaa' });
        }
    } else {
        // Jos tekee komennon poistaa listoista
        var userIdStart = jp.query(lahtopaikat, '$..userId');
        var userIdDest = jp.query(maaranpaat, '$..userId');
        for (let i = 0; i < userIdStart.length; i++) {
            if (userIdStart[i] == msg.from.id) {
                lahtopaikat.splice(i, 1);
            }
        }
    }
});

// Functions

function reitinKasittely(chatId) {

    // Lähtöpaikka
    var userIdStart = jp.query(lahtopaikat, '$..userId');
    var labelStart = jp.query(lahtopaikat, '$..label');
    var latStart = jp.query(lahtopaikat, '$..lat');
    var lonStart = jp.query(lahtopaikat, '$..lon');
    // Määränpää
    var userIdDest = jp.query(maaranpaat, '$..userId');
    var labelDest = jp.query(maaranpaat, '$..label');
    var latDest = jp.query(maaranpaat, '$..lat');
    var lonDest = jp.query(maaranpaat, '$..lon');

    for (let i = 0; i < userIdStart.length; i++) {
        if (userIdStart[i] == chatId) {
            for (let x = 0; x < userIdDest.length; x++) {
                if (userIdDest[x] == chatId) {

                    const query = `{
                        plan(from: {lat: ${latStart[i]}, lon: ${lonStart[i]}}, to: {lat: ${latDest[x]}, lon: ${lonDest[x]}}, numItineraries: 3) {
                          itineraries {
                                startTime
                                endTime
                              duration
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
                        .then(function (data) {
                            lahtopaikat.splice(i, 1);
                            maaranpaat.splice(x, 1);
                            return reittienListaus(chatId, labelStart[i], labelDest[x], data)
                        })
                }
            }
        }
    }
}

function reittienListaus(chatId, lahtopaikka, maaranpaa, data) {

    // Tekee viestin yläosan
    var vInit = '<b>Reittiehdotukset</b>\n' + lahtopaikka + '\n' + maaranpaa + '\n\n';

    var legs = jp.query(data, '$..legs');
    var duration = jp.query(data, '$..duration');
    var vIti = ''

    for (let i = 0; i < legs.length; i++) {

        var mode = jp.query(legs[i], '$..mode')
        // Matka-aika
        // var matkaAika = moment.duration(duration[i], 'seconds').format('hh:mm');
        // var matkaAikaFormatoitu = matkaAika.format("hh:mm");

        // console.log(moment.utc(moment.duration(duration[i], 'seconds').asMilliseconds()).format('HH:mm'));
        //  console.log(matkaAika)
        
        // reittivaihtoehdon lähtöaika ja saapumisaika
        const routeStartTime = data.plan.itineraries[i].startTime
        const routeEndTime = data.plan.itineraries[i].endTime
        // Käytetään matka-ajan laskemiseen
        var mEndTime = moment(routeEndTime)

        var vLegs = ''

        for (let x = 0; x < mode.length; x++) {

            // Legin aloitusaika ja mode
            var legStartTime = data.plan.itineraries[i].legs[x].startTime
            var legMode = data.plan.itineraries[i].legs[x].mode

            // Jos mode on mode on walk tkee kävele tekstin jos ei niin ottaa linjan tunnuksen ja linjakilven
            if (legMode == 'WALK') {
                var legHeadsign = 'Kävele'
            } else {
                var legHeadsign = data.plan.itineraries[i].legs[x].route.shortName + ' ' + data.plan.itineraries[i].legs[x].trip.tripHeadsign
            }

            // Yhden legin määränpään filteröinti
            if (data.plan.itineraries[i].legs[x].to.name == 'Destination') {
                var legDestination = 'Määränpää'
            } else if (legMode == 'WALK') {
                var legDestination = data.plan.itineraries[i].legs[x].to.name + ' ' + data.plan.itineraries[i].legs[x].to.stop.code
            } else {
                var legDestination = data.plan.itineraries[i].legs[x].to.name
            }

            // Rakentaa yhden legin
            vLeg = '  ' + moment(legStartTime).format('HH:mm') + '  ' + legHeadsign +' → ' + legDestination + '\n'
            // Lisää yhden legin kaikkiin  legeihin
            vLegs = vLegs + vLeg
        }

        // Joka reittivaihtoehdon rakentamien
        vIti = vIti + '<b>' + moment(routeStartTime).format('HH:mm') + ' - ' + moment(routeEndTime).format('HH:mm')+ '  ('+ mEndTime.diff(routeStartTime, 'minutes') +'min)</b>\n'+ vLegs + '\n';

    }

    return bot.sendMessage(chatId, vInit + vIti , { parseMode: 'html' }); 
}


// XMLHttpRequest

function httpGet(theUrl) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", theUrl, false); // false for synchronous request
    xmlHttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    xmlHttp.send(null);
    return xmlHttp.responseText;
}