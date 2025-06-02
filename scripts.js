// Scripts will go here
$(document).ready(function () {
  function writeData() {
    var database = firebase.database();
    database.ref('test').set({
    hello: "world"
    });
  }
  writeData();
});
