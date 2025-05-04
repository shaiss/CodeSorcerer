const fs = require("fs");
const path = require("path");

function listFiles(dir, outputFilePath, indent = "") {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (file === "node_modules" || file === ".git" || file === ".next") {
      return;
    }

    const line = `${indent}${file}${stats.isDirectory() ? "/" : ""}\n`;

    // Write to the file instead of console.log
    fs.appendFileSync(outputFilePath, line, "utf8");

    if (stats.isDirectory()) {
      listFiles(filePath, outputFilePath, indent + "  ");
    }
  });
}

// Specify the output file path
const outputFilePath = "output.txt";

// Clear the file if it already exists
fs.writeFileSync(outputFilePath, "", "utf8");

// Start listing files and write to the file
listFiles(".", outputFilePath);

console.log(`Directory structure written to ${outputFilePath}`);
