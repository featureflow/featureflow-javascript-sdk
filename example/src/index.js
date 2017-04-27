import Featureflow from '../../src/index';
const FF_KEY = 'env-7ee02f8bbf2f4b8eadb135f22650274f';

var context = {
  values:{
    tier: 'gold',
    country: 'australia'
  }
};

var featureflow = Featureflow.init(FF_KEY, context, {
  streaming: true
});

document.querySelector('#context').innerHTML = JSON.stringify(context, false, 2);

//Setup the editor
var editor = ace.edit("editor");
editor.setTheme("ace/theme/github");
editor.getSession().setMode("ace/mode/json");
editor.setHighlightActiveLine(false);
editor.setShowPrintMargin(false);
editor.getSession().setTabSize(2);
editor.$blockScrolling = Infinity;

editor.on('change', function(){
  var value = editor.getValue();
  var errors = document.querySelector('#errors');
  errors.innerHTML = '';
  try {
    var object = JSON.parse(value);
    if (typeof object.key !== 'string' && object.key){
      errors.innerHTML += ('<li>The property "key" is required to be a string</li>')
    }
    if (object.values){
      if (typeof object.values !== 'object' || typeof object.values === null || Array.isArray(object.values)){
        errors.innerHTML += ('<li>The property "values" is required to be a flat object</li>');
      }
      else{
        var notFlat = Object.keys(object.values).filter(function(key){
            return typeof object.values[key] === 'object';
          }).length > 0;

        if (notFlat){
          errors.innerHTML += ('<li>The property "values" is required to be a flat object</li>')
        }
      }
    }
  }
  catch(err){
    errors.innerHTML += ('<li>Not valid JSON</li>');
  }
});

function addListItem(id, text, badge){
  var el = document.querySelector(id);
  el.innerHTML = el.innerHTML +
    `<li class='list-group-item'>
    ${text}
    ${badge ? `<span class='badge'>${badge}</span>` : '' }
  </li>`;
}

function logEvent(event, data){
  data = data !== undefined ? data : null;
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


function renderFeature(key){
  var value = featureflow.evaluate(key).value();
  addListItem('#features', key, value.toString());
}

function render(){
  document.querySelector('#features').innerHTML = "";
  let features = featureflow.getFeatures();
  for (var property in features) {
    if (features.hasOwnProperty(property)) {
      renderFeature(property, 'OFF');
    }
  }
}

featureflow.on(Featureflow.events.LOADED_FROM_CACHE, function(data) {
  console.log('LOADED_FROM_CACHE', data);
  logEvent('LOADED_FROM_CACHE', data);
  render();
});

featureflow.on(Featureflow.events.INIT, function(data) {
  console.log('Init', data);
  logEvent('Init', data);
  render();
});


featureflow.on(Featureflow.events.UPDATED_FEATURE, function(value){
  console.log('Live Update', value);
  logEvent('Live Update', value);
  render();
})

document.querySelector('#update-button').addEventListener('click', function updateContext(){
  editor.setValue(JSON.stringify(context, null, 2));
  editor.navigateFileStart();
  document.querySelector("#view-visible").classList.add('hidden');
  document.querySelector("#edit-visible").classList.remove('hidden');
});

document.querySelector('#save-button').addEventListener('click', function saveUpdateContext(){
  var errors = document.querySelector('#errors');
  if (errors.innerHTML !== ''){
    return alert('There are still errors with the JSON.');
  }
  try{
    context = JSON.parse(editor.getValue());
    featureflow.updateContext(context);
    document.querySelector('#context').innerHTML = JSON.stringify(context, false, 2);

    document.querySelector("#view-visible").classList.remove('hidden');
    document.querySelector("#edit-visible").classList.add('hidden');
  }catch(err){
    alert('Context is not a valid JSON object')
  }
});

document.querySelector('#goal-button').addEventListener('click', function(){
  featureflow.goal('goal-button-clicked');
})

document.querySelector('#cancel-button').addEventListener('click', function cancelUpdateContext(){
  editor.setValue(JSON.stringify(context, null, 2));
  editor.setReadOnly(true);

  document.querySelector("#view-visible").classList.remove('hidden');
  document.querySelector("#edit-visible").classList.add('hidden');
});


