//filter.js


 function filter (viesti, alkupera) {
  const komennot = ["/hae","/help","/liitynta","/help","/linja","/start","/pysakki","/pys"];
  
 let vaaratKomennot;

    switch (alkupera) {
      case "hae":

  vaaratKomennot = komennot.filter(e => e !== "/hae");
        for (let i = 0; i < vaaratKomennot.length; i++) {
          console.log(komennot.filter(e => e !== "/hae"), typeof vaaratKomennot,typeof komennot);

      if (viesti.includes(vaaratKomennot[i])) {


        return false;
      }
}

      return true;
      break;

      case "pysakki":

    vaaratKomennot = komennot.filter(e => e !== '/pysakki');
    vaaratKomennot = komennot.filter(e => e !== '/pys');

      for (let i = 0; i <vaaratKomennot.length; i++) {

      if (viesti.includes(vaaratKomennot[i])) {

        return false;
      }
}

  return true;
      break;

      case "linja":
        vaaratKomennot = komennot.filter(e => e !== '/linja');
        for (let i = 0; i <vaaratKomennot.length; i++) {
      if (viesti.includes(vaaratKomennot[i])) {

        return false;
      }
    }

        return true;
      break;

      case "pysakkiCheck":

        for (let i = 0; i <vaaratKomennot.length; i++) {
      if (viesti.includes(vaaratKomennot[i])) {
        return false;
      }
    }
        return true;
      break;
      case "liitynta":

        vaaratKomennot = komennot.filter(e => e !== '/liitynta');
        for (let i = 0; i <vaaratKomennot.length; i++) {
      if (viesti.includes(vaaratKomennot[i])) {

        return false;
      }
      }

        return true;
      break;
      default:
return true;
break;

    }
  };

module.exports = filter;
