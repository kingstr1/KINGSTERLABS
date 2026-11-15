
/* =================================
   KINGSTER AI STUDIO 2.0
   WEBSITE JAVASCRIPT
================================= */

// WEBSITE MESSAGE SYSTEM

function showMessage(section) {

    alert(
        "Welcome to " + section +
        "!\n\nKINGSTER AI STUDIO is building something exciting. Stay tuned!"
    );

}

// NAVIGATION ACTIVE PAGE

document.addEventListener("DOMContentLoaded", function () {

    const currentPage = window.location.pathname.split("/").pop();

    const navigationLinks = document.querySelectorAll(".navigation a");

    navigationLinks.forEach(function (link) {

        const linkPage = link.getAttribute("href");

        if (linkPage === currentPage) {
            link.classList.add("active");
        }

    });

});

// WELCOME MESSAGE IN CONSOLE

console.log("KINGSTER AI STUDIO 2.0 is running!");

console.log("Build. Play. Create.");

// BUTTON INTERACTION

const buttons = document.querySelectorAll(".btn");

buttons.forEach(function (button) {

    button.addEventListener("click", function () {

        console.log("KINGSTER AI STUDIO button clicked!");

    });

});
