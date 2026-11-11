
        function greet(name) {
            console.log("Hello, " + name + "!");
        }

        greet("Ugochukwu"); // This will call the function and print "Hello, Ugochukwu!" to the console.

        // Anonymous function
        const greet2 = function(name) {
            console.log("Hello, " + name + "!");
        }

        greet2("Chukwuemeka"); // This will call the anonymous function and print "Hello, Chukwuemeka!" to the console.

        // functions with parameters and return values

        function add(a, b) {
            return a + b;
        }

        add(5, 3); // This will return 8, but since we are not logging it, it won't show in the console.)
        const sum = add(5, 3);
        console.log(sum); // This will print 8 to the console.

        // Arrow functions in JavaScript
        // this is a shorter syntax for writing functions in JavaScript. Arrow functions are anonymous and change the way "this" binds in functions.

        const sum1 = (a, b) => {
            return a + b;
        }

        console.log(sum1(5, 6)); // This will print 11 to the console.

        // Default parameters in JavaScript functions
        function greet3(name = "Guest") {
            console.log("Hello, " + name + "!");
        }

        greet3(); // This will print "Hello, Guest!" to the console.
        greet3("Alice"); // This will print "Hello, Alice!" to the console.

        // Higher-order functions in Javascript

        // this is a function that takes another function as an argument or returns a function as a result. 

        function greet4(name) {
            name();
        }

        function sayHello(user) {
            console.log("Hello!, " + user + "! Welcome to JavaScript programming.");
        }

        greet4(() => sayHello("Alex")); // Output: "Hello!, Alex! Welcome to JavaScript programming."

        //Callback functions in JavaScript

        // this is a function that is passed as an argument to another function and is executed after some operation has been completed.

        function processOrder(order, callback) {
            console.log("Processing order: " + order);
            callback();
        }

        function orderComplete() {
            console.log("Order complete!");
        }

        processOrder("Pizza", orderComplete); // Output: "Processing order: Pizza" followed by "Order complete!"

        // Example 2: Using callback with parameters with setTimeout

        console.log("Data is being accessed");

        setTimeout(() => {
            console.log("Data has been accessed");
        }, 3000)

        console.log("Other operations can be performed while waiting for data...");

        // Output:
        // "Data is being accessed"
        // "Other operations can be performed while waiting for data..."
        // (after 3 seconds) "Data has been accessed"
 
        // Given global variable (do not change)
let accountBalance = 20000;

// Question 1: Basic Withdrawal
function checkAccount(pin, withdrawalAmount, callback) {
    console.log("Card inserted...");
    console.log("Processing... please wait");

    if (pin !== 1234) {
        callback("error", "Incorrect PIN. Transaction declined.");
        return;
    }

    if (withdrawalAmount <= accountBalance) {
        callback("success", withdrawalAmount);
    } else {
        callback("failure", "Insufficient funds. Transaction declined.");
    }
}

// Question 2: Handle the Result
function transactionResult(status, data) {
    if (status === "success") {
        console.log(`Withdrawal complete! You withdrew: ₦${data}`);
    } else if (status === "failure" || status === "error") {
        console.log(data);
    }
}

// Question 3: Test Your POS Machine
checkAccount(1234, 5000, transactionResult);   // Should succeed
checkAccount(1234, 50000, transactionResult);  // Should fail
checkAccount(9999, 5000, transactionResult);   // Should decline (error)

//Arrays in JavaScript
//An array is a data structure that can hold multiple values of different types. 
// It is a special type of object that has properties and methods for manipulating the data it contains. 
// The syntax for creating an array in JavaScript is as follows:

const fruits = ["Apple", "Banana", "Orange"];
console.log(fruits[0]); // Output: Apple

//check for the length of the array we make use of the length property of the array
console.log(fruits.length); // Output: 3

//looping through an array
for (let i = 0; i < fruits.length; i++) {
  console.log(fruits[i]);
} 

//you can also use the for...of loop to loop through an array

const colors = ["Red", "Green", "Blue"];

for (let color of colors) {
  console.log(color);
}


//changing an array item
fruits[1] = "Mango"; // changes the second item in the array to "Mango"
console.log(fruits); // Output: ["Apple", "Mango", "Orange"]



