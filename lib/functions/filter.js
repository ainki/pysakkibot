//filter.js

 module.exports = function filter (viesti,alkupera) {
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

};
