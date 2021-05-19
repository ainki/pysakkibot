// lahtoListaus.js

const jp = require('jsonpath');

const funktioita = require('../flow/funktioita');

//funktioita
const yonLahtoaika = funktioita.yonLahtoaika;

function lahtoListaus(data, pattern) {
  const stops = jp.query(data, '$..stops');
  const haku = pattern ?  jp.query(data, '$..stopTimesForPattern') : jp.query(data, '$..stoptimesWithoutPatterns');

  const pysakkienNimet = jp.query(stops, '$..name');
  const pysakkienKoodit = jp.query(stops, '$..code');

  var vyohyke = jp.query(stops, '$..zoneId');
  var desc = jp.query(stops, '$..desc');
  var poikkeus = false;
  var huomio = false;
  var lahdotPysakeilta = "";
  let viestiOK = false;

  for (let i = 0; i < haku.length; i++  ) {

    const lahtoHaku = jp.query(haku[i], '$..realtimeDeparture');
    const linjaTunnukset = jp.query(haku[i], '$..shortName');
    const realtimeTilat = jp.query(haku[i], '$..realtimeState');
    const pickupType = jp.query(haku[i], '$..pickupType');
    const dropoffType = jp.query(haku[i], '$..dropoffType');

if (!pysakkienKoodit[i]) pysakkienKoodit[i] = "";
if (!vyohyke[i]) vyohyke[i] = "Ei HSL";


    // Jos desc on undefined jätetään tyhjäksi
    const  description = desc[i] ? '  '+desc[i] : "";


    if (linjaTunnukset.length > 0) {

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
    } else if (i === haku.length -1) {
      return "Ei lähtöjä pysäkiltä "+pysakkienNimet[i] + " - " + pysakkienKoodit[i] + ".";
    }

    for (let x = 0; x < lahtoHaku.length; x++) {
      // Muista käyttää  x

      if (haku[i]) {
        const lahtoaika = yonLahtoaika(lahtoHaku[x],haku[i][x].serviceDay);
        const alertTaso = jp.query(haku[i][x], '$..alertSeverityLevel');

        var yksittainenlahto;
        // Yhdistää tiedot yhteen
        // Jos lähtö on suunniteltu
        let headsign = haku[i][x].headsign;
        //jos määränpää on null määränpääks tulee "tuntematon"
        headsign = haku[i][x].headsign ? haku[i][x].headsign : "tuntematon";
        //poistetaan turha "via" jos on
        if (headsign.slice(-4) === " via") {
          headsign = headsign.slice(0,-4);
        }

        if (realtimeTilat[x] == 'SCHEDULED') {
          // Jos linjalla

          if (pickupType[x] == 'SCHEDULED') {
            if (!alertTaso[0]) {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> " + headsign + "";
            } else if (alertTaso[0] == 'WARNING' || alertTaso[0] == 'SERVE') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> " + headsign + "  ⚠️";
              poikkeus = true;
            } else if (alertTaso[0] == 'INFO') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> " + headsign + "  ℹ️";
              huomio = true;
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> " + headsign + "";
            }

          } else if (pickupType[x] == 'NONE' && dropoffType[x] == 'SCHEDULED' && headsign !== 'tuntematon') {
            if (!alertTaso[0]) {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen";
            } else if (alertTaso[0] == 'WARNING' || alertTaso[0] == 'SERVE') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "</b> ㊀ Vain poistuminen  ⚠️";
            } else if (alertTaso[0] == 'INFO') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen  ℹ️";
              huomio = true;
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen";
            }

          } else if (pickupType[x] == 'NONE' && headsign == 'tuntematon') {
            yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";
          } else if (pickupType[x] == 'NONE') {
            if (!alertTaso[0]) {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";
            } else if (alertTaso[0] == 'WARNING' || alertTaso[0] == 'SERVE') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki  ⚠️";
              poikkeus = true;
            } else if (alertTaso[0] == 'INFO') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki  ℹ️";
              huomio = true;
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>     <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";
            }
          }

          // Jos lähtö on reaaliaikainen
        } else if (realtimeTilat[x] == 'UPDATED') {
          if (pickupType[x] == 'SCHEDULED') {
            if (!alertTaso[0]) {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> " + headsign;
            } else if (alertTaso[0] == 'WARNING' || alertTaso[0] == 'SERVE') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> " + headsign + "  ⚠️";
              poikkeus = true;
            } else if (alertTaso[0] == 'INFO') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> " + headsign + "  ℹ️";
              huomio = true;
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> " + headsign;
            }

          } else if (pickupType[x] == 'NONE' && dropoffType[x] == 'SCHEDULED' && headsign !== 'tuntematon') {
            if (!alertTaso[0]) {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen";
            } else if (alertTaso[0] == 'WARNING' || alertTaso[0] == 'SERVE') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen  ⚠️";
              poikkeus = true;
            } else if (alertTaso[0] == 'INFO') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen  ℹ️";
              huomio = true;
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> ㊀ Vain poistuminen";
            }

          } else if (pickupType[x] == 'NONE' && headsign == 'tuntematon') {

            yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>•‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";

          } else if (pickupType[x] == 'NONE') {

            if (!alertTaso[0]) {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>‏‏‎•   <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";
            } else if (alertTaso[0] == 'WARNING' || alertTaso[0] == 'SERVE') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>‏‏‎•   <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki  ⚠️";
              poikkeus = true;
            } else if (alertTaso[0] == 'INFO') {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>‏‏‎•   <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki  ℹ️";
              huomio = true;
            } else {
              yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>‏‏‎•   <b>" + linjaTunnukset[x] + "‏‏‎</b> ⇥ Saapuu / Päätepysäkki";
            }
          }
          // Jos peruttu vuoro
        } else if (realtimeTilat[x] == 'CANCELED') {
          yksittainenlahto = '<b><s>' + lahtoaika + "‏‏‎</s></b>×‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> Peruttu  ⚠️";
        } else if (realtimeTilat[x] == 'MODIFIED') {
          yksittainenlahto = '<b>' + lahtoaika + "‏‏‎</b>!‏‏‎   <b>" + linjaTunnukset[x] + "‏‏‎</b> " + headsign;
        }

        lahdotPysakeilta += yksittainenlahto + "\n";

      }
    }
  }
  if (poikkeus) {
    return lahdotPysakeilta + "\nPoikkeuksia linjoilla. Lisätietoa: /poikkeukset";
  } else if (huomio) {
    return lahdotPysakeilta + "\nHuomioita linjoilla. Lisätietoa: /poikkeukset";
  } else {
    if (!lahdotPysakeilta) {
      return "Pysäkkiä ei löydy.";
    }

    return lahdotPysakeilta;
  }
}


module.exports = lahtoListaus;