//ForEach method to loop through an array
//The foreach method executes a provided function once for each array element.
//Just like assigning a function  that loops through ther array and logs each element to the console
//The for..of is like looping through the array and logging each element to the console

//array is an object that has a method called forEach that takes a callback function as
//  an argument and executes it for each element in the array.

// arrays pop method is used to remove the last element from an array,
//  arrays shift method is used to remove the first element from an array,
//  arrays unshift method is used to add an element to the beginning of an array.

const sports = ["Football", "Basketball", "highJump", "carRacing"];

sports.forEach(function (sport) {
  console.log(sport);
});

//when using a for...of to through the same array

for (let sport of sports){
  console.log(sport)
}

  


//arrays push,pop,shift and unshift methods
fruits.push("pinapple"); // adds Grapes to the end of the array
console.log(fruits); // Output: ["Apple", "Banana", "grape", "Grapes"]
fruits.pop(); // removes the last element from the array
console.log(fruits); // Output: ["Apple", "Banana", "Orange"]
fruits.unshift("Mango"); // adds Mango to the beginning of the array
console.log(fruits); // Output: ["Mango", "Apple", "Banana", "Orange"]
fruits.shift(); // removes the first element from the array
console.log(fruits); // Output: ["Apple", "Banana", "Orange"] 

//array methods in javascript





// The filter method
// The filter method creates a new array with all elements that pass the test implemented by the provided function.

// const highValueItmes = cart.filter(function(price) {
//   return price > 150;
// });
// console.log(highValueItmes); // Output: [200,300]

// The Find method
// The Find method returns the value of the first element in the array that satisfies the provided testing function.
// const firstExpensiveItem = cart.find(function (price) {
//   return price > 150; // find the first item with a price greater that 150
// });
// console.log(firstExpensiveItem); // Output: 200

// another example of the find method
const students = ['Anthony', 'JohnPaul', 'Sylvia Okoye', 'Chidimma']

// Let's use array method to find an item.

const FindName = students.find(function(result) {
    return result === "Sylvia"
});
console.log(FindName);// Output: "Sylvia"
    
// Assignment research on the reduce methoid.
// create 1 example of using the method.

// The Next Topic OBJECTS IN JAVA SCRIPT

// object in Javascript
// What is an object?
// An object is a collection of properties, where each property is a key


// Creating a new object using constructor function

function Person(name, age, city) {
  this.name = name;
  this.age = age;
  this.city = city;
}
//"this" refers to the current instance of the object being created.

const person1 = new Person("John", 30, "New York");
console.log(person1.name); // Output: John
console.log(person1.age); // Output: 30
console.log(person1.city); // Output: New York

// Creating a new object using object.create() method

const person2 = Object.create(person1);
person2.name = "Jane";
person2.age = 25;
person2.city = "Los Angeles";
console.log(person2.name); // Output: Jane
console.log(person2.age); // Output: 25
console.log(person2.city); // Output: Los Angeles

// Adding a new property to an existing object
person2.country = "USA";
person2.phoneNumber = "123-456-7890";
console.log(person2.country); // Output: USA
console.log(person2.phoneNumber); // Output: 123-456-7890

// Deleting a property from an object using the delete method

delete person2.phoneNumber;

console.log(person2.phoneNumber);  Output: undefined

// updating a property of an object
person2.age = 26;
console.log(person2.age); // Output: 26

// Looping through an object using for...in loop
// for in loop
const person3 = {
  name: "Jane",
  age: 25,
  city: "Los Angeles",
  country: "USA"
};
for (let key in person3) {
  console.log(key + ": " + person3[key]);
}

// Nested objects in JavaScript
const student = {
  name: "John",
  age: 20,
  address: {
    street: "123 Main St",
    city: "New York",
    state: "NY"
  }
};
console.log(student.address.city); // Output: New York

// Using bracket notation to access object properties
console.log(student["name"]); // Output: John
console.log(student["address"]["street"]); // Output: 123 Main St
console.log(student["address"]["city"]); // Output: New York

// Object methods in JavaScript
// Object methods are functions that are defined as properties of an object. They can be used to perform operations on the object or to manipulate its properties.
// perform actions on the object or to return information about the object.

const car = {
    make: "Toyota",
    model: "Camry",
    year: 2020,
    getCarInfo: function() {
        return this.make + " " + this.model + " (" + this.year + ")";
    }
};
console.log(car.getCarInfo()); // Output: Toyota Camry (2020)

