import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
  
function writeData() {
  const db = getDatabase();
  set(ref(db, 'test'), {
    test: 'test'
  });
}
$(document).ready(function () {
  writeData();
});
