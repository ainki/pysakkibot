//filter.js


 function filter (viesti, alkupera) {
  const komennot = ["/hae","/help","/liitynta","/help","/linja","/start","/pysakki","/pys"];
console.log(alkupera, viesti,"alkupera, viesti");
 let vaaratKomennot;

    switch (alkupera) {
      case "hae":
      console.log("case hae");
  vaaratKomennot = komennot.filter(e => e !== "/hae");
        for (let i = 0; i < vaaratKomennot.length; i++) {
          console.log(komennot.filter(e => e !== "/hae"), typeof vaaratKomennot,typeof komennot);

      if (viesti.includes(vaaratKomennot[i])) {

console.log("hae false");
        return false;
      }
}
console.log("hae true");
      return true;
      break;

      case "pysakki":
            console.log("case pysakki");
    vaaratKomennot = komennot.filter(e => e !== '/pysakki');
    vaaratKomennot = komennot.filter(e => e !== '/pys');

      for (let i = 0; i <vaaratKomennot.length; i++) {

      if (viesti.includes(vaaratKomennot[i])) {
        console.log("pysakki false");
        return false;
      }
}
console.log("pysakki true");
  return true;
      break;

      case "linja":
            console.log("case linja");
        vaaratKomennot = komennot.filter(e => e !== '/linja');
        for (let i = 0; i <vaaratKomennot.length; i++) {
      if (viesti.includes(vaaratKomennot[i])) {
        console.log("linja false");
        return false;
      }
    }
    console.log("linja true");
        return true;
      break;

      case "pysakkiCheck":
            console.log("case pysakkiCheck");
        for (let i = 0; i <vaaratKomennot.length; i++) {
      if (viesti.includes(vaaratKomennot[i])) {
        return false;
      }
    }
        return true;
      break;
      case "liitynta":
            console.log("case liitynta");
        vaaratKomennot = komennot.filter(e => e !== '/liitynta');
        for (let i = 0; i <vaaratKomennot.length; i++) {
      if (viesti.includes(vaaratKomennot[i])) {
        console.log("liitynta liitynta");
        return false;
      }
      }
      console.log("liitynta true");
        return true;
      break;
      default:
return true;
break;

    }
  };

module.exports = filter;
