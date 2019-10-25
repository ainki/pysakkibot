//filter.js


 module.exports = function filter (viesti) {
  const komennot = ["/hae","/help","/liitynta","/help","/linja","/start","/pysakki","/pys"];
  for (let i = 0; i <komennot.length; i++) {

      if (viesti.includes(komennot[i])) {
        return false;
      }
}

  return true;
}
