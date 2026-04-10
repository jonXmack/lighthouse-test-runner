#!/usr/bin/env node

/**
 * Lighthouse Test Runner
 *
 * A comprehensive tool for running Google Lighthouse performance audits on websites
 * with intelligent file naming, organization by hostname, and support for multiple URLs.
 *
 * Features:
 * - Smart file naming using page titles
 * - Automatic page type detection (HOME, PLP, PDP, BLOG, ARTICLE)
 * - Client organization by hostname
 * - Mobile and desktop testing
 * - Multiple URL support with batch processing
 *
 * @example
 * // Single URL test
 * node runner.js both https://example.com
 *
 * // Multiple URL test
 * node runner.js mobile https://site1.com https://site2.com
 *
 * @author Your Name
 * @version 2.0.0
 */

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// =============================================================================
// CONSTANTS
// =============================================================================

/** @constant {string} Default URL when none provided */
const DEFAULT_URL = process.env.LIGHTHOUSE_URL || "http://localhost:9292";

/** @constant {number} Timeout for curl operations in milliseconds */
const CURL_TIMEOUT = 10000;

/** @constant {number} Maximum filename length for sanitized titles */
const MAX_FILENAME_LENGTH = 100;

/** @constant {RegExp} Pattern to match locale-based homepage URLs */
const LOCALE_PATTERN = /^\/[a-z]{2}(-[a-z]{2})?$/;

/** @constant {Object} HTML entities to decode */
const HTML_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
  "&ndash;": "-",
};

/** @constant {Object} Page type definitions */
const PAGE_TYPES = {
  HOME: "HOME",
  PLP: "PLP", // Product Listing Page
  PDP: "PDP", // Product Detail Page
  BLOG: "BLOG", // Blog category page
  ARTICLE: "ARTICLE", // Blog article
  PAGE: "PAGE", // Generic page
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Decodes common HTML entities in a string
 * @param {string} str - The string containing HTML entities
 * @returns {string} The decoded string
 */
function decodeHtmlEntities(str) {
  let decoded = str;
  for (const [entity, replacement] of Object.entries(HTML_ENTITIES)) {
    decoded = decoded.replace(new RegExp(entity, "g"), replacement);
  }
  return decoded.trim();
}

/**
 * Extracts hostname from a URL, removing www prefix
 * @param {string} url - The URL to extract hostname from
 * @returns {string} The cleaned hostname or 'localhost' as fallback
 */
function extractHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./i, "");
  } catch {
    return "localhost";
  }
}

/**
 * Creates a directory if it doesn't exist
 * @param {string} dirPath - The directory path to create
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generates a timestamp string for use in filenames
 * @returns {string} ISO timestamp formatted for filenames
 */
function generateTimestamp() {
  return new Date().toISOString().slice(0, 19).replace(/:/g, "-");
}

/**
 * Fetches the page title from a URL using curl and perl
 * @param {string} url - The URL to fetch the title from
 * @returns {string} The page title, hostname, or fallback string
 */
function fetchPageTitle(url) {
  try {
    const curlCommand = `curl -s "${url}" | perl -l -0777 -ne 'print $1 if /<title.*?>\\s*(.*?)\\s*<\\/title>/si'`;
    const title = execSync(curlCommand, {
      encoding: "utf8",
      timeout: CURL_TIMEOUT,
    }).trim();

    if (title) {
      return decodeHtmlEntities(title);
    }
  } catch (error) {
    console.log(`⚠️  Could not fetch page title: ${error.message}`);
  }

  // Fallback to hostname or default
  return extractHostname(url) || "lighthouse-report";
}

/**
 * Sanitizes a page title for safe use in filenames
 * @param {string} title - The title to sanitize
 * @returns {string} A filesystem-safe filename string
 */
function sanitizeFilename(title) {
  return title
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .substring(0, MAX_FILENAME_LENGTH); // Limit length
}

/**
 * Detects the page type from a URL pathname
 * @param {string} url - The URL to analyze
 * @returns {string} The page type (HOME, PLP, PDP, BLOG, ARTICLE, or PAGE)
 */
