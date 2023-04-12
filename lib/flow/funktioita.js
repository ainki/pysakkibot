const bot = require('../../bot')
const limit = require('limit-string-length')
const TimeFormat = require('hh-mm-ss')

module.exports = {
  numMaara,
  chunkArray,
  filter,
  yonLahtoaika,
  capitalize
}

Date.prototype.onlyDate = function () {
  var d = new Date(this)
  d.setHours(0, 0, 0, 0)
  return d
}

function numMaara (viesti) {
  // tarkistetaan numeroiden määrä
  return viesti.replace(/[^0-9]/g, '').length
}

function chunkArray (myArray, chunk_size, funktio) {
  var results = []

  while (myArray.length) {
    results.push(myArray.splice(0, chunk_size))
  }

  if (funktio === 4) {
    results.push(['/liitynta'], [bot.button('/hae'), bot.button('/reitti'), bot.button('location', 'Sijaintisi mukaan 📍')])
  } else if (funktio === 5) {
    // ei mitään toistaiseksi
  } else {
    results.push([bot.button('/hae'), bot.button('/reitti'), bot.button('location', 'Sijaintisi mukaan 📍')])
  }

  return results
}

function filter (viesti, alkupera) {
  const komennot = ['/hae', '/help', '/liitynta', '/help', '/linja', '/start', '/pysakki', '/pys', '/poikkeukset', '/reitti', '/menu', '/git']

  if (viesti.includes('/')) {
    if (komennot.some(e => viesti.includes(e)) || alkupera !== 'pysakkiCheck') {
      return false
    } else {
      return true
    }
  } else {
    return true
  }
}
function yonLahtoaika (lahtoaikaNUM, lahtopaiva) {
  lahtopaiva = new Date(lahtopaiva * 1000)
  //  Muuttaa tunneiksi, minuuteiksi ja sekunneiksi
  lahtoaika = limit(TimeFormat.fromS(lahtoaikaNUM, 'hh:mm'), 5)
  //  Limitoi sekunnit pois

  // Aamuyön kellonaikojen korjaus (Klo 4 astai, koska seuraavan päivän vuorot alkavat yleensä klo 5)
  // lisätään "⁺¹" jos seuraava päivä
  const todaysDate = new Date()
  if (lahtopaiva.onlyDate() > todaysDate.onlyDate()) {
    lahtoaika = lahtoaika + '‏‏‎⁺¹'
  }
  if (lahtoaikaNUM > 86400) {
    const splitattu = lahtoaika.split(':')
    lahtoaika = splitattu[0] - 24 + ':' + splitattu[1]
    lahtoaika = '0' + lahtoaika
    if (todaysDate.getHours() > 4) {
      lahtoaika = lahtoaika + '‏‏‎⁺¹'
    }
  }
  return lahtoaika
}
function capitalize (str) {
  if (typeof str !== 'string') return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
