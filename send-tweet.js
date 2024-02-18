const nodeHtmlToImage = require('node-html-to-image')
const fs = require('fs');

new Promise((resolve,reject) => {
  fs.readFile(`_site/moties/2024/moties/0bceb3df-d5f1-4f7e-827f-397fe0666018.html`, 'utf-8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // No file, return empty 
        resolve({});
      } else {
        reject(err);
      }
    } else {
      resolve(data);
    }
  });
})
.then(motieHtml => {
    return nodeHtmlToImage({
      output: './image.png',
      // TODO use the template instead somehow
      html: `
      <!doctype html>
      <html lang="en" data-bs-theme="dark">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
        <link rel="manifest" href="/site.webmanifest">
        <title>Moties met stemmingen van de Tweede Kamer</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
        <link rel="stylesheet" href="/assets/css/styles.css">
      </head>
      <body>
      ${motieHtml}
      </body>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>
      </html>
      `
    })
})
.then(() => console.log('The image was created successfully!'))