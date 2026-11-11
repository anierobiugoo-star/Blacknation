//Browsers Storage

//This is a way to save data directly in the user's browser.
//So the data stays after the page refreshes or the browser closes.
//Browser resets once the user refresh the page if there's no browser's storage

//Categories of the browsers storage
//Local storage          Manual           -5mb
//Session storage        Tab closes       -5mb
//Cookies                Expiry           -4mb
//IndexedDB              Manual           Large Storage space

//1) Local Storage :
//Data saved in local storage never disappears unless the user cleans it up manually or the user clears browser data.

//SAVING OF DATA IN LOCAL STORAGE
localStorage.setItem("Username", "Alex");
localStorage.setItem("age",23);
localStorage.setItem("Address", "Iyiagu Estate");

//READING OF DATA
localStorage.getItem("Username");
localStorage.getItem("age");
localStorage.getItem("Adderss");

//DELETION OF A SAVED DATA
localStorage.removeItem("age");

// CLEARING THE ENTIRE STORAGE
localStorage.clear();

const UsersData = {
    Username : "Alex",
    Age: 23,
    Course: "Javascript Class"
}

localStorage.setItem("UserData", JSON.stringify(UsersData));

let saved = JSON.parse(localStorage.getItem(UsersData));

console.log(saved);
console.log(saved.Age);