// Object destructuring in JavaScript
// Object destructuring is a syntax that allows you to extract values from an object and assign them to variables in a more concise way.
// The syntax for object destructuring is as follows:

const user = {
    name: "John",
    age: 30,
    city: "New York"
};

const { name, age, city } = user;
console.log(name); // Output: John
console.log(age); // Output: 30 
console.log(city); // Output: New York

// Spread operator in JavaScript
// The spread operator is a syntax that allows you to expand an iterable (like an array or an object) into individual elements. It is denoted by three dots (...).
// The spread operator can be used to create a new array or object by copying the properties of an existing one.    
// this is the symbol for the spread operator

const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combinedArr = [...arr1, ...arr2]; // combine arr1 and arr2 using the spread operator
console.log(combinedArr); // Output: [1, 2, 3, 4, 5, 6]

// Copying an object using the spread operator
const originalArr = [1, 2, 3];
const copiedArr = [...originalArr]; // Create a copy of originalArr using the spread operator
console.log(copiedArr); // Output: [1, 2, 3]

// Merging two objects using the spread operator
const obj1 = { a: 1, b: 2 };
const obj2 = { c: 3, d: 4 };
const mergedObj = { ...obj1, ...obj2 };
console.log(mergedObj); // Output: { a: 1, b: 2, c: 3, d: 4 }

// Updating while coping an object using the spread operator
const originalObj = { name: "John", age: 30 };
const updatedObj = { ...originalObj, age: 31 }; // Create a copy of originalObj and update the age property
console.log(updatedObj); // Output: { name: "John", age: 31 }


// Object.keys() , Object.values, Object.entries() in JavaScript

// Object.keys example
console.log(Object.keys(originalObj)); // Output: ["name", "age"]

// Object.values example
console.log(Object.values(originalObj)); // Output: ["John", 30]

// Object.entries example
console.log(Object.entries(originalObj)); // Output: [["name", "John"], ["age", 30]]


// Dates in Javascript
// There are javascript build-in objects that helps in the datetime management in javascript.

let todaysDate = new Date();

// Creates a new javascript object in javascript.

console.log(todaysDate); // Output: current date and time

// Methods in javascript that helps us to get a particular date or time that we want to display.
console.log(todaysDate.getFullYear()); // Output: current year
console.log(todaysDate.getMonth()); // Output: current month (0-11, where 0 is January and 11 is December)
console.log(todaysDate.getDate()); // Output: current day of the month (1-31)
console.log(todaysDate.getHours());
console.log(todaysDate.getMinutes());
console.log(todaysDate.getSeconds());
console.log(todaysDate.getMilliseconds());
console.log(todaysDate.getDay()); // Output: current day of the week (0-6, where 0 is Sunday and 6 is Saturday)
console.log(todaysDate.getTime()); // Output: current time in milliseconds since January 1, 1970

// Index correction in Javascripts for the months and the weekdays.

// For the month, we need to add 1 to the value returned by getMonth() to get the correct month number (1-12).
console.log(todaysDate.getMonth() + 1); // Output: current month (1-12) 

// For the day of the week.
console.log(todaysDate.getDay() + 1); // Output: current day of the week (1-7, where 1 is Sunday and 7 is Saturday)

// Creating of specific date in JavaScript.

let dateString = new Date("2026-06-15");
let dateString2 = new Date("2026-15-06");
let dateString3 = new Date("2026, 5, 15"); // month is 0-indexed, so 5 represents June

// Time formats in javascript
let timeString = new Date("2026-06-15T14:30:00");
console.log(timeString); // Output: 2026-06-15T14:30:00.000Z


// Function that calculuate
function calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Usage
const birth = new Date(1998, 9, 23); // Note: month is 0-indexed (4 = May)
console.log(calculateAge(birth));

// function that greet the user

function greetUgo() {
    const now = new Date();
    const hours = now.getHours(); // 0-23 format
    
    let greeting;
    if (hours >= 0 && hours < 12) {
        greeting = "Good morning";
    } else if (hours >= 12 && hours < 16) {
        greeting = "Good afternoon";
    } else {
        greeting = "Good evening";
    }
    
    return `${greeting}, Ugo!`;
}

