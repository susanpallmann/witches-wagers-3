// Scripts will go here
$(document).ready(function () {
  function writeData() {
    set(ref(db, 'test/'), {
    hello: "world"
    });
  }
  writeData();
});
