import Featureflow from '../../src/index';
const FF_KEY = 'js-env-YOUR_KEY_HERE';

var user = {
  id: 'bob1',
  attributes:{
    tier: 'gold',
    name: 'Bob Hope',
    country: 'australia',
    roles: ['role1', 'role2'],
    favouriteNumber: 17,
    dob: new Date()
  }
};

/*var featureflow = Featureflow.init(FF_KEY, user, {
    streaming: true
});*/

var featureflow = Featureflow.init(FF_KEY, user, {
    defaultFeatures: {
      'feature-1': 'on',
      'feature-2': 'red',
      'test': 'off'
    },
});

document.querySelector('#user').innerHTML = JSON.stringify(user, false, 2);

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
    if (typeof object.id !== 'string' && object.id){
      errors.innerHTML += ('<li>The property "id" is required to be a string</li>')
    }
    if (object.values){
      if (typeof object.values !== 'object' || typeof object.attributes === null || Array.isArray(object.attributes)){
        errors.innerHTML += ('<li>The property "attributes" is required to be a flat object</li>');
      }
      else{
        var notFlat = Object.keys(object.attributes).filter(function(key){
            return typeof object.attributes[key] === 'object';
          }).length > 0;

        if (notFlat){
          errors.innerHTML += ('<li>The property "attributes" is required to be a flat object</li>')
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

document.querySelector('#update-button').addEventListener('click', function updateUser(){
  editor.setValue(JSON.stringify(user, null, 2));
  editor.navigateFileStart();
  document.querySelector("#view-visible").classList.add('hidden');
  document.querySelector("#edit-visible").classList.remove('hidden');
});

document.querySelector('#save-button').addEventListener('click', function saveUpdateUser(){
  var errors = document.querySelector('#errors');
  if (errors.innerHTML !== ''){
    return alert('There are still errors with the JSON.');
  }
  try{
    user = JSON.parse(editor.getValue());
    featureflow.updateUser(user);
    document.querySelector('#user').innerHTML = JSON.stringify(user, false, 2);

    document.querySelector("#view-visible").classList.remove('hidden');
    document.querySelector("#edit-visible").classList.add('hidden');
  }catch(err){
    alert('User is not a valid JSON object')
  }
});

document.querySelector('#goal-button').addEventListener('click', function(){
  featureflow.goal('goal-button-clicked');
})

document.querySelector('#cancel-button').addEventListener('click', function cancelUpdateUser(){
  editor.setValue(JSON.stringify(user, null, 2));
  editor.setReadOnly(true);

  document.querySelector("#view-visible").classList.remove('hidden');
  document.querySelector("#edit-visible").classList.add('hidden');
});


