const liverpoolPlayers = [
  "Alisson",
  "Caoimhin Kelleher",
  "Joe Gomez",
  "Virgil van Dijk",
  "Ibrahima Konate",
  "Andrew Robertson",
  "Conor Bradley",
  "Kostas Tsimikas",
  "Ryan Gravenberch",
  "Alexis Mac Allister",
  "Dominik Szoboszlai",
  "Curtis Jones",
  "Harvey Elliott",
  "Wataru Endo",
  "Mohamed Salah",
  "Luis Diaz",
  "Cody Gakpo",
  "Darwin Nunez",
  "Diogo Jota",
  "Federico Chiesa"
  
];

function checkPlayer(name) {
  if (liverpoolPlayers.includes(name)) {
    console.log(`${name} is a Liverpool player.`);
  } else {
    console.log(`${name} is NOT a Liverpool player.`);
  }
}

// Examples
checkPlayer("Mohamed Salah");   // Mohamed Salah is a Liverpool player.
checkPlayer("Lionel Messi");    // Lionel Messi is NOT a Liverpool player.
checkPlayer("Alexander iske")