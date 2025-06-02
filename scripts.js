// Scripts will go here
$(document).ready(function () {
  function writeData() {
    let db = getDatabase(app);
    db.set(ref(db, 'test/'), {
    hello: "world"
    });
  }
  writeData();
});
