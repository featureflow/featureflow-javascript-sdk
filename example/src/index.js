import Featureflow from '../../src/index';
const FF_KEY = 'env-ba36e02748b0447da387682bfa49db23';

var context = {
  key: 'user1',
  values: {
    tier: 'gold',
    country: 'australia'
  }
};

var featureflow = Featureflow.init(FF_KEY, context, {});

function addListItem(id, text, badge){
  var el = document.querySelector(id);
  el.innerHTML = el.innerHTML +
  `<li class='list-group-item'>
    ${text}
    ${badge ? `<span class='badge'>${badge}</span>` : '' }
  </li>`;
}

function logEvent(event, data){
  data = data || null;
  var date = new Date().toString();
  var el = document.querySelector('#logs tbody');
  el.innerHTML = `
      <tr>
        <td>${event}</td>
        <td>${JSON.stringify(data)}</td>
        <td>
          <small>${date}</small>
        </td>
      </tr>`
    + el.innerHTML;
}


function render(key, failoverValue){
  var value = featureflow.evaluate(key, failoverValue);
  addListItem('#features', key, value.toString());

}
featureflow.on('update:context', function(context) {
  console.log('Updated!', context);
  renderContext();
  logEvent('Updated context', context);
});

featureflow.on('update:controls', function(controls){
  renderControls();
})

featureflow.on('ready', function() {
  logEvent('Ready');
  renderControls();
  renderContext();
  document.querySelector('#tier-button').addEventListener("click", changeTier);
});

function renderControls(){
  var features = document.querySelector("#features");
  while (features.firstChild) {
    features.removeChild(features.firstChild);
  }
  for (var property in featureflow.controls) {
    if (featureflow.controls.hasOwnProperty(property)) {
      render(property, 'OFF');
    }
  }
}

function renderContext(){
  document.querySelector('#context').innerText = JSON.stringify(featureflow.context, null, 2);
}

function changeTier(){
  var tier = document.querySelector('#tier-select').value;
  var context = {
    key: 'user1',
    values: {
      tier: tier,
      country: 'australia'
    }
  };
  featureflow.updateContext(context);
}

