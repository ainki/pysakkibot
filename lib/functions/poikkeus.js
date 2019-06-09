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

            var lista = ''

            var alerts = jp.query(data, '$..alertHeaderText')
            var routes = jp.query(data, '$..route')
            var modes = jp.query(routes, '$..mode')

            if (alerts == '') {
                return bot.sendMessage(chatId, 'Ei tiedossa olevia häiriöitä tai poikkeuksia.')
            } else {
                for (i = 0; i < alerts.length; i += 1) {

                    alert = alerts[i];
                    mode = modes[i];
                    route = routes[i]
                    var viesti
                    lista

                    // Lyhennetään viestejä
                    alert = alert.replace('Lähijuna ', '')
                    alert = alert.replace('Lähijunat: ', '')
                    alert = alert.replace('Helsingin sisäisen liikenteen linja ', '')
                    alert = alert.replace('Helsingin sisäisen liikenteen linjat: ', '')
                    alert = alert.replace('Espoon sisäisen liikenteen linja ', '')
                    alert = alert.replace('Espoon sisäisen liikenteen linjat: ', '')
                    alert = alert.replace('Vantaan sisäisen liikenteen linja ', '')
                    alert = alert.replace('Vantaan sisäisen liikenteen linjat: ', '')
                    alert = alert.replace('Keravan sisäisen liikenteen linja ', '')
                    alert = alert.replace('Keravan sisäisen liikenteen linjat: ', '')
                    alert = alert.replace('Kirkkonummen sisäisen liikenteen linja ', '')
                    alert = alert.replace('Kirkkonummen sisäisen liikenteen linjat:', '')
                    alert = alert.replace('Seutuliikenteen linja ', '')
                    alert = alert.replace('Seutuliikenteen linjat: ', '')
                    alert = alert.replace('Raitiolinja ', '')
                    alert = alert.replace('Raitiolinjat: ', '')
                    alert = alert.replace('Metro ', '')

                    if (routes[i] == null) {
                        viesti = alert + "\n\n"
                    } else {
                        mode = jp.query(routes[i], '$..mode')
                        // Viestin alkuun merkki
                        if (mode == "BUS") {
                            viesti = "Ⓑ " + alert + "\n\n"
                        } else if (mode == "SUBWAY") {
                            viesti = "Ⓜ " + alert + "\n\n"
                        } else if (mode == "TRAM") {
                            viesti = "Ⓡ " + alert + "\n\n"
                        } else if (mode == "RAIL") {
                            viesti = "Ⓙ " + alert + "\n\n"
                        } else if (mode == "FERRY") {
                            viesti = "Ⓛ " + alert + "\n\n"
                        } else {
                            viesti = alert + "\n\n"
                        }
                    }
                    lista = lista + viesti
                }
                return bot.sendMessage(chatId, 'Tämänhetkiset poikkeukset:\n\n' + lista + 'Lisätietoa: hsl.fi')
                var lista = undefined;
            }
        });
}

//Exporttaa tän indexiin
module.exports = poikkeus;