function getPageType(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // Check for homepage patterns
    if (pathname === "/" || pathname === "") {
      return PAGE_TYPES.HOME;
    }

    // Check for locale/market homepage patterns (e.g. /en-ae, /de, /fr-ca, /en-us)
    if (LOCALE_PATTERN.test(pathname)) {
      return PAGE_TYPES.HOME;
    }

    // Check for blog-related pages
    if (pathname.includes("/blogs/")) {
      const blogsIndex = pathname.indexOf("/blogs/");
      const pathAfterBlogs = pathname.substring(blogsIndex + 7); // 7 = length of "/blogs/"
      const segments = pathAfterBlogs
        .split("/")
        .filter((segment) => segment.length > 0);

      if (segments.length >= 2) {
        return PAGE_TYPES.ARTICLE; // /blogs/blog-name/article-name
      } else if (segments.length === 1) {
        return PAGE_TYPES.BLOG; // /blogs/blog-name
      }
    }

    // Check for e-commerce page types
    if (pathname.includes("/collections/")) {
      return PAGE_TYPES.PLP; // Product Listing Page
    } else if (pathname.includes("/products/")) {
      return PAGE_TYPES.PDP; // Product Detail Page
    }

    return PAGE_TYPES.PAGE; // Generic page
  } catch {
    return PAGE_TYPES.PAGE;
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/** @constant {string} Base directory for all reports */
const reportsBaseDir = path.join(__dirname, "reports");
ensureDirectory(reportsBaseDir);

// =============================================================================
// CORE LIGHTHOUSE FUNCTIONS
// =============================================================================

/**
 * Runs a single Lighthouse test for the specified form factor and URL
 * @param {string} formFactor - Either 'mobile' or 'desktop'
 * @param {string} url - The URL to test
 * @returns {Promise<Object>} Result object containing test metadata
 */
function runLighthouse(formFactor, url = DEFAULT_URL) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Fetching page title for ${url}...`);

    // Extract metadata for file naming
    const pageTitle = fetchPageTitle(url);
    const sanitizedTitle = sanitizeFilename(pageTitle);
    const pageType = getPageType(url);
    const hostname = extractHostname(url);

    console.log(`🏷️  Using title: "${pageTitle}"`);
    console.log(`📄 Page type: ${pageType}`);

    // Create client-specific directory
    const reportsDir = path.join(reportsBaseDir, hostname);
    ensureDirectory(reportsDir);

    // Generate file paths with descriptive naming
    const timestamp = generateTimestamp();
    const baseFilename = `${formFactor}-${pageType}-${sanitizedTitle}-${timestamp}`;
    const outputPath = path.join(reportsDir, `${baseFilename}.html`);
    const jsonOutputPath = path.join(reportsDir, `${baseFilename}.json`);

    // Configure Lighthouse arguments
    const args = [
      "--config-path=./lighthouse.config.js",
      "--output=html,json",
      `--output-path=${outputPath}`,
      '--chrome-flags="--headless"',
      url,
    ];

    console.log(`🚀 Running Lighthouse for ${formFactor}...`);
    console.log(`📊 Testing URL: ${url}`);

    // Spawn Lighthouse process
    const lighthouse = spawn("lighthouse", args, {
      env: { ...process.env, LIGHTHOUSE_FORM_FACTOR: formFactor },
      stdio: "inherit",
    });

    lighthouse.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ ${formFactor} test completed successfully!`);
        console.log(`📄 Report saved to: ${outputPath}`);
        resolve({
          formFactor,
          outputPath,
          jsonOutputPath,
          url,
          pageTitle,
          pageType,
          hostname,
        });
      } else {
        reject(new Error(`${formFactor} test failed with exit code ${code}`));
      }
    });

    lighthouse.on("error", (error) => {
      reject(new Error(`Failed to start Lighthouse process: ${error.message}`));
    });
  });
}

/**
 * Runs both mobile and desktop Lighthouse tests for a single URL
 * @param {string} url - The URL to test
 * @returns {Promise<Object>} Object containing both mobile and desktop results
 */
