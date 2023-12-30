/*
  - Drop each motie per year in _data/{year}.json.
  - Create a page in moties/{year}/{id}.html
 */


  const urlApi = 'https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0';
  
  const motieExpand = `
  Besluit(
    $expand=Stemming(
      $filter=Verwijderd eq false
      ;$select=Id)
    ;$filter=Verwijderd eq false and StemmingsSoort ne null
    ;$select=Id
  )`
  
  const motieFilter = `
  Verwijderd eq false and Soort eq 'Motie' and Besluit/any(
    a: a/Verwijderd eq false and a/StemmingsSoort ne null
  )`
  
  const motieSelect = `Id,ApiGewijzigdOp`
  
  const url = `${urlApi}
  /Zaak?
  &$top=1
  &$orderby=ApiGewijzigdOp desc
  &$count=true
  &$expand=${motieExpand}
  &$filter=${motieFilter}
  &$select=${motieSelect}`;
  
  console.log(url);
  
  
          fetch(url)
          .then(response => {
            if (response.status != 200) {
              console.log(response)
            }
            return response;
          })
          .then(response => response.json())
          .then(odata => {
            console.log(odata);
          });