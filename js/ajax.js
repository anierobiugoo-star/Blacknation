//Ajax and Fetch API
// 1.0 Ajax
//  Asynchronous Javascript and XML
//It is simply a technique for sending and receiving data asynchronously without refreshing the page. It allows web pages to be updated asynchronously by exchanging small amounts of data with the server behind the scenes. This means that it is possible to update parts of a web page, without reloading the whole page.

//How Ajax Works
// 1. The browser creates an XMLHttpRequest object.
// 2. The browser sends a request to the web server.
// 3. The server processes the request.
// 4. The server sends a response back to the browser.
// 5. The browser processes the response and updates the web page accordingly.

let xhr = new XMLHttpRequest();

xhr.open('GET', "https://jsonplaceholder.typicode.com/users", true);

xhr.onload = function() {
    if (this.status === 200) {
        let users = JSON.parse(this.responseText);
        console.log(users);
     } else {
        console.log("Error: " + this.status);
     }
};

xhr.onerror = function() {
    console.log("Request failed");
};

xhr.onreadystatechange = function() {

    console.log("Ready state: " + this.readyState);

    if (this .readyState === 4 && this.status === 200) {
        let users = JSON.parse(this.responseText);
        console.log(users);
    }
};

xhr.send();

// 2.0 Fetch API

fetch("https://jsonplaceholder.typicode.com/users")
    .then((response) => {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        console.log("Response status: " + response.status);
        console.log("Response headers: " + response.headers.get("Content-Type"));
        console.log("Response body: " + response.body);
        console.log("Response redirected: " + response.redirected);
        console.log("Response type: " + response.type); 
        console.log("Response url: " + response.url);
        console.log("Response status text: " + response.statusText);
        console.log("Response ok: " + response.ok);
        console.log("Response body used: " + response.bodyUsed);
        return response.json();
        // return response.text(); // for plain text response
        // return response.blob(); // for binary data(images, videos, etc.)
    })
    .then((data) => {
        console.log(data);
    })
    .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
    });

    // Fetch post request
    fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: "foo",
            body: "bar",
            userId: 1
        })
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then((data) => {
            console.log(data);
        })
        .catch((error) => {
            console.error("There was a problem with the fetch operation:", error);
        });

    //Fetch put request
    fetch("https://jsonplaceholder.typicode.com/posts/1", {
        method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: 1,
                title: "updated title",
                body: "updated body",
                userId: 1
            })
        })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then((data) => {
            console.log(data);
        })
        .catch((error) => {
            console.error("There was a problem with the fetch operation:", error);
        });

    //Fetch delete request
    fetch("https://jsonplaceholder.typicode.com/posts/1", {
        method: "DELETE"
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            console.log("Delete request successful. Status: " + response.status);
        })
        .catch((error) => {
            console.error("There was a problem with the fetch operation:", error);
        });