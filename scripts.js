// Scripts will go here
$(document).ready(function () {
  function writeData() {
    firebase.database().ref('test').set({
    hello: "world"
    });
  }
  writeData();
});
