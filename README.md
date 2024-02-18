[tkmoties.github.io](https://tkmoties.github.io)

Data is collected from the [ODATA API](https://opendata.tweedekamer.nl/documentatie/odata-api). 
This happens on a 2 hour timer by using an [Github Action](https://github.com/tkmoties/tkmoties.github.io/actions).
Collecting all the data takes ~7 minutes.

The data is then fed through Jekyll to generate a [static webpage](https://tkmoties.github.io) organized per year.
Building all the html takes ~2 minutes.

For test data and local testing run something like:

```bash
node motie-cache2.js 10
```

```bash
bundle exec jekyll serve --trace
```

Funny data:

- Zaak(f9fe166c-f651-46d9-851e-fdaa2e4a2c30)
- Zaak(dd16bd1f-31b2-40d0-a2db-73e55c749d9f)
