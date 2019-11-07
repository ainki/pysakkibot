// lahtoListaus.js

const jp = require('jsonpath');

const funktioita = require('../flow/funktioita');

//funktioita
const yonLahtoaika = funktioita.yonLahtoaika;

function lahtoListaus(data, pattern) {
  var stops = jp.query(data, '$..stops');
  var haku;
  haku = pattern ?  jp.query(data, '$..stopTimesForPattern') : jp.query(data, '$..stoptimesWithoutPatterns');

  var pysakkienNimet = jp.query(stops, '$..name');
  var pysakkienKoodit = jp.query(stops, '$..code');

  var vyohyke = jp.query(stops, '$..zoneId');
  var desc = jp.query(stops, '$..desc');
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
    var description = "";

    // Jos desc on undefined jätetään tyhjäksi
    if(desc[i]) {
      description = '  '+desc[i];
    }

    if (linjaTunnukset.length > 0) {
      viestiOK = true;
      // Laittaa pysäkin nimen ja koodin viestiin
      if (lahdotPysakeilta === "") {
        if (!data.stops[i].platformCode) {
          lahdotPysakeilta = '<b>' + pysakkienNimet[i] + '</b>  ' + vyohyke[i] +'\n'+ pysakkienKoodit[i] + description +'\n\n';
        } else {
          lahdotPysakeilta = '<b>' + pysakkienNimet[i] + '</b>  ' + vyohyke[i] +'\n'+pysakkienKoodit[i] + description + '  Lait. ' + data.stops[i].platformCode + '\n\n';
        }
      } else {
        if (!data.stops[i].platformCode) {
          lahdotPysakeilta += '\n<b>' + pysakkienNimet[i] + '</b>  ' + vyohyke[i] +'\n'+pysakkienKoodit[i] + description + '\n\n';
        } else {
          lahdotPysakeilta += '\n<b>' + pysakkienNimet[i] + '</b>  ' + vyohyke[i] +'\n'+pysakkienKoodit[i] + description + '  Lait. ' + data.stops[i].platformCode + '\n\n';
        }
      }
    } else if (i === haku.length -1 && !viestiOK) {
      return "Ei lähtöjä pysäkiltä "+pysakkienNimet[i] + " - " + pysakkienKoodit[i] + ".";
    }

    for (let x = 0; x < lahtoHaku.length; x++) {
      // Muista käyttää  x

      if (haku[i]) {
        let lahtoaika = yonLahtoaika(lahtoHaku[x],lahtopaiva[x]);


        var yksittainenlahto;
        // Yhdistää tiedot yhteen
        // Jos lähtö on suunniteltu
        //jos määränpää on null määränpääks tulee "tuntematon"
        maaranpaat[x] = maaranpaat[x] ? maaranpaat[x] : "tuntematon";
        if (realtimeTilat[x] == 'SCHEDULED') {
          // Jos linjalla

          if (pickupType[x] == 'SCHEDULED') {
            if (alerts[x] == "") {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> " + maaranpaat[x] + "";
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> " + maaranpaat[x] + "  ℹ️";
              poikkeus = true;
            }

          } else if (pickupType[x] == 'NONE' && dropoffType[x] == 'SCHEDULED' && maaranpaat[x] !== null) {
            if (alerts[x] == "") {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen";
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen  ℹ️";
              poikkeus = true;
            }

          } else if (pickupType[x] == 'NONE' && maaranpaat[x] !== null) {
            yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";
          } else if (pickupType[x] == 'NONE') {
            if (alerts[x] == "") {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki  ℹ️";
              poikkeus = true;
            }
          }

          // Jos lähtö on reaaliaikainen
        } else if (realtimeTilat[x] == 'UPDATED') {
          if (pickupType[x] == 'SCHEDULED') {
            if (alerts[x] == "") {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> " + maaranpaat[x];
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> " + maaranpaat[x] + "  ℹ️";
              poikkeus = true;
            }

          } else if (pickupType[x] == 'NONE' && dropoffType[x] == 'SCHEDULED' && maaranpaat[x] !== null) {
            if (alerts[x] == "") {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen";
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen  ℹ️";
              poikkeus = true;
            }

          } else if (pickupType[x] == 'NONE' && maaranpaat[x] !== null) {

            yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";

          } else if (pickupType[x] == 'NONE') {

            if (alerts[x] == "") {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>‏‏‎•   <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>‏‏‎•   <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki  ℹ️";
              poikkeus = true;
            }
          }
          // Jos peruttu vuoro
        } else if (realtimeTilat[x] == 'CANCELED') {
          yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>×‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> Peruttu";
        } else if (realtimeTilat[x] == 'MODIFIED') {
          yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>!‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> " + maaranpaat[x];
        }

        lahdotPysakeilta += yksittainenlahto + "\n";

      }
    }
  }
  if (poikkeus) {
    return lahdotPysakeilta + "\nPoikkeuksia linjoilla. Lisätietoa: /poikkeukset";
  } else {
    if (!lahdotPysakeilta) {
      return "Pysäkkiä ei löydy.";
    }

    return lahdotPysakeilta;
  }
}


module.exports = lahtoListaus;
