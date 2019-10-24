// chunkArray.js

const bot = require('../../bot');

function chunkArray(myArray, chunk_size, funktio) {
  var results = [];

  while (myArray.length) {
    results.push(myArray.splice(0, chunk_size));
  }

  if (funktio == 4) {
    results.push(['/liitynta'],[bot.button('/hae'), bot.button('/linja'), bot.button('location', 'Sijaintisi mukaan 📍')]);
  } else {
    results.push([bot.button('/hae'), bot.button('/linja'), bot.button('location', 'Sijaintisi mukaan 📍')]);
  }

  return results;
}

module.exports = chunkArray;

/*
Funktionumerot:

0 - yleinen (ei käytössä toistaiseksi)
4 - liitynta
5 - pysakki


*/
