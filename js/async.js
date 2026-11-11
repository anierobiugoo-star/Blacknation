// Asynchronousn Javascript
// Async starts a task but doesn't wait for it to finish.
// There 4 ways in which javascript handles the async.
// 1) The Call stack.
// The javascript uses what we called (LIFO)
// Last IN FOR Out.

function greeting (name){
    console.log("Welcome" + name + "to Async Class");
}

function callStack() {
    greeting("Alex");
}

callStack()

// 1.1) The Web APIS
// setTimeout and setinterval
// Data Fetch
// Eventlistener
// XML HTTPS Request

//1.2 The Callback Queue


// 1.3 The event loop

//1.4 The microstack Queue

console.log("This comes first");
console.log("This comes second");
setTimeout(function() {
    console.log("This comes fifth");
},0);
Promise.resolve().then(function() {
    console.log("This comes fourth");
})
console.log("This is the third Item");


setTimeout(function() {
    console.log("Here we are to learn the advance topics in the world of Javascript");
},3000);


//2.0 Set Timeout

function welcomeStudent(name, course) {
    console.log("welcome"+ name + "To " + course);
}

setTimeout(welcomeStudent, 2000,"Ruth","Javascript");

//Storing of SetTimeout
let timerId = setTimeout(function(){
    console.log("Storing setTimeout");
}, 3000);

console.log(timerId);

clearTimeout(timerId);

//3.0 Set Interval

function welcomeStudent(name, course) {
    console.log("welcome"+ name + "To " + course);
}

// setInterval(welcomeStudent, 2000,"ALex","Javascript");

//Example of the setInterval and clearInterval

let count = 0;

function updateCount() {
    count++;
    console.log(count);

    if(count === 5) {
        clearInterval(updateCount);
    }
}

// setInterval(updateCount, 1000);

//clock with setInterval

function updatetime() {
    const date = new Date();
    let time = date.toLocaleTimeString();
    console.log(time);
}

updateCount();
// setInterval(updatetime, 1000);

//4.0 Promises

//Promise is an oblect that represents the eventual completion (or failure) of an asynchronous operation and its resulting value.

//Promise has 3 states
//1) Pending
//2) Fulfilled
//3) Rejected

//Creating a promise
let myPromise = new Promise(function(resolve, reject) {
    setTimeout(function() {
        let success = true;
        if(success) {
            resolve("Promise is fulfilled");
        } else {
            reject("Promise is rejected");
        }
    },2000);
});

console.log(myPromise);

//Consuming a promise with then and catch

myPromise.then(function(value) {
    console.log(value);
}).catch(function(error) {
    console.log(error);
});

//.finally method is used to execute code after the promise is settled, regardless of whether it was fulfilled or rejected.

myPromise.finally(function() {
    console.log("Promise is settled");
});

//promise chaining
function step1() {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            console.log("Step 1 completed: Got student ID");
            resolve(42)
        }, 1000);
    }); 
}

function step2(studentId) {
    return new Promise(function(resolve){
        setTimeout(function() {
            console.log("Step 2 done: Got scores for the student" + studentId);
            resolve([85,90,74])
        },1000);
    })
}

function step3(scores) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            
            let averageScore = scores.reduce((a,b) => a + b, 0) / scores.length;
            console.log("Step 3 done: calculated the average score");
            resolve(averageScore);
        }, 1000);
    });
}


//The chain 
step1()
.then(function(studentId) {
    return step2(studentId);
})
.then(function(scores) {
    return step3(scores);
})
.then(function(averageScore) {
    console.log("The average score is: " + averageScore.toFixed(1) + "%");
})
.catch(function(error) {
    console.log("Error: " + error);
});

//Async/Await
//Async functions are a higher level abstraction over promises. They allow you to write asynchronous code that looks synchronous, making it easier to read and understand.

async function getStudentAverageScore() {
    try {
        const studentId = await step1();
        const scores = await step2(studentId);
        const averageScore = await step3(scores);
        console.log("The average score is: " + averageScore.toFixed(1) + "%");
    } catch (error) {
        console.log("Error: " + error);
    }
}

getStudentAverageScore();

//This returns a promise even though they are returning a non-promise value.
// The async function always returs a promise,
//example

function greetings(name) {
    return "Welcome " + name + " to the async class";
}

greetings("Alex");

//With async function

async function greetingS(name) {
    return "Welcome " + name + " to the async class";
}

greetingS("Alex");


greetingS("Alex").then(function(message) {
    console.log(message);
});