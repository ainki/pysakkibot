// reitti.js

const bot = require('../../bot');
const { request } = require('graphql-request');
var jp = require('jsonpath');
var muuttujia = require('../flow/muutujia');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var moment = require('moment');
moment.locale('fi-FI');

// Näppäimistö
let replyMarkup = bot.keyboard([[bot.button('/hae'), bot.button('/reitti'), bot.button('location', 'Sijaintisi mukaan 📍')]], { resize: true });

var digiAPI = muuttujia.digiAPI;

function reitti(msg) {
  if (msg.text.trim() === '/reitti') {
    console.info(' Kysytään lähtöpaikkaa.');
    return bot.sendMessage(msg.chat.id, '<b>Reittihaku</b>\nAnna reitin lähtöpaikka!  😃', { replyMarkup: 'hide', ask: 'lahtopaikka', parseMode: 'html' });
  } else {
    const jaettu = msg.text.replace('/reitti', '').trim().split(",");
    //lahtöpaikaks ennen ,
        console.log(jaettu.length,"jaettu.length");
    let lahtopaikkaviesti = Object.assign({...msg},{text: jaettu[0],singleCommand: jaettu.length ? true : false});

    let maaranpaaviesti;
    console.info('Käsitellään reittiä...');
    lahtopaikkahaku(lahtopaikkaviesti);
    if (jaettu[1]) {
      //määränpääks , jälkeen
      maaranpaaviesti  = Object.assign({...msg},{text: jaettu[1],singleCommand: true});
      maaranpaahaku(maaranpaaviesti);
    }else if(maaranpaaviesti) {
      //jos puuttuu
        maaranpaaviesti.text = "";
      maaranpaahaku(maaranpaaviesti);
    }

  }
}

//Exporttaa tän indexiin
module.exports = reitti;

// Kysyy lähtöpaikan ja määränpään

// Arrayt

var lahtopaikat = [];
var maaranpaat = [];


bot.on('ask.lahtopaikka', msg => {
  if (!msg.text.includes("/") && !msg.text.includes(",")) {
    // Hakee osoitteen koordinaatit
    // startingCords = JSON.parse(httpGet(`http://api.digitransit.fi/geocoding/v1/search?text=${msg.text}&size=1&lang=fi`));
    lahtopaikkahaku(msg);
  }else if (msg.text.includes(",")) {
    reitti(msg);
  }
});

bot.on('ask.maaranpaa', msg => {
  if (!msg.text.includes("/")) {
    // Hakee osoitteen koordinaatit
    maaranpaahaku(msg);

  } else {
tyhjennaArr(lahtopaikat,maaranpaat, msg.from.id);
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
            return reittienListaus(chatId, labelStart[i], labelDest[x], data);
          }).catch(err => {
            console.error("Ongelma valinnassa");
            console.error(err);
            return bot.sendMessage(chatId, `Ongelma valinnassa. Kokeile uudestaan!`, {ask: 'askhaevalinta'});
          });
        }
      }
    }
  }
}

function reittienListaus(chatId, lahtopaikka, maaranpaa, data) {

  // Tekee viestin yläosan
  var legs = jp.query(data, '$..legs');
  if (!legs.length) {
    // jos ei reittiehdotuksia
      tyhjennaArr(lahtopaikat,maaranpaat, chatId);
    return bot.sendMessage(chatId, "Reittiehdotuksia ei valitettavasti löytynyt lähtöpaikan "+lahtopaikka +" ja määränpään " + maaranpaa + " välille", { replyMarkup, parseMode: 'html' });
  }
  const ylaosa = '<b>Reittiehdotukset</b>\n' + lahtopaikka + '\n' + maaranpaa + '\n\n';

  // var duration = jp.query(data, '$..duration');
  let ehdotukset = '';

  for (let i = 0; i < legs.length; i++) {

    var mode = jp.query(legs[i], '$..mode');

    // reittivaihtoehdon lähtöaika ja saapumisaika
    const routeStartTime = data.plan.itineraries[i].startTime;
    const routeEndTime = data.plan.itineraries[i].endTime;
    // Käytetään matka-ajan laskemiseen
    var mEndTime = moment(routeEndTime);

    let vLegs = '';

    for (let x = 0; x < mode.length; x++) {
      var legHeadsign;
      var legDestination;
      // Legin aloitusaika ja mode
      var legStartTime = data.plan.itineraries[i].legs[x].startTime;
      var legMode = data.plan.itineraries[i].legs[x].mode;

      // Jos mode on mode on walk tkee kävele tekstin jos ei niin ottaa linjan tunnuksen ja linjakilven
      if (legMode == 'WALK') {
        legHeadsign = 'Kävele';
      } else {
        legHeadsign = data.plan.itineraries[i].legs[x].route.shortName + ' ' + data.plan.itineraries[i].legs[x].trip.tripHeadsign;
      }

      // Yhden legin määränpään filteröinti
      if (data.plan.itineraries[i].legs[x].to.name == 'Destination') {
        legDestination = 'Määränpää';
      } else if (legMode == 'WALK') {
        legDestination = data.plan.itineraries[i].legs[x].to.name + ' ' + data.plan.itineraries[i].legs[x].to.stop.code;
      } else {
        legDestination = data.plan.itineraries[i].legs[x].to.name;
      }

      // Rakentaa yhden legin
      vLegs += '  ' + moment(legStartTime).format('HH:mm') + '  ' + legHeadsign + ' → ' + legDestination + '\n';
      // Lisää yhden legin kaikkiin  legeihin

    }

    // Joka reittivaihtoehdon rakentamien
    ehdotukset = ehdotukset + '<b>' + moment(routeStartTime).format('HH:mm') + ' - ' + moment(routeEndTime).format('HH:mm') + '  (' + mEndTime.diff(routeStartTime, 'minutes') + 'min)</b>\n' + vLegs + '\n';
  }
  // Lähettää viestin
  tyhjennaArr(lahtopaikat,maaranpaat, chatId);
  return bot.sendMessage(chatId, ylaosa + ehdotukset, { replyMarkup, parseMode: 'html' });
}


