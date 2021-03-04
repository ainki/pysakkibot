![](https://i.imgur.com/Q1L1kvS.png)

## Pysäkkibot 2.0

Tekstipohjainen HSL reittiopas Telegram bottina. 

Pääset käyttämään bottia alla olevista linkeistä:

###### Pysäkkibot
[Klikkaa tästä niin pääset käyttämään bottia!](http://t.me/pysakkibot)
###### Kaupunkipyöräbot
[Klikkaa tästä niin pääset käyttämään kaupunkipyöräbottia!](http://t.me/kaupunkipyorabot)

## Ominaisuudet

Tässä listaus kaikista ominaisuuksista. 
Koodikentissä teksti jonka edessä on ">" on käyttäjän inputti.

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
>/hae

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
### Merkkien merkitykset
Kun etsit aikatauluja, kellonajan jälkeen voi olla "•". Tämä tarkoittaa, että kellonaika on reaaliajassa. Ilman merkkiä "•" kellonaika on aikataulun mukainen lähtöaika.
```
13:12‌‌‎•‌‌‎   Reaaliaikainen lähtöaika
13:22‌‌‎    Aikataulun mukainen lähtöaika
13:32‌‌‎×‏‏‎   Peruttu
13:42‌‌‎    Linjalla huomioita ℹ️
13:52    Linjalla muutoksia ⚠️
```

### /reitti
Reitti komennolla voit tehdä reittihaun paikasta A paikkaan B:
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