// Example usage
console.log(greetUgo());

// Math Methods in javascripts
// These method are build in methods in javascript that aids in calculations instead of doing it the traditional way.
// Here are some of the math methods that we have in javascript.

let randomNum = Math.random(); // Output: a random number between 0 (inclusive) and 1 (exclusive)
let roundedNum = Math.round(4.7); // Rounds 4.7 to the nearest integer (5)
let floorNum = Math.floor(4.7); // Rounds 4.7 down to the nearest integer (4)
let ceilNum = Math.ceil(4.2); // Rounds 4.2 up to the nearest integer (5)
let powerNum = Math.pow(2, 3);
let truncNum = Math.trunc(4.5); //This removes the decimal points
let AbsNum = Math.abs(-5); // Returns the absolute value of -5 (5)
let maxNum = Math.max(1, 5, 3);
let minNum = Math.min(1, 5, 3);
let CubeNum = Math.cbrt(27); // Returns the cube root of 27 (3)

// Dom in javascript
// The document object model (DOM) is a programming interface for web document
// It represents the structure of a document as a tree of objects, allowing developers
// To manipulate the content and structure of a webpage using javascript

// Accessing DOM elements
// Before you access a Dom element you need to call on them first.

// Here are some of the methods to call on the Dom elements in javascript

// getElementById
let header = document.getElementById("header");
console.log(header)

// getElementsByClassName
let items = document.getElementsByClassName("items");
console.log(items)

// getElementsByTagName
let paragraphs = document.getElementsByTagName("p");
console.log(paragraphs)

// querySelector
let firstItem = document.querySelector(".item");
console.log(firstItem)

// querySelectorAll
let allitems = document.querySelectorAll(".item");
console.log(allitems)

//Changing the content of a DOM element
header.textContent = "Welcome to Javascript DOM Manipulation!";
header.innerHTML = "<h1>Welcome to <i>Javascript<i> DOM Manipulation!</h1>";
// This allows you to add HTML content inside the element

// Changing the style of a DOM element
header.style.color = "red";
header.style.fontSize = "24px";

// Changing of classes
// Changing of classes in javascript
header.classList.add("highlight"); // Adds the "highlight" class to the header element
header.classList.remove("highlight");

// Toggle method
// This adds if the class is not there and removes if the class already exist
// Mostly used for menu drop downs

header.classList.toogle('open');

// This returns a true or false value. it is being used to check if a class is already existing in an element or not
header.classList.contains('active');

// In some cases 2 classes can be added at the same time
// Example

header.classList.add("highlight", "active");

// Changing of attributes
// This when we add or remove an attributes from a tag with javascript. They include src, width, alt etc

// There is a typical example of it
let image = document.getElementsByClassName("img");
image.getAttribute("src");

// Get atrribute is used to read an attribute

// setAttribute is used to read and update the attributes
image.setAttribute("src", "img/newImage.img");

// Checking for an atrribute
image.hasAttribute("alt");

// Removing of an attribute

image.removeAttribute("alt");

// Creating of an element in Javascript.

let newimage = document.createElement("img");
let newParagrahp = document.createElement("p");
let newHeader = document.createElement("h1");

newHeader.textContent = "I was created with JavaScript";
newParagrahp.textContent = "JavaScript is powerful if you understands the concept and how it works";


newHeader.style.color = "green";
newHeader.style.fontSize = "40";

// Append in Javascript is used to used to add an element to the ending of the child item.
// prepend in is used to addd an element to the beginning of the child item. 

newHeader.appendChild();
newParagrahp.prepend();

//here is where we stopped

//Event listeners in Javascript

let Btn = document.querySelector("#btn");

btn.addEventListener("Click", function () {
    console.log("Button has been clicked")
})

//Event objects are callbacks that gives full details of an event.
// What is an event?
//An event is anything that happens on the internet. They can be clicks, window loading, typing.

//How does it work.
// 1) Who to listen to
// 2) What to listen for
// 3) What to do after the listening to th event

//The Event objects
//They are callbacks that contains the detail of every event
//They include :
//.type, .target, .timestamp, .clientX, .clientY
//They are some how denoted by (e, evt, event) depending on the one u feel like to use

//Mouse Event(click, dbclick, mouseover, mouseout,);
//keyboard Event(.key, .keycode, ctrl);