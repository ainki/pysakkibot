// lahdot.js

var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');


function lahtoListaus(data, asetus) {

  var stops = jp.query(data, '$..stops')
  if (asetus == 2) {
    var haku = jp.query(data, '$..stopTimesForPattern')
  } else {
    var haku = jp.query(data, '$..stoptimesWithoutPatterns')
  }

  var pysakinVyohyke = jp.query(stops, '$..zoneId')
  var pysakkienNimet = jp.query(stops, '$..name')
  var pysakkienKoodit = jp.query(stops, '$..code')
  var laituriKoodit = jp.query(stops, '$..platformCode')
  var poikkeus = false;
  var lahdotPysakeilta = "";
  let viestiOK = false;

console.log(pysakinVyohyke,"pysakinVyohyke");
  for (let i = 0; i < haku.length; i++  ) {
    var lahtoHaku = jp.query(haku[i], '$..realtimeDeparture')
    var linjaTunnukset = jp.query(haku[i], '$..shortName')
    var maaranpaat = (jp.query(haku[i], '$..headsign'))
    var realtimeTilat = jp.query(haku[i], '$..realtimeState')
    var pickupType = jp.query(haku[i], '$..pickupType')
    var dropoffType = jp.query(haku[i], '$..dropoffType')
    var alerts = jp.query(haku[i], '$..alerts')

    if (linjaTunnukset.length > 0) {
 viestiOK = true;
      // Laittaa pysäkin nimen ja koodin viestiin
      console.log(lahdotPysakeilta);
      if (lahdotPysakeilta === "") {
        if (laituriKoodit[i] === null) {
          lahdotPysakeilta = 'Lähdöt pysäkiltä ' + pysakkienNimet[i] + ' - ' + pysakkienKoodit[i] +" - Vyöhyke: " +pysakinVyohyke[0] +'\n\n'
        } else {
          lahdotPysakeilta = 'Lähdöt pysäkiltä ' + pysakkienNimet[i] + ' - ' + pysakkienKoodit[i] + ' - Lait. ' + laituriKoodit[i]+" - Vyöhyke: " +pysakinVyohyke[0]  + '\n\n'
        }
      } else {
        if (laituriKoodit[i] == null) {
          lahdotPysakeilta += '\nLähdöt pysäkiltä ' + pysakkienNimet[i] + ' - ' + pysakkienKoodit[i]+'\n\n'
        } else {
          lahdotPysakeilta += '\nLähdöt pysäkiltä ' + pysakkienNimet[i] + ' - ' + pysakkienKoodit[i] + ' - Lait. ' + laituriKoodit[i]+ '\n\n'
        }

      }
    } else if (i === haku.length -1 && !viestiOK) {
      return "Ei lähtöjä pysäkiltä "+pysakkienNimet[i] + " - " + pysakkienKoodit[i] + ".";
    }

    for (let x = 0; x < lahtoHaku.length; x++) {
      // Muista käyttää  x
      if (haku[i]) {

        // Muuntaa numeroiksi kellonajan
        var lahtoaikaNUM = Number(lahtoHaku[x])
        // Muuttaa tunneiksi, minuuteiksi ja sekunneiksi
        var departuretime = TimeFormat.fromS(lahtoaikaNUM, 'hh:mm');
        // Limitoi sekunnit pois
        var departuretimeshort = limit(departuretime, 5)
        // Aamuyön kellonaikojen korjaus (Klo 4 astai, koska seuraavan päivän vuorot alkavat yleensä klo 5)
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

        var alert = alerts[x]
        // Yhdistää tiedot yhteen
        // Jos lähtö on suunniteltu
        if (realtimeTilat[x] == 'SCHEDULED') {
          // Jos linjalla
          if (pickupType[x] == 'SCHEDULED') {
            if (alert == "") {
              var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnukset[x] + " " + maaranpaat[x] + "";
            } else {
              var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnukset[x] + " " + maaranpaat[x] + "  ⚠️";
              poikkeus = true
            }

          } else if (pickupType[x] == 'NONE' && dropoffType[x] == 'SCHEDULED' && maaranpaat[x] !== '') {
            if (alert == "") {
              var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnukset[x] + " Vain poistuminen";
            } else {
              var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnukset[x] + " Vain poistuminen  ⚠️";
              poikkeus = true
            }

          } else if (pickupType[x] == 'NONE' && maaranpaat[x] == '') {
            var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnukset[x] + " ⇥ Päätepysäkki";
          }else if (pickupType[x] == 'NONE') {
            if (alert == "") {
              var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnukset[x] + " Päätepysäkki";
            } else {
              var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnukset[x] + " Päätepysäkki  ⚠️";
              poikkeus = true
            }
          }else if (pickupType[x] == 'CALL_AGENCY') {
            if (alert == "") {
              var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnukset[x] + "📞";
            } else {
              var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnukset[x] + "📞  ⚠️";
              poikkeus = true
            }
          }

          // Jos lähtö on reaaliaikainen
        } else if (realtimeTilat[x] == 'UPDATED') {
          if (pickupType[x] == 'SCHEDULED') {
            if (alert == "") {
              var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjaTunnukset[x] + " " + maaranpaat[x];
            } else {
              var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjaTunnukset[x] + " " + maaranpaat[x] + "  ⚠️";
              poikkeus = true
            }

          } else if (pickupType[x] == 'NONE' && dropoffType[x] == 'SCHEDULED' && maaranpaat[x] !== '') {
            if (alert == "") {
              var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjaTunnukset[x] + " Vain poistuminen";
            } else {
              var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjaTunnukset[x] + " Vain poistuminen  ⚠️";
              poikkeus = true
            }

          } else if (pickupType[x] == 'NONE' && maaranpaat[x] == '') {

            var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjaTunnukset[x] + " ⇥ Päätepysäkki";

        }else if (pickupType[x] == 'NONE') {

          if (alert == "") {
            var yksittainenlahto = departuretimeshort + "‏‏‎•   " + linjaTunnukset[x] + " Päätepysäkki";
          } else {
            var yksittainenlahto = departuretimeshort + "‏‏‎•   " + linjaTunnukset[x] + " Päätepysäkki  ⚠️";
            poikkeus = true
          }
        }
          // Jos peruttu vuoro
        } else if (realtimeTilat[x] == 'CANCELED') {
          var yksittainenlahto = departuretimeshort + "×‏‏‎   " + linjaTunnukset[x] + " Peruttu";
        } else if (realtimeTilat[x] == 'MODIFIED') {
          var yksittainenlahto = departuretimeshort + "!‏‏‎   " + linjaTunnukset[x] + " " + maaranpaat[x];
        }

        lahdotPysakeilta += yksittainenlahto + "\n";

      }
    }
  }
  if (poikkeus) {
    return lahdotPysakeilta + "\nPoikkeuksia linjoilla. Lisätietoa: /poikkeukset"
  } else {
    if (!lahdotPysakeilta) {
      return "Pysäkkiä ei löydy."
    }

    return lahdotPysakeilta;
  }
}

module.exports = lahtoListaus;
