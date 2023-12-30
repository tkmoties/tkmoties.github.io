/*
  - Drop each motie per year in _data/{year}.json.
  - Create a page in moties/{year}/{id}.html
 */


var fs = require('fs');

const year = '2023'; //process.argv[2];

const urlApi = 'https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0';


const motieExpand = `
ZaakActor(
  $filter=Relatie eq 'Indiener' or Relatie eq 'MedeIndiener'  
  ;$select=Id,ActorNaam,ActorFractie,GewijzigdOp,ApiGewijzigdOp
),Besluit(
  $expand=Stemming(
    $filter=Verwijderd eq false
    ;$select=Id,Soort,FractieGrootte,ActorNaam,ActorFractie,GewijzigdOp,ApiGewijzigdOp)
  ;$filter=Verwijderd eq false and StemmingsSoort ne null
  ;$select=Id,BesluitSoort,StemmingsSoort,GewijzigdOp,ApiGewijzigdOp
)`

const motieFilter = `
Verwijderd eq false and Soort eq 'Motie' and Besluit/any(
  a: a/Verwijderd eq false and a/StemmingsSoort ne null
)`

const motieSelect = `Id,Nummer,Titel,Onderwerp,Kabinetsappreciatie,GestartOp,GewijzigdOp,ApiGewijzigdOp`

const yearFilter = `year(GestartOp) eq ${year}`

const url = `${urlApi}
/Zaak?
&$top=5
&$count=true
&$expand=${motieExpand}
&$filter=${motieFilter} and ${yearFilter}
&$select=${motieSelect}`;

const motieCard = `---
---

{% assign year = page.path | split: "/" | slice: 1 | append: "" | slice: 2,4 %}
{% assign motieId = page.name | replace: ".html" %}

{% assign motie = site.data.moties[year][motieId] %}

{% include motie-card.html %}`;

// console.log(url);

