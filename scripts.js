// Scripts will go here
$(document).ready(function () {
  function writeData() {
    db.set(ref(db, 'test/'), {
    hello: "world"
    });
  }
  writeData();
});
