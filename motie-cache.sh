echo "Set up dirs"

mkdir -p _data/moties/

for year in $(seq 2007 2025); do 
  mkdir -p moties/$year/moties;
  cp _templates/year-index.html moties/$year/index.html; 
done

echo "Start caching from https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0"

node motie-cache2.js