async function runBothTests(url) {
  try {
    console.log("🔄 Running Lighthouse tests for both mobile and desktop...\n");

    const mobileResult = await runLighthouse("mobile", url);
    console.log("");
    const desktopResult = await runLighthouse("desktop", url);

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📊 Report Summary:");
    console.log(`  Mobile:  ${mobileResult.outputPath}`);
    console.log(`  Desktop: ${desktopResult.outputPath}`);

    return {
      mobile: mobileResult,
      desktop: desktopResult,
      url: url,
    };
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Runs Lighthouse tests for multiple URLs with the same form factor
 * @param {string} formFactor - Either 'mobile' or 'desktop'
 * @param {Array<string>} urls - Array of URLs to test
 * @returns {Promise<Array>} Array of test results
 */
async function runMultipleUrls(formFactor, urls) {
  const results = [];

  console.log(`🔄 Running ${formFactor} tests for ${urls.length} URLs...\n`);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n📍 Processing URL ${i + 1}/${urls.length}: ${url}`);

    try {
      const result = await runLighthouse(formFactor, url);
      results.push(result);
    } catch (error) {
      console.error(`❌ Failed to process ${url}:`, error.message);
      results.push({
        error: error.message,
        url,
        formFactor,
        failed: true,
      });
    }

    // Add separator between URLs (except for last one)
    if (i < urls.length - 1) {
      console.log("\n" + "=".repeat(50));
    }
  }

  // Print summary
  console.log("\n🎉 All URL tests completed!");
  console.log(`\n📊 Summary for ${formFactor} tests:`);

  results.forEach((result, index) => {
    if (result.failed) {
      console.log(`  ${index + 1}. ❌ ${result.url} - Failed: ${result.error}`);
    } else {
      console.log(`  ${index + 1}. ✅ ${urls[index]} - ${result.outputPath}`);
    }
  });

  return results;
}

/**
 * Runs both mobile and desktop tests for multiple URLs
 * @param {Array<string>} urls - Array of URLs to test
 * @returns {Promise<Object>} Object containing all test results organized by form factor
 */
async function runBothTestsMultipleUrls(urls) {
  const allResults = { mobile: [], desktop: [] };

  console.log(
    `🔄 Running both mobile and desktop tests for ${urls.length} URLs...\n`,
  );

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n🌐 Processing URL ${i + 1}/${urls.length}: ${url}`);

    try {
      const results = await runBothTests(url);
      allResults.mobile.push(results.mobile);
      allResults.desktop.push(results.desktop);
    } catch (error) {
      console.error(`❌ Failed to process ${url}:`, error.message);
      const failedResult = {
        error: error.message,
        url,
        failed: true,
      };
      allResults.mobile.push(failedResult);
      allResults.desktop.push(failedResult);
    }

    // Add separator between URLs (except for last one)
    if (i < urls.length - 1) {
      console.log("\n" + "=".repeat(60));
    }
  }

  // Print comprehensive summary
  console.log("\n🎉 All tests completed for all URLs!");
  console.log(`\n📊 Final Summary (${urls.length} URLs):`);

  urls.forEach((url, index) => {
    const mobileResult = allResults.mobile[index];
    const desktopResult = allResults.desktop[index];

    console.log(`\n  ${index + 1}. ${url}:`);

    if (mobileResult.failed) {
      console.log(`    📱 Mobile:  ❌ Failed - ${mobileResult.error}`);
    } else {
      console.log(`    📱 Mobile:  ✅ ${mobileResult.outputPath}`);
    }

    if (desktopResult.failed) {
      console.log(`    🖥️  Desktop: ❌ Failed - ${desktopResult.error}`);
    } else {
      console.log(`    🖥️  Desktop: ✅ ${desktopResult.outputPath}`);
    }
  });

  return allResults;
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

/**
 * Validates an array of URLs, filtering out invalid ones with warnings
 * @param {Array<string>} urls - Array of URL strings to validate
 * @returns {Array<string>} Array of valid URLs
 */
function validateUrls(urls) {
  return urls.filter((url) => {
    try {
      new URL(url);
      return true;
    } catch {
      console.warn(`⚠️  Skipping invalid URL: ${url}`);
      return false;
    }
  });
}

/**
 * Displays usage information and exits
 */
function showUsage() {
  console.log(`
🚀 Lighthouse Test Runner

Usage: node runner.js [command] [urls...]

Commands:
  mobile    Run mobile tests only
  desktop   Run desktop tests only
  both      Run both mobile and desktop tests (default)

Examples:
  node runner.js both https://example.com
  node runner.js mobile https://site1.com https://site2.com
  node runner.js desktop https://mysite.com/page1 https://mysite.com/page2

Features:
  • Automatic page type detection (HOME, PLP, PDP, BLOG, ARTICLE)
  • Smart file naming using page titles
  • Client organization by hostname
  • Batch processing of multiple URLs
  • Comprehensive error reporting

Reports are saved to: ./reports/{hostname}/
  `);
  process.exit(0);
}

// Parse command line arguments
const args = process.argv.slice(2);

// Show help if requested
if (args.includes("--help") || args.includes("-h")) {
  showUsage();
}

const command = args[0] || "both";
const urls = args.slice(1);

// Use default URL if no URLs provided
const urlsToTest = urls.length === 0 ? [DEFAULT_URL] : urls;

// Validate all URLs
const validUrls = validateUrls(urlsToTest);

if (validUrls.length === 0) {
  console.error("❌ No valid URLs provided");
  console.log("💡 Use --help for usage information");
  process.exit(1);
}

// Execute the appropriate command
async function main() {
  try {
    switch (command) {
      case "mobile":
        if (validUrls.length === 1) {
          await runLighthouse("mobile", validUrls[0]);
        } else {
          await runMultipleUrls("mobile", validUrls);
        }
        break;

      case "desktop":
        if (validUrls.length === 1) {
          await runLighthouse("desktop", validUrls[0]);
        } else {
          await runMultipleUrls("desktop", validUrls);
        }
        break;

      case "both":
      default:
        if (validUrls.length === 1) {
          await runBothTests(validUrls[0]);
        } else {
          await runBothTestsMultipleUrls(validUrls);
        }
        break;
    }
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Run the main function
main();
