![](https://i.imgur.com/CJqZIgK.png)

## Pysäkkibot 2.0

Tekstipohjainen HSL reittiopas Telegram-bottina.

Pääset käyttämään bottia alla olevista linkeistä:

###### Pysäkkibot
[Klikkaa tästä niin pääset käyttämään bottia!](http://t.me/pysakkibot)
###### Kaupunkipyöräbot
[Klikkaa tästä niin pääset käyttämään kaupunkipyöräbottia!](http://t.me/kaupunkipyorabot)

## Ominaisuudet ja käyttöohjeet

Tässä listaus kaikista ominaisuuksista:
Koodikentissä teksti jonka edessä on ">" on käyttäjän lähettämää.

### /hae

Tällä komennolla voit etsiä pysäkkiä tai asemaa sen nimen tai koodin avulla ja saada seuraavat lähdöt. Esim:
```
> /hae Kamppi

Etsit pysäkkiä Kamppi.
Valitse alla olevista vaihtoehdoista oikea pysäkki!...

> /H1249

Kamppi  A
H1249  Kamppi  Lait. 49

13:18‌‌‎     212‌‌‎ Kauniala via Kauniainen as.
13:35‌‌‎     213‌‌‎ Kauklahti via Espoon keskus...
```
```
> /hae

Anna pysäkin nimi tai koodi 😄

> /H1234

Lapinrinne  A
H1234  Lapinrinne

13:12‌‌‎•‌‌‎   21‌‌‎ Lauttasaari (M) via Vattuniemi
13:22‌‌‎     21‌‌‎ Lauttasaari (M) via Vattuniemi...
```
Voit myös hakea pysäkkiä suoraan pelkällä koodilla:
```
> /V0661
```
Jos haluat etsiä enemmän kuin 10 lähtöä lisää vain pysäkin koodin jälkeen pilkku ja kuinka monta seuraavaa lähtöä haluat:
```
> /V0662, 20
```

#### /pysakki tai /pys
Toimii kuin /hae, mutta vastaukseksi saat myös pysäkin sijainnin.
```
> /pysakki E3311
```

### Merkkien merkitykset
Kun etsit aikatauluja, kellonajan jälkeen voi olla "•". Tämä tarkoittaa, että kellonaika on reaaliajassa. Ilman merkkiä "•" kellonaika on aikataulun mukainen lähtöaika.
```
13:12‌‌‎•‌‌‎   Reaaliaikainen lähtöaika
13:22‌‌‎    Aikataulun mukainen lähtöaika
13:32‌‌‎⁺¹‌‌‎  Lähtöaika seuraavana päivänä
13:42‌‌‎×‏‏‎   Peruttu
13:52‌‌‎    Linjalla huomioita ℹ️
14:02    Linjalla muutoksia ⚠️
```

### /reitti
Reitti-komennolla voit hakea reitin paikasta A paikkaan B:
```
> /reitti

Anna reitin lähtöpaikka!  😃

> Kamppi

Anna vielä määränpää!  😉

> Töölönkatu 49

Reittiehdotukset
Kamppi, Kampinkuja 1, Helsinki
Töölönkatu 49, Helsinki...
```
```
> /reitti Kompassikatu 9 A, H0822
```
Hakuun voi käyttää osoittetia, pysäkkejä, paikkoja jne.

Voit lisätä komentoon myös halutun lähtöajan:
```
> /reitti Kompassikatu 9 A, H0822, 14:15
```
Myös päivämäärän voi lisätä:
```
> /reitti Kompassikatu 9 A, H0822, 14:15 10.3
```
### /liitynta
Hae liityntäpysäköinnin tietoja sen nimellä tai numerolla. Realiaikainen data vapaista paikoista on saatavilla vasta muutamilla pysäköintialueilla.
```
> /liitynta ruoholahti
```
### /linja
Hae lähtöjä tietylle linjalle tietyltä pysäkiltä. Anna linjan tunnus ja valitse pysäkki ja saat 10 seuraavaa lähtöä.
```
> /linja 112

Määränpäät linjalle 112:

1 - Tapiola (M)
2 - Matinkylä (M)

Valitse määränpää näppäimistöstä!

> 1

Valitse pysäkki näppäimistöstä!

> Niittymaa

Niittymaa  B
E2134  Merituulentie

14:50‌‌‎•‌‌‎   112‌‌‎ Tapiola(M)
15:05‌‌‎•‌‌‎   112‌‌‎ Tapiola(M)...
```
### Sijainti
Lähettämällä sijainnin tai valitsemalla "Sijaintisi mukaan" botin näppäimistöstä voi hakea lähimpien pysäkkien lähtöjä.
```

> [ sijainti ]

Lähdöt lähelläsi:

Jokelan asema - Tu6000 → 10m
14:54    967 Kellokoski via Linjamäki
15:03    966 Terrisuo via Vanhankylän koulu
15:40    965 Hyrylä via Jäniksenlinna
17:25    967K Kellokoski via Purola-Linjamäki

Jokela - Tu0104 → 108m
14:59•  R Riihimäki

```
Lisää lähtöjä lähellä olevilta pysäkeiltä saa valitsemalla botin näppäimistöstä pysäkin koodin.
