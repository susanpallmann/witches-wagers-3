// Scripts will go here
$(document).ready(function () {
  function writeData() {
    app.database().ref('users/' + 'test').set({
      test: "test"
    });
  }
  writeData();
});
