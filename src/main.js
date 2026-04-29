// Free Keys - main.js
const universalModifierToggle = document.getElementById('universal-modifier-toggle');
let universalModifierMode = true;   // default ON

universalModifierToggle.addEventListener('change', () => {
  universalModifierMode = universalModifierToggle.checked;
  console.log('Universal Modifier Mode:', universalModifierMode ? 'ON (every key = modifier, sequential)' : 'OFF (normal shortcuts)');
});

// TODO: Global key interception (UXP limitations noted in specs)
// When ON: first key → modifier, second key → execute
// When OFF: traditional shortcut handling

console.log('%c🚀 Free Keys loaded — Universal Modifier Mode ready!', 'color:#00a2ff; font-size:16px;');