console.log("hello world!")

var fs = require('fs');

const o = require('odata').o;
const odataTk = o('https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/')

function testDoc() {
  odataTk.get('Document(7a9b77f1-d230-4a00-9856-2f0f8e967e62)')
    .query()
    .then(function (data) {
      if (data.Id != '7a9b77f1-d230-4a00-9856-2f0f8e967e62') {
        console.error(data)
        throw new Error('Wrong id in test message, expected 7a9b77f1-d230-4a00-9856-2f0f8e967e62, received ' + data.Id);
      }
    }).catch(function (data) {
      console.error(data)
      throw new Error(`Error fetching test message, status=${data.status}, statusText=${data.statusText}`);
    });
}

// testDoc();

const year = 2023;
const filterMoties2023 = `Soort eq 'Motie' and year(GewijzigdOp) eq 2023`;
var chunkSize = 250;

(async () => {
  // try {
    let totalMoties = await odataTk.get(`Zaak/$count`)
      .query({
        $filter: filterMoties2023,
      })
    totalMoties += totalMoties % chunkSize;
    console.log(`Totaal aantal moties in ${year}: ${totalMoties}`);
    
    // totalMoties = 2;
    // chunkSize = 2;

    for (var chunkOffset = 0; chunkOffset < totalMoties; chunkOffset += chunkSize) {
      console.log(chunkOffset);
      await odataTk.get(`Zaak`)
        .query({
          $top: chunkSize,
          $skip: chunkOffset,
          $filter: filterMoties2023,
          $expand: `ZaakActor($filter=Relatie eq 'Indiener' or Relatie eq 'MedeIndiener'),Besluit($expand=Stemming)`
        })
        .then(function(moties) {
          // console.log(moties);
          for (const motie of moties) {
            // console.log(motie);
            var motieToCache = {};
            motieToCache.Id = motie.Id;
            motieToCache.Nummer = motie.Nummer;
            motieToCache.Titel = motie.Titel;
            motieToCache.Onderwerp = motie.Onderwerp;
            motieToCache.GewijzigdOp = motie.GewijzigdOp;
            motieToCache.Kabinetsappreciatie = motie.Kabinetsappreciatie;

            // console.log(`Titel: ${motie.Titel}`)
            // console.log(`Onderwerp: ${motie.Onderwerp}`)
            // console.log(`Datum: ${motie.GewijzigdOp}`)

            // console.log('Indiener(s):')
            // for (const indiener of motie.ZaakActor) {
            //   console.log(`\t${indiener.ActorNaam} (${indiener.ActorFractie})`)
            // }
            motieToCache.Indieners = motie.ZaakActor.map(function(v) { return [v.ActorNaam, v.ActorFractie]; });
            // const indieners = motie.ZaakActor.reduce(function(a, v) { return a + `${v.ActorNaam} (${v.ActorFractie}); ` }, '');
            // console.log(`Indieners: ${indieners}`)

            var besluitIdx = 0;
            motieToCache.Stemmingen = [];
            for (const besluit of motie.Besluit) {
              if (besluit.Stemming.length != 0) {
                var stemmingToCache = {};
                stemmingToCache.Resultaat = besluit.BesluitTekst;
                // console.log(`Besluit ${besluitIdx}`)
                // console.log(`Resultaat: ${besluit.BesluitTekst}`)
                // console.log(`Datum: ${besluit.GewijzigdOp}`)
                
                stemmingToCache.Fracties = {};
                var totals = {'Voor': 0, 'Tegen': 0, 'Anders': 0};
                for (const stem of besluit.Stemming) {
                  stemmingToCache.Fracties[stem.ActorFractie] = stem.Soort;

                  // console.log(`\t\tFractie: ${stem.ActorFractie} (${stem.FractieGrootte})`);
                  // console.log(`\t\tStem: ${stem.Soort}`);
                  // console.log(`\t\tDatum: ${stem.GewijzigdOp}`);

                  if (stem.Soort == 'Voor') {
                    totals['Voor'] += stem.FractieGrootte;
                  } else if (stem.Soort == 'Tegen') {
                    totals['Tegen'] += stem.FractieGrootte;
                  } else {
                    totals['Anders'] += stem.FractieGrootte;
                  }
                }
                
                const hoofdelijk = RegExp('\\(Hoofdelijk ([0-9]*)-([0-9]*)\\)', 'gm').exec(besluit.BesluitTekst);
                if (hoofdelijk != null) {
                  stemmingToCache.Voor = hoofdelijk[1];
                  stemmingToCache.Tegen = hoofdelijk[2];
                  stemmingToCache.Anders = 0;
                } else {
                  stemmingToCache.Voor = totals.Voor;
                  stemmingToCache.Tegen = totals.Tegen;
                  stemmingToCache.Anders = totals.Anders;
                }
                stemmingToCache.PercentVoor = Math.trunc(100 * totals.Voor / (totals.Voor + totals.Tegen));
                stemmingToCache.PercentTegen = 100 - stemmingToCache.PercentVoor;
                motieToCache.Stemmingen.push(stemmingToCache);
              }
              besluitIdx += 1;
            }
            // console.log(motieToCache);
            // motiesToChache.push(motieToCache);
            fs.writeFile(`_data/moties/y2023/${motie.GewijzigdOp}-${motie.Id}.json`, JSON.stringify(motieToCache), 'utf8', function(){});
          }
          // console.log(moties.length);
        })
    }

  // } catch (error) {
  //   console.log(error);
  //   throw new Error(`Error collecting motie count, status=${error.status}, statusText=${error.statusText}`);
  // }

  // https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Zaak?$top=1&$filter=Soort eq 'Motie' and year(ApiGewijzigdOp) eq 2023&$orderby=ApiGewijzigdOp desc&ZaakActor($filter=relatie eq 'Indiener' or relatie eq 'MedeIndiener'),Besluit($expand=Stemming)
  
    // .then(function(count) {
    //   console.log(count);
    // })
})();






// import { o } from 'odata';

// (async () => {
//   // chaining
//   const data1 = await o('https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0')
//     .get('Document(7a9b77f1-d230-4a00-9856-2f0f8e967e62)')
//     .query();

//   // handler
//   const oHandler = o('https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0');
//   const data2 = await oHandler
//     .get('Document(7a9b77f1-d230-4a00-9856-2f0f8e967e62)')
//     .query();
//   console.log(data1);
//   console.log(data2);
// })();


// o().config({
// 	endpoint: 'https://services.odata.org/V4/(S(ms4wufavzmwsg3fjo3eqdgak))/TripPinServiceRW/'
// });

// const oHandler = o('https://services.odata.org/V4/(S(ms4wufavzmwsg3fjo3eqdgak))/TripPinServiceRW/', { });

// oHandler.get('People').query().then(function(result) {
//     console.log(result);
//     // console.log(result.data);
// 	// result.data.FirstName = 'New Name';
// 	// return(result.save());
// }).then(function(result) {
//     console.log('First name is now New Name');
// });