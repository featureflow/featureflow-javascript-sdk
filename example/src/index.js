// ============================================
// ES Module Import (Modern JavaScript)
// ============================================
import Featureflow from '../../dist/index.esm.js';
// Alternative: import Featureflow, { init, events, FeatureflowClient } from '../../dist/index.esm.js';

// ============================================
// CommonJS Import (Alternative - for Node.js without ES modules)
// ============================================
// const Featureflow = require('../../dist/index.js');

const FF_KEY = 'sdk-js-env-5f5a4c466e61460fa14e685cbb4abe40';

let user = {
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

const featureflow = Featureflow.init(FF_KEY, user, {
    streaming: true,
    defaultFeatures: {
      'example-feature': 'default-variant',
      'feature-1': 'on',
      'feature-2': 'red',
      'test': 'off'
    },
});

// Example: Evaluate a feature flag
console.log('=== Feature Evaluation Examples ===');
console.log('example-feature value:', featureflow.evaluate('example-feature').value());
console.log('Is feature-1 ON?', featureflow.evaluate('feature-1').isOn());
console.log('Is feature-2 red?', featureflow.evaluate('feature-2').is('red'));

document.querySelector('#user').innerHTML = JSON.stringify(user, false, 2);

//Setup the editor - wait for DOM to be ready
let editor;
function initializeEditor() {
  const editorElement = document.getElementById("editor");
  if (!editorElement) {
    return;
  }
  
  editor = ace.edit("editor");
  editor.setTheme("ace/theme/github");
  editor.getSession().setMode("ace/mode/json");
  editor.setHighlightActiveLine(false);
  editor.setShowPrintMargin(false);
  editor.getSession().setTabSize(2);
  editor.$blockScrolling = Number.POSITIVE_INFINITY;
  editor.setReadOnly(true);
  setupEditorHandlers();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEditor);
} else {
  initializeEditor();
}

function setupEditorHandlers() {
  editor.on('change', () => {
    const value = editor.getValue();
    const errors = document.querySelector('#errors');
    errors.innerHTML = '';
    try {
      const object = JSON.parse(value);
      if (typeof object.id !== 'string' && object.id){
        errors.innerHTML += ('<li>The property "id" is required to be a string</li>')
      }
      if (object.values){
        if (typeof object.values !== 'object' || object.attributes === null || Array.isArray(object.attributes)){
          errors.innerHTML += ('<li>The property "attributes" is required to be a flat object</li>');
        }
        else{
          const notFlat = Object.keys(object.attributes).filter((key) => {
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
}

function addListItem(id, text, badge){
  const el = document.querySelector(id);
  el.innerHTML = `${el.innerHTML}<li class='list-group-item'>
    ${text}
    ${badge ? `<span class='badge'>${badge}</span>` : '' }
  </li>`;
}

function logEvent(event, dataParam){
  const data = dataParam !== undefined ? dataParam : null;
  const date = new Date().toString();
  const el = document.querySelector('#logs tbody');
  el.innerHTML = `
      <tr>
        <td>${event}</td>
        <td>${JSON.stringify(data)}</td>
        <td>
          <small>${date}</small>
        </td>
      </tr>${el.innerHTML}`;
}


function renderFeature(key){
  const value = featureflow.evaluate(key).value();
  addListItem('#features', key, value.toString());
}

function render(){
  document.querySelector('#features').innerHTML = "";
  const features = featureflow.getFeatures();
  for (const property in features) {
    if (Object.prototype.hasOwnProperty.call(features, property)) {
      renderFeature(property, 'OFF');
    }
  }
  renderFeature("example-feature");
  renderFeature("example-feature");
  renderFeature("example-feature");

}

featureflow.on(Featureflow.events.LOADED_FROM_CACHE, (data) => {
  console.log('LOADED_FROM_CACHE', data);
  logEvent('LOADED_FROM_CACHE', data);
  render();
});

featureflow.on(Featureflow.events.INIT, (data) => {
  console.log('Init', data);
  logEvent('Init', data);
  render();
});

document.querySelector('#update-button').addEventListener('click', () => {
  document.querySelector("#view-visible").classList.add('hidden');
  document.querySelector("#edit-visible").classList.remove('hidden');
  // Use setTimeout to ensure the DOM has updated and CSS has been applied before resizing
  setTimeout(() => {
    if (editor) {
      editor.setReadOnly(false);
      editor.setValue(JSON.stringify(user, null, 2));
      editor.navigateFileStart();
      // Force resize after a brief delay to ensure the container is fully visible
      setTimeout(() => {
        editor.resize();
        // Ensure the editor container is visible
        const editorElement = document.getElementById("editor");
        if (editorElement) {
          editorElement.style.display = 'block';
          editorElement.style.width = '100%';
          editorElement.style.height = '200px';
        }
      }, 10);
    }
  }, 0);
});

document.querySelector('#save-button').addEventListener('click', () => {
  const errors = document.querySelector('#errors');
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

document.querySelector('#goal-button').addEventListener('click', () => {
  featureflow.goal('goal-button-clicked');
})

document.querySelector('#cancel-button').addEventListener('click', () => {
  editor.setValue(JSON.stringify(user, null, 2));
  document.querySelector("#view-visible").classList.remove('hidden');
  document.querySelector("#edit-visible").classList.add('hidden');
});


