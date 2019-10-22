// lahtoListaus.js

const jp = require('jsonpath');
const TimeFormat = require('hh-mm-ss')
const limit = require('limit-string-length');

function lahtoListaus(data, asetus) {
  var stops = jp.query(data, '$..stops')
  var haku;
  if (asetus == 2) {
     haku = jp.query(data, '$..stopTimesForPattern');
  } else {
   haku = jp.query(data, '$..stoptimesWithoutPatterns');
  }

  var pysakkienNimet = jp.query(stops, '$..name');
  var pysakkienKoodit = jp.query(stops, '$..code');
  var laituriKoodit = jp.query(stops, '$..platformCode');
  var vyohyke = jp.query(stops, '$..zoneId');
  var desc = jp.query(stops, '$..desc')
  var poikkeus = false;
  var lahdotPysakeilta = "";
  let viestiOK = false;

  for (let i = 0; i < haku.length; i++  ) {

    var lahtoHaku = jp.query(haku[i], '$..realtimeDeparture');
    var linjaTunnukset = jp.query(haku[i], '$..shortName');
    var maaranpaat = (jp.query(haku[i], '$..headsign'));
    var realtimeTilat = jp.query(haku[i], '$..realtimeState');
    var pickupType = jp.query(haku[i], '$..pickupType');
    var dropoffType = jp.query(haku[i], '$..dropoffType');
    var alerts = jp.query(haku[i], '$..alerts');
    let lahtopaiva = jp.query(haku[i], '$..serviceDay');
    var description

    // Jos desc on undefined jätetään tyhjäksi
    if(desc[i] == undefined) {
      console.log('On undefined')
      description = ''
    } else {
      description = '  '+desc[i]
    }

    if (linjaTunnukset.length > 0) {
 viestiOK = true;
      // Laittaa pysäkin nimen ja koodin viestiin
      if (lahdotPysakeilta === "") {
        if (laituriKoodit[i] === null) {
          lahdotPysakeilta = '<b>' + pysakkienNimet[i] + '</b>  ' + vyohyke[i] +'\n'+ pysakkienKoodit[i] + description +'\n\n';
        } else {
          lahdotPysakeilta = '<b>' + pysakkienNimet[i] + '</b>  ' + vyohyke[i] +'\n'+pysakkienKoodit[i] + description + '  Lait. ' + laituriKoodit[i] + '\n\n';
        }
      } else {
        if (laituriKoodit[i] == null) {
          lahdotPysakeilta += '\n<b>' + pysakkienNimet[i] + '</b>  ' + vyohyke[i] +'\n'+pysakkienKoodit[i] + description + '\n\n';
        } else {
          lahdotPysakeilta += '\n<b>' + pysakkienNimet[i] + '</b>  ' + vyohyke[i] +'\n'+pysakkienKoodit[i] + description + '  Lait. ' + laituriKoodit[i] + '\n\n';
        }
      }
    } else if (i === haku.length -1 && !viestiOK) {
      return "Ei lähtöjä pysäkiltä "+pysakkienNimet[i] + " - " + pysakkienKoodit[i] + ".";
    }

    for (let x = 0; x < lahtoHaku.length; x++) {
      // Muista käyttää  x
      lahtopaiva[x] =new Date( lahtopaiva[x] *1000);
      if (haku[i]) {

        // Muuntaa numeroiksi kellonajan
        var lahtoaikaNUM = Number(lahtoHaku[x])
        // Muuttaa tunneiksi, minuuteiksi ja sekunneiksi
        var lahtoaika = limit(TimeFormat.fromS(lahtoaikaNUM, 'hh:mm'),5);
        // Limitoi sekunnit pois

        // Aamuyön kellonaikojen korjaus (Klo 4 astai, koska seuraavan päivän vuorot alkavat yleensä klo 5)
        //lisätään "⁺¹" jos seuraava päivä
const todaysDate = new Date();
if(lahtopaiva[x].onlyDate() > todaysDate.onlyDate()) {
lahtoaika = lahtoaika + "‏‏‎⁺¹";
}
        if (lahtoaikaNUM > 86400) {
      let splitattu = lahtoaika.split(":");
           lahtoaika = splitattu[0]-24 +":"+ splitattu[1];
           lahtoaika = "0" + lahtoaika;
           if (todaysDate.getHours() > 4) {
             lahtoaika = lahtoaika + "‏‏‎⁺¹";
           }

        }


        var alert = alerts[x]
        // Yhdistää tiedot yhteen
        // Jos lähtö on suunniteltu
        if (realtimeTilat[x] == 'SCHEDULED') {
          // Jos linjalla
          if (pickupType[x] == 'SCHEDULED') {
            if (alert == "") {
              var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> " + maaranpaat[x] + "";
            } else {
              var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> " + maaranpaat[x] + "  ℹ️";
              poikkeus = true
            }

          } else if (pickupType[x] == 'NONE' && dropoffType[x] == 'SCHEDULED' && maaranpaat[x] !== null) {
            if (alert == "") {
              var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen";
            } else {
              var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen  ℹ️";
              poikkeus = true
            }

          } else if (pickupType[x] == 'NONE' && maaranpaat[x] !== null) {
            var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";
          } else if (pickupType[x] == 'NONE') {
            if (alert == "") {
              var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";
            } else {
              var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki  ℹ️";
              poikkeus = true
            }
          }

          // Jos lähtö on reaaliaikainen
        } else if (realtimeTilat[x] == 'UPDATED') {
          if (pickupType[x] == 'SCHEDULED') {
            if (alert == "") {
              var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> " + maaranpaat[x];
            } else {
              var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> " + maaranpaat[x] + "  ℹ️";
              poikkeus = true
            }

          } else if (pickupType[x] == 'NONE' && dropoffType[x] == 'SCHEDULED' && maaranpaat[x] !== null) {
            if (alert == "") {
              var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen";
            } else {
              var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen  ℹ️";
              poikkeus = true
            }

          } else if (pickupType[x] == 'NONE' && maaranpaat[x] !== null) {

            var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";

        } else if (pickupType[x] == 'NONE') {

          if (alert == "") {
            var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>‏‏‎•   <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";
          } else {
            var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>‏‏‎•   <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki  ℹ️";
            poikkeus = true
          }
        }
          // Jos peruttu vuoro
        } else if (realtimeTilat[x] == 'CANCELED') {
          var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>×‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> Peruttu";
        } else if (realtimeTilat[x] == 'MODIFIED') {
          var yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>!‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> " + maaranpaat[x];
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
Date.prototype.onlyDate = function () {
    var d = new Date(this);
    d.setHours(0, 0, 0, 0);
    return d;
};

module.exports = lahtoListaus;
