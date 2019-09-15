// poikkeus.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
var muuttujia = require('../flow/muutujia');

var digiAPI = muuttujia.digiAPI;


function poikkeus(chatId) {
  const query = `{
    alerts {
      alertHeaderText
      route {
        gtfsId
        mode
      }
    }
  }`

  return request(digiAPI, query)
  .then(function (data) {
    var alerts = jp.query(data, '$..alertHeaderText');
    var routes = jp.query(data, '$..route');

    if (alerts == '') {
      return bot.sendMessage(chatId, 'Ei tiedossa olevia häiriöitä tai poikkeuksia.')
    } else {
      let lista = [];
      let nahty = [];

      for (let i = 0; i < alerts.length; i++  ) {

        //tarkistetaan onko uniikki
        if (nahty.indexOf(alerts[i]) === -1) {
          let viesti = "";

          // Lyhennetään viestejä
          alerts[i] = alerts[i].replace('Lähijuna ', '').replace('Lähijunat: ', '').replace('Helsingin sisäisen liikenteen linja ', '').replace('Helsingin sisäisen liikenteen linjat: ', '').replace('Espoon sisäisen liikenteen linja ', '').replace('Espoon sisäisen liikenteen linjat: ', '').replace('Vantaan sisäisen liikenteen linja ', '').replace('Vantaan sisäisen liikenteen linjat: ', '')
          alerts[i] = alerts[i].replace('Keravan sisäisen liikenteen linja ', '').replace('Keravan sisäisen liikenteen linjat: ', '').replace('Kirkkonummen sisäisen liikenteen linja ', '').replace('Kirkkonummen sisäisen liikenteen linjat:', '').replace('Seutuliikenteen linja ', '').replace('Seutuliikenteen linjat: ', '').replace('Raitiolinja ', '').replace('Raitiolinjat: ', '').replace('Metro ', '')
          if (routes[i] === null) {
            //jos poikkeuksessa ei ole reittiä
            viesti = alerts[i]
          } else {
            //jos on
            //haetaan eri joukkoliikennemuodot
            let mode = jp.query(routes[i], '$..mode') + ""
            // Viestin alkuun merkki
            switch (mode) {

              case "BUS":
              viesti = "Ⓑ " + alerts[i]
              break;
              case "SUBWAY":
              viesti = "Ⓜ " + alerts[i]
              break;
              case "TRAM":
              viesti = "Ⓡ " + alerts[i]
              break;
              case "RAIL":
              viesti = "Ⓙ " + alerts[i]
              break;
              case "FERRY":
              viesti = "Ⓛ " + alerts[i]
              break;
              default:
              //jos ei mikään ylläolevista
              viesti = alerts[i];
            }

          }
          lista.push(viesti.trim());

        }
        nahty.push(alerts[i]);

      }
      console.info("lähetetään poikkeukset");
      return bot.sendMessage(chatId, 'Tämänhetkiset poikkeukset:\n\n' + lista.join("\n\n") +"\n\n"+ 'Lisätietoa: hsl.fi')
      lista = undefined;
    }

  });
}


//Exporttaa tän indexiin
module.exports = poikkeus;
