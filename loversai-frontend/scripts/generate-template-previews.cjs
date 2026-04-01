#!/usr/bin/env node
/**
 * Generate preview images from PPTX templates
 * Usage: node scripts/generate-template-previews.cjs
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ASSETS_DIR = path.join(__dirname, "../src/assets");
const OUTPUT_DIR = path.join(ASSETS_DIR, "previews");

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✓ Created ${OUTPUT_DIR}`);
}

// Find all PPTX files
const pptxFiles = fs
  .readdirSync(ASSETS_DIR)
  .filter((file) => file.toLowerCase().endsWith(".pptx"));

console.log(`Found ${pptxFiles.length} PPTX files`);

if (pptxFiles.length === 0) {
  console.log("No PPTX files found in assets directory");
  process.exit(0);
}

// Convert each PPTX to PNG using LibreOffice
pptxFiles.forEach((file) => {
  const inputPath = path.join(ASSETS_DIR, file);
  const fileName = path.basename(file, ".pptx");
  const outputName = `${fileName}-preview.png`;
  const outputPath = path.join(OUTPUT_DIR, outputName);

  try {
    // Check if preview already exists
    if (fs.existsSync(outputPath)) {
      console.log(`✓ ${outputName} already exists`);
      return;
    }

    console.log(`Converting ${file}...`);

    // Use LibreOffice to convert PPTX to PDF
    const pdfPath = path.join(OUTPUT_DIR, `${fileName}.pdf`);
    const libreOfficePath = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
    execSync(
      `"${libreOfficePath}" --headless --convert-to pdf --outdir "${OUTPUT_DIR}" "${inputPath}"`,
      { stdio: "pipe" }
    );

    // Use ImageMagick to convert PDF first page to PNG
    if (fs.existsSync(pdfPath)) {
      execSync(
        `convert -density 150 "${pdfPath}[0]" -quality 85 "${outputPath}"`
      );
      // Clean up PDF
      fs.unlinkSync(pdfPath);
      console.log(`✓ Generated ${outputName}`);
    }
  } catch (err) {
    console.error(`✗ Failed to convert ${file}:`);
    console.error(err.message);
    console.log("\nMake sure LibreOffice and ImageMagick are installed:");
    console.log("  macOS: brew install libreoffice imagemagick");
    console.log("  Ubuntu: sudo apt-get install libreoffice imagemagick");
  }
});

console.log("\nPreview generation complete!");
