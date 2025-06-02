// Scripts will go here
$(document).ready(function () {
  function writeData() {
    const db = getDatabase();
    set(ref(db, 'test'), {
      test: 'test'
    });
  }
  writeData();
});
