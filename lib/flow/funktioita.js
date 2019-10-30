const bot = require('../../bot');

module.exports = {
numMaara: numMaara,
chunkArray: chunkArray,
filter:filter
};
Date.prototype.onlyDate = function () {
    var d = new Date(this);
    d.setHours(0, 0, 0, 0);
    return d;
};
function numMaara(viesti) {
  //tarkistetaan numeroiden määrä
  return viesti.replace(/[^0-9]/g, "").length;
}
function chunkArray(myArray, chunk_size, funktio) {
  var results = [];

  while (myArray.length) {
    results.push(myArray.splice(0, chunk_size));
  }

  if (funktio == 4) {
    results.push(['/liitynta'],[bot.button('/hae'), bot.button('/reitti'), bot.button('location', 'Sijaintisi mukaan 📍')]);
  } else if (funktio == 5) {
    // ei mitään toistaiseksi
  } else {
    results.push([bot.button('/hae'), bot.button('/reitti'), bot.button('location', 'Sijaintisi mukaan 📍')]);
  }

  return results;
}
function filter (viesti,alkupera) {
 const komennot = ["/hae","/help","/liitynta","/help","/linja","/start","/pysakki","/pys","poikkeukset", "/reitti", "/menu"];

 for (let i = 0; i <komennot.length; i++) {

     if (viesti.includes(komennot[i])) {
       return false;
     }
}
if (viesti.includes("/") && alkupera !== "pysakkiCheck") {
return false;
}else {
 return true;

}

}
