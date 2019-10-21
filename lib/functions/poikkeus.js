// poikkeus.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
var muuttujia = require('../flow/muutujia');
var moment = require('moment');
moment.locale('fi-FI');

var digiAPI = muuttujia.digiAPI;


function poikkeus(chatId, text) {
  // Jos pelkkä /poikkeukset palauttaa kaikki poikkeukset
  if (text == '/poikkeukset') {
    return kaikkipoikkeukset(chatId);
  } else {
    return poikkeuksetlinjalle(chatId, text);
  }
}

function kaikkipoikkeukset(chatId) {
  const query = `{
    alerts {
      alertDescriptionText
      alertSeverityLevel
      route {
        mode
      }
      }
    }`

  return request(digiAPI, query)
    .then(function (data) {
      var alerts = jp.query(data, '$..alerts')
      var alertDescriptions = jp.query(data, '$..alertDescriptionText')
      var alertEffects = jp.query(data, '$..alertSeverityLevel')
      var routes = jp.query(data, '$..route')
      var modes = jp.query(routes, '$..mode')

      if (alerts == '') {
        return bot.sendMessage(chatId, 'Ei tiedossa olevia häiriöitä tai poikkeuksia.')
      } else {
        let lista = [];
        let nahty = [];

        // Käy läpi jokaisen alertin
        for (i = 0; i < alertDescriptions.length; i += 1) {
          // Jos "turha" alertti
          if (alertEffects[i] == 'INFO') {
            // Skip
          } else {
            //tarkistetaan onko uniikki
            if (nahty.indexOf(alertDescriptions[i]) === -1) {
              let viesti = '';

              if (routes[i] == null) {
                viesti = alertDescriptions[i]
              } else {
                mode = jp.query(routes[i], '$..mode')
                // Viestin alkuun merkki
                if (mode == "BUS") {
                  viesti = "Ⓑ " + alertDescriptions[i]
                } else if (mode == "SUBWAY") {
                  viesti = "Ⓜ " + alertDescriptions[i]
                } else if (mode == "TRAM") {
                  viesti = "Ⓡ " + alertDescriptions[i]
                } else if (mode == "RAIL") {
                  viesti = "Ⓙ " + alertDescriptions[i]
                } else if (mode == "FERRY") {
                  viesti = "Ⓛ " + alertDescriptions[i]
                } else {
                  viesti = alertDescriptions[i]
                }
              }
              // Poistaa linkin
              viesti = viesti.replace('Info: hsl.fi', '').replace('Info HSL.fi', '').replace('hsl.fi', '').replace('Info: HSL.fi', '').replace('HSL.fi', '').replace('INFO', '')
              lista.push(viesti.trim());
              nahty.push(alertDescriptions[i])
            }
          }
        }
        console.info("lähetetään poikkeukset");
        return bot.sendMessage(chatId, 'Tämänhetkiset poikkeukset:\n\n' + lista.join("\n\n") + "\n\n" + 'Lisätietoa: hsl.fi')
        lista = undefined;
      }
    })
}

function poikkeuksetlinjalle(chatId, text) {
  console.log(moment().subtract(1, 'hours').calendar());
  return kaikkipoikkeukset(chatId);
}

//Exporttaa tän indexiin
module.exports = poikkeus;
