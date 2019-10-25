module.exports = function numMaara(viesti) {
  //tarkistetaan numeroiden määrä
  return viesti.replace(/[^0-9]/g, "").length;
};