// XMLHttpRequests

function httpGet(theUrl) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", theUrl, false); // false for synchronous request
  xmlHttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  xmlHttp.send(null);
  return xmlHttp.responseText;
}

function lahtopaikkahaku(msg) {
  startingCords = JSON.parse(httpGet(encodeURI(`http://api.digitransit.fi/geocoding/v1/search?text=${msg.text}&size=1&lang=fi&boundary.rect.min_lat=59.9&boundary.rect.max_lat=60.6&boundary.rect.min_lon=24.0&boundary.rect.max_lon=25.8`)));
    let features;
    try {
      features = startingCords.features[0];
    } catch (e) {
      console.error(e);
      return bot.sendMessage(msg.from.id, 'Lähtöpaikkan haussa tapahtui virhe.\nKokeile uudestaan!', { replyMarkup: 'hide', ask: 'lahtopaikka' });

    }
    if (features) {
      var [lon, lat] = startingCords.features[0].geometry.coordinates;
      var label = startingCords.features[0].properties.label;
      console.log(label);
      console.log(lat, lon);

      // [Debug] lähettää osotteen takasin
      // return bot.sendLocation(msg.from.id, [parseFloat(lat), parseFloat(lon)]);

      // Tallennetaan tiedot
      lahtopaikat.push({userId:msg.from.id, label: label, lon: lon, lat: lat});
      console.info(' Kysytään määränpäätä.');

      setTimeout(() => {
        if (maaranpaat.length === 0) {
          return bot.sendMessage(msg.from.id, 'Anna vielä määränpää!  😉', { replyMarkup: 'hide', ask: 'maaranpaa' });
        }
      }, 10);

    } else if(!msg.singleCommand) {
      return bot.sendMessage(msg.from.id, 'Lähtöpaikkaa ei löytynyt.\nKokeile uudestaan!', { replyMarkup: 'hide', ask: 'lahtopaikka' });
    }
  }

  function maaranpaahaku(msg) {
    startingCords = JSON.parse(httpGet(encodeURI(`http://api.digitransit.fi/geocoding/v1/search?text=${msg.text}&size=1&lang=fi&boundary.rect.min_lat=59.9&boundary.rect.max_lat=60.45&boundary.rect.min_lon=24.3&boundary.rect.max_lon=25.5`)));
      let features;
      try {
        features = startingCords.features[0];
      } catch (e) {
        console.error(e);
        return bot.sendMessage(msg.from.id, 'Määränpään haussa tapahtui virhe.\nKokeile uudestaan!', { replyMarkup: 'hide', ask: 'maaranpaa' });

      }
      if (features) {
        var [lon, lat] = startingCords.features[0].geometry.coordinates;
        var label = startingCords.features[0].properties.label;
        console.log(label);
        console.log(lat, lon);

        // [Debug] lähettää osotteen takasin
        // return bot.sendLocation(msg.from.id, [parseFloat(lat), parseFloat(lon)]);

        // Tallennetaan tiedot
        maaranpaat.push({userId:msg.from.id, label: label, lon: lon, lat: lat});

        console.info('Käsitellään reittiä...');
        bot.sendAction(msg.from.id, 'typing');
        return reitinKasittely(msg.from.id);

      } else if(msg.text && !msg.singleCommand) {
        return bot.sendMessage(msg.from.id, 'Määränpäätä ei löytynyt.\nKokeile uudestaan!', { replyMarkup: 'hide', ask: 'maaranpaa' });
      }else if(msg.text){
        return bot.sendMessage(msg.from.id, 'lähtöpaikkaa eikä määränpäätä löytynyt.\nKokeile uudestaan!', { replyMarkup: 'hide', ask: 'maaranpaa' });

      }
    }

    function tyhjennaArr(lahtopaikat,maaranpaat, chatId) {
      console.info('Postettu reitin arraysta');
      // Jos tekee komennon poistaa listoista
      var userIdStart = jp.query(lahtopaikat, '$..userId');
      var userIdDest = jp.query(maaranpaat, '$..userId');

      for (let i = 0; i < userIdStart.length; i++) {
        if (userIdStart[i] == chatId) {
          lahtopaikat.splice(i, 1);
          for (let x = 0; i < userIdDest.length; i++) {
            if (userIdDest[x] == chatId) {
              maaranpaat.splice(x, 1);
              return;
            }
          }
        }
      }
    }