// (async () => {
  let nextLink = url;
  let motieTotal = undefined;
  let motieCount = 0;

  new Promise((resolve,reject) => {
    fs.readFile(`_data/moties/${year}.json`, 'utf-8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // No file, return empty 
          resolve({});
        } else {
          reject(err); // in the case of error, control flow goes to the catch block with the error occured.
        }
      } else {
        resolve(JSON.parse(data));  // in the case of success, control flow goes to the then block with the content of the file.
      }
    });
  })
  .then(async function(motieCache) {
    while (true) {
      nextLink = await fetch(nextLink)
        .then(response => {
          if (response.status != 200) {
            console.log(response)
          }
          return response;
        })
        .then(response => response.json())
        .then(odata => {
          let nextLink = undefined;
          if (typeof odata['@odata.nextLink'] !== 'undefined') {
            // If there is more data to retrieve, nextLink is set with the correct $skip value
            // Remove $count=true from it, only need that once
            nextLink = odata['@odata.nextLink'].replace('$count=true', '');
          }
          if (typeof odata['@odata.count'] !== 'undefined') {
            motieTotal = odata['@odata.count'];
          }
          return [odata.value, nextLink];
        }).then(args => {
          let [moties, nextLink] = args;
          moties.forEach(motie => {
            motie.Besluit.forEach(besluit => {
              besluit.Stats = {
                'Voor': 0,
                'Tegen': 0,
                'Anders': 0,
                'PercentVoor': 0,
                'PercentTegen': 100,
              }
  
              if (besluit.StemmingsSoort == 'Hoofdelijk') {
                besluit.Stemming.forEach(stem => {
                  switch (stem.Soort) {
                    case 'Voor':
                      besluit.Stats.Voor += 1;
                      break;
                    case 'Tegen':
                      besluit.Stats.Tegen += 1;
                      break;
                    default:
                      besluit.Stats.Anders += 1;
                      break;
                  }
                });
              } else {
                besluit.Stemming.forEach(stem => {
                  switch (stem.Soort) {
                    case 'Voor':
                      besluit.Stats.Voor += stem.FractieGrootte;
                      break;
                    case 'Tegen':
                      besluit.Stats.Tegen += stem.FractieGrootte;
                      break;
                    default:
                      besluit.Stats.Anders += stem.FractieGrootte;
                      break;
                  }
                });
              }
  
              besluit.Stats.PercentVoor = Math.trunc(100 * besluit.Stats.Voor / (besluit.Stats.Voor + besluit.Stats.Tegen));
              besluit.Stats.PercentTegen = 100 - besluit.Stats.PercentVoor;
            });
            motieCache[`${motie.Id}`] = motie;
            fs.writeFile(
              `moties/${year}/moties/${motie.Id}.html`, 
              motieCard, 'utf8', (err) => { if (err) throw err });
            motieCard
            // motieCache.push(motie);
            // console.dir(motie, {depth: null});
          });
          motieCount += moties.length;
          console.log(`${motieCount} / ${motieTotal}`)
          return nextLink;
        })
      if (typeof nextLink == 'undefined' || motieCount > motieTotal) {
        break;
      }
    }
    fs.writeFile(`_data/moties/${year}.json`, 
        JSON.stringify(motieCache), 'utf8', (err) => { if (err) throw err });
  });

  // // throw '';
  // while (true) {
  //   nextLink = await fetch(nextLink)
  //     .then(response => {
  //       if (response.status != 200) {
  //         console.log(response)
  //       }
  //       return response;
  //     })
  //     .then(response => response.json())
  //     .then(odata => {
  //       let nextLink = undefined;
  //       if (typeof odata['@odata.nextLink'] !== 'undefined') {
  //         // If there is more data to retrieve, nextLink is set with the correct $skip value
  //         // Remove $count=true from it, only need that once
  //         nextLink = odata['@odata.nextLink'].replace('$count=true', '');
  //       }
  //       if (typeof odata['@odata.count'] !== 'undefined') {
  //         motieTotal = odata['@odata.count'];
  //       }
  //       return [odata.value, nextLink];
  //     }).then(args => {
  //       let [moties, nextLink] = args;
  //       moties.forEach(motie => {
  //         motie.Besluit.forEach(besluit => {
  //           besluit.Stats = {
  //             'Voor': 0,
  //             'Tegen': 0,
  //             'Anders': 0,
  //             'PercentVoor': 0,
  //             'PercentTegen': 100,
  //           }

  //           if (besluit.StemmingsSoort == 'Hoofdelijk') {
  //             besluit.Stemming.forEach(stem => {
  //               switch (stem.Soort) {
  //                 case 'Voor':
  //                   besluit.Stats.Voor += 1;
  //                   break;
  //                 case 'Tegen':
  //                   besluit.Stats.Tegen += 1;
  //                   break;
  //                 default:
  //                   besluit.Stats.Anders += 1;
  //                   break;
  //               }
  //             });
  //           } else {
  //             besluit.Stemming.forEach(stem => {
  //               switch (stem.Soort) {
  //                 case 'Voor':
  //                   besluit.Stats.Voor += stem.FractieGrootte;
  //                   break;
  //                 case 'Tegen':
  //                   besluit.Stats.Tegen += stem.FractieGrootte;
  //                   break;
  //                 default:
  //                   besluit.Stats.Anders += stem.FractieGrootte;
  //                   break;
  //               }
  //             });
  //           }

  //           besluit.Stats.PercentVoor = Math.trunc(100 * besluit.Stats.Voor / (besluit.Stats.Voor + besluit.Stats.Tegen));
  //           besluit.Stats.PercentTegen = 100 - besluit.Stats.PercentVoor;
  //         });
  //         motieCache[`${motie.Id}`] = motie;
  //         fs.writeFile(
  //           `moties/${year}/${motie.Id}.html`, 
  //           motieCard, 'utf8', (err) => { if (err) throw err });
  //         motieCard
  //         // motieCache.push(motie);
  //         // console.dir(motie, {depth: null});
  //       });
  //       motieCount += moties.length;
  //       console.log(`${motieCount} / ${motieTotal}`)
  //       return nextLink;
  //     })
  //   if (typeof nextLink == 'undefined' || motieCount > motieTotal) {
  //     break;
  //   }
  // }
  // fs.writeFile(
  //   `_data/moties/${year}.json`, 
  //   JSON.stringify(motieCache), 'utf8', (err) => { if (err) throw err });
// })();