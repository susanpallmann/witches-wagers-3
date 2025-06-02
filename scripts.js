// Scripts will go here
$(document).ready(function () {
  function writeData() {
    app.database().ref('users/' + userId).set({
      test: "test"
    });
  }
  writeData();
});
