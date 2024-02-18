/*
  - Drop each motie per year in _data/{year}.json.
  - Create a page in moties/{year}/{id}.html
 */

var fs = require('fs');

const topVal = process.argv[2];
let top = ''
if (typeof topVal !== 'undefined') {
  top = `&$top=${topVal}`;
}

const urlApi = 'https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0';

const motieQuery = `
Besluit?
&$orderby=ApiGewijzigdOp desc
${top}
&$count=true
&$expand=Zaak(
  $expand=ZaakActor(
    $select=Id,ActorNaam,ActorFractie
    ;$filter=Relatie eq 'Indiener' or Relatie eq 'MedeIndiener'
  )
  ;$select=Id,Nummer,Titel,Onderwerp,Kabinetsappreciatie,GestartOp,GewijzigdOp,ApiGewijzigdOp
),
Stemming(
  $filter=Verwijderd eq false
  ;$select=Id,Soort,FractieGrootte,ActorNaam,ActorFractie
)
&$select=Id,BesluitSoort,StemmingsSoort,GewijzigdOp,ApiGewijzigdOp
&$filter=Verwijderd eq false and Zaak/any(a: a/Soort eq 'Motie') and StemmingsSoort ne null`

const url = `${urlApi}/${motieQuery}`

const motieCard = `---
---

{% assign year = page.path | split: "/" | slice: 1 | append: "" | slice: 2,4 %}
{% assign motieId = page.name | replace: ".html" %}

{% assign motie = site.data.moties[year][motieId] %}

{% include motie-card.html %}`;

// console.log(url);

(async () => {
  let nextLink = url;
  let motieTotal = undefined;
  let motieCount = 0;
  console.debug(nextLink);

  let metaData = await new Promise((resolve,reject) => {
    fs.readFile(`_data/meta.json`, 'utf-8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // No file, return empty 
          resolve({});
        } else {
          reject(err);
        }
      } else {
        resolve(JSON.parse(data));
      }
    });
  });

  if (!('motieMeta' in metaData)) {
    console.info('no motieMeta in metaData yet');
    metaData['motieMeta'] = {};
  }

  while (true) {
    nextLink = await fetch(nextLink)
    .then(response => {
      if (response.status != 200) {
        console.dir(response, {'depth': null});
        return Promise.reject(response);
      }
      return response.json();
    })
    .then(odata => {
      if (typeof odata.value === 'undefined') {
        console.debug(odata);
        return Promise.reject(odata.error);
      }
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
      let motieCache = {};

      // console.debug(moties);
      console.debug(nextLink);

      moties.forEach(motie => {
        const motieYear = motie.Zaak[0].GestartOp.slice(0,4);
        if (typeof motieCache[motieYear] === 'undefined') {
          motieCache[motieYear] = {};
        }
        motie.Stats = {
          Voor: 0,
          Tegen: 0,
          Anders: 0,
        }

        if (motie.StemmingsSoort == 'Hoofdelijk') {
          motie.Stemming.forEach(stem => {
            switch (stem.Soort) {
              case 'Voor':
                motie.Stats.Voor += 1;
                break;
              case 'Tegen':
                motie.Stats.Tegen += 1;
                break;
              default:
                motie.Stats.Anders += 1;
                break;
            }
          });
        } else {
          motie.Stemming.forEach(stem => {
            switch (stem.Soort) {
              case 'Voor':
                motie.Stats.Voor += stem.FractieGrootte;
                break;
              case 'Tegen':
                motie.Stats.Tegen += stem.FractieGrootte;
                break;
              default:
                motie.Stats.Anders += stem.FractieGrootte;
                break;
            }
          });
        }

        motieCache[motieYear][motie.Id] = motie;
        fs.writeFile(
          `moties/${motieYear}/moties/${motie.Id}.html`, 
          motieCard, 'utf8', (err) => { if (err) throw err });

        if (!(motie.Id in metaData.motieMeta)) {
          console.info(`${motie.Id} not in motieMeta yet`);
          metaData.motieMeta[motie.Id] = {
            year: motieYear,
            tweeted: false,
            stemmingSum: Object.values(motie.Stats).reduce((res, v) => res + v, 0),
          }
        }

        metaData.motieMeta[motie.Id]['tweeted'] = false;
        metaData.motieMeta[motie.Id]['stemmingSum'] = Object.values(motie.Stats).reduce((res, v) => res + v, 0);
        
      });
      motieCount += moties.length;
      console.log(`${motieCount} / ${motieTotal}`);
      return [motieCache, nextLink];
    })
    .then(args => {
      let [motieCache, nextLink] = args;

      for (const motieYear in motieCache) {
        new Promise((resolve,reject) => {
          fs.readFile(`_data/moties/${motieYear}.json`, 'utf-8', (err, data) => {
            if (err) {
              if (err.code === 'ENOENT') {
                // No file, return empty 
                resolve({});
              } else {
                reject(err);
              }
            } else {
              resolve(JSON.parse(data));
            }
          });
        })
        .then(oldData => {
          // console.log(oldData);
          // console.log({...oldData, ...motieCache[motieYear]});

          fs.writeFile(`_data/moties/${motieYear}.json`, 
              JSON.stringify({...oldData, ...motieCache[motieYear]}), 'utf8', (err) => { if (err) throw err });
        });

      }

      return nextLink;
    }).catch(error => {
      // Catch it to retry, seems to happen every now and then
      console.error(error);
      if (typeof error.cause !== 'undefined' && error.cause.code === 'ECONNRESET') {
        console.error(`Error while fetching ${url}, returning it to try again`)
        return url;
      } else {
        console.error(`Unhandled error while fetching ${url}`)
        throw error;
      }
    })

    // Stop if there are no more odata links, or motieTotal has been reached
    if (typeof nextLink == 'undefined' || motieCount > motieTotal) {
      break;
    }
  }

  fs.writeFile(`_data/meta.json`, 
    JSON.stringify(metaData), 'utf8', (err) => { if (err) throw err });


  // console.debug(metaData);
})();
