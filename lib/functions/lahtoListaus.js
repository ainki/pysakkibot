// lahdot.js

var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');


function lahtoListaus(data, asetus) {

    var stops = jp.query(data, '$..stops')
    if (asetus == 2) {
        var Haku = jp.query(data, '$..stopTimesForPattern')
    } else {
        var Haku = jp.query(data, '$..stoptimesWithoutPatterns')
    }

    var pysakkienNimet = jp.query(stops, '$..name')
    var pysakkienKoodit = jp.query(stops, '$..code')
    var platformCode = jp.query(stops, '$..platformCode')

    var poikkeus = false;

    for (i = 0; i < Haku.length; i += 1) {
        var lahtoHaku = jp.query(Haku[i], '$..realtimeDeparture')

        if (Haku[i] == '') {
            // Älä tee mitään
        } else {
            // Hakee koodin ja nimen
            var pysakinNimi = pysakkienNimet[i]
            var pysakinKoodi = pysakkienKoodit[i]

            // Laittaa pysäkin nimen ja koodin viestiin
            if (lahdotPysakeilta == undefined) {
                if (platformCode[i] == null) {
                    var lahdotPysakeilta = 'Lähdöt pysäkiltä ' + pysakinNimi + ' - ' + pysakinKoodi + '\n\n'
                } else {
                    var lahdotPysakeilta = 'Lähdöt pysäkiltä ' + pysakinNimi + ' - ' + pysakinKoodi + ' - Lait. ' + platformCode[i] + '\n\n'
                }
            } else {
                if (platformCode[i] == null) {
                    lahdotPysakeilta = lahdotPysakeilta + '\nLähdöt pysäkiltä ' + pysakinNimi + ' - ' + pysakinKoodi + '\n\n'
                } else {
                    lahdotPysakeilta = lahdotPysakeilta + '\nLähdöt pysäkiltä ' + pysakinNimi + ' - ' + pysakinKoodi + ' - Lait. ' + platformCode[i] + '\n\n'
                }

            }
        }
        // Hakee lisää dataa
        var linjaTunnus = jp.query(Haku[i], '$..shortName')
        var maaranpaat = jp.query(Haku[i], '$..headsign')
        var realtimeTila = jp.query(Haku[i], '$..realtimeState')
        var pickupType = jp.query(Haku[i], '$..pickupType')
        var dropoffType = jp.query(Haku[i], '$..dropoffType')
        var alerts = jp.query(Haku[i], '$..alerts')

        for (x = 0; x < lahtoHaku.length; x += 1) {
            // Muista käyttää  x  
            if (Haku[i] == '') {
                // Älä tee mitään
            } else {
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

                var maaranpaa = maaranpaat[x];

                if (maaranpaa == null) {
                    var maaranpaa = "";
                } else {
                    // Do nothing
                }

                var alert = alerts[x]
                // Yhdistää tiedot yhteen
                // Jos lähtö on suunniteltu
                if (realtimeTila[x] == 'SCHEDULED') {
                    // Jos linjalla
                    if (pickupType[x] == 'SCHEDULED') {
                        if (alert == "") {
                            var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnus[x] + " " + maaranpaa + "\n";
                        } else {
                            var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnus[x] + " " + maaranpaa + "  ⚠️\n";
                            poikkeus = true
                        }

                    } else if (pickupType[x] == 'NONE' && dropoffType[x] == 'SCHEDULED' && maaranpaa !== '') {
                        if (alert == "") {
                            var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnus[x] + " Vain poistuminen\n";
                        } else {
                            var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnus[x] + " Vain poistuminen  ⚠️\n";
                            poikkeus = true
                        }

                    } else if (pickupType[x] == 'NONE' && maaranpaa == '') {
                        var yksittainenlahto = departuretimeshort + "‏‏‎     " + linjaTunnus[x] + " ⇥ Päätepysäkki\n";
                    }

                    // Jos lähtö on reaaliaikainen
                } else if (realtimeTila[x] == 'UPDATED') {
                    if (pickupType[x] == 'SCHEDULED') {
                        if (alert == "") {
                            var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjaTunnus[x] + " " + maaranpaa + "\n";
                        } else {
                            var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjaTunnus[x] + " " + maaranpaa + "  ⚠️\n";
                            poikkeus = true
                        }

                    } else if (pickupType[x] == 'NONE' && dropoffType[x] == 'SCHEDULED' && maaranpaa !== '') {
                        if (alert == "") {
                            var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjaTunnus[x] + " Vain poistuminen\n";
                        } else {
                            var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjaTunnus[x] + " Vain poistuminen  ⚠️\n";
                            poikkeus = true
                        }

                    } else if (pickupType[x] == 'NONE' && maaranpaa == '') {
                        var yksittainenlahto = departuretimeshort + "•‏‏‎   " + linjaTunnus[x] + " ⇥ Päätepysäkki\n";
                    }
                    // Jos peruttu vuoro
                } else if (realtimeTila[x] == 'CANCELED') {
                    var yksittainenlahto = departuretimeshort + "×‏‏‎   " + linjaTunnus[x] + " Peruttu\n";
                } else if (realtimeTila[x] == 'MODIFIED') {
                    var yksittainenlahto = departuretimeshort + "!‏‏‎   " + linjaTunnus[x] + " " + maaranpaa + "\n";
                }
                // Muuten
                else {
                    // Älä tee mitään
                }
                lahdotPysakeilta = lahdotPysakeilta + yksittainenlahto;
            }
        }
    }
    if (poikkeus == true) {
        return lahdotPysakeilta + "\nPoikkeuksia linjoilla. Lisätietoa: /poikkeukset"
    } else {
        if (lahdotPysakeilta == undefined) {
            return "Ei lähtöjä pysäkiltä."
        }
        return lahdotPysakeilta;
    }
}

module.exports = lahtoListaus;