async function fixDateseparators() {
  const dateSeparators = document.querySelectorAll('.date-separator');
  dateSeparators[0].parentNode.childNodes[1].childNodes[1].href = '#';
  for (var idx = 0; idx < dateSeparators.length - 1; idx += 1) {
    dateSeparators[idx].parentNode.childNodes[5].childNodes[1].href = dateSeparators[idx+1].childNodes[1].href;
  }
}

async function loadMoties() {
  let motieCounter = 0;
  let moties = [...document.querySelectorAll('.motie-placeholder')];
  moties.forEach(elem => {
    const year = elem.getAttribute('year');
    const Id = elem.getAttribute('motieId');
    fetch(`/moties/${year}/moties/${Id}.html`)
    .then(response => {
      if (response.status != 200) {
        console.log(response)
      }
      return response;
    })
    .then(response => response.text())
    .then(response => {
      motieCounter += 1;
      document.querySelector('#motiesLoadedCounter').innerText = motieCounter;
      if (!document.querySelector(`#loading-placeholder`).hidden) {
        document.querySelector(`#loading-placeholder`).hidden = true;
      }
      if (document.querySelector(`#${elem.getAttribute('date')}-separator`).hidden) {
        document.querySelector(`#${elem.getAttribute('date')}-separator`).hidden = false;
      }
      elem.insertAdjacentHTML('beforeend', response);
      document.querySelector('#progressMoties').children[0]
      .style.width = `${100 * motieCounter / moties.length}%`;
    })
  });
};