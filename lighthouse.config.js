/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Desktop and mobile throttling constants (from Lighthouse core)
const throttling = {
  desktopDense4G: {
    rttMs: 40,
    throughputKbps: 10 * 1024,
    cpuSlowdownMultiplier: 1,
    requestLatencyMs: 0,
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0,
  },
  mobileSlow4G: {
    rttMs: 150,
    throughputKbps: 1.6 * 1024,
    cpuSlowdownMultiplier: 4,
    requestLatencyMs: 150,
    downloadThroughputKbps: 1.6 * 1024,
    uploadThroughputKbps: 750,
  },
};

// Screen emulation constants
const screenEmulationMetrics = {
  mobile: {
    mobile: true,
    width: 412,
    height: 823,
    deviceScaleFactor: 2.625,
    disabled: false,
  },
  desktop: {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false,
  },
};

// User agents
const userAgents = {
  mobile:
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
  desktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
};

// Base configuration shared by both mobile and desktop
const baseConfig = {
  extends: "lighthouse:default",
  settings: {
    maxWaitForFcp: 15 * 1000,
    maxWaitForLoad: 35 * 1000,
    skipAudits: [
      // Skip the h2 audit so it doesn't lie to us. See https://github.com/GoogleChrome/lighthouse/issues/6539
      "modern-http-insight",
      // There are always bf-cache failures when testing in headless. Reenable when headless can give us realistic bf-cache insights.
      "bf-cache",
    ],
    // Add Shopify-specific budget assertions
    budgets: [
      {
        resourceSizes: [
          {
            resourceType: "script",
            budget: 400,
          },
          {
            resourceType: "image",
            budget: 500,
          },
          {
            resourceType: "stylesheet",
            budget: 100,
          },
          {
            resourceType: "total",
            budget: 1500,
          },
        ],
        resourceCounts: [
          {
            resourceType: "third-party",
            budget: 20,
          },
        ],
      },
    ],
  },
};

/** @type {LH.Config} Mobile configuration */
const mobileConfig = {
  ...baseConfig,
  settings: {
    ...baseConfig.settings,
    formFactor: "mobile",
    throttling: {
      // Determined using PSI CPU benchmark median and
      // https://lighthouse-cpu-throttling-calculator.vercel.app/
      cpuSlowdownMultiplier: 1.2,
    },
    screenEmulation: screenEmulationMetrics.mobile,
    emulatedUserAgent: userAgents.mobile,
  },
};

/** @type {LH.Config} Desktop configuration */
const desktopConfig = {
  ...baseConfig,
  settings: {
    ...baseConfig.settings,
    formFactor: "desktop",
    throttling: throttling.desktopDense4G,
    screenEmulation: screenEmulationMetrics.desktop,
    emulatedUserAgent: userAgents.desktop,
  },
};

// Export the configuration based on environment variable or default to mobile
const getConfig = () => {
  const formFactor = process.env.LIGHTHOUSE_FORM_FACTOR;

  if (formFactor === "desktop") {
    return desktopConfig;
  } else if (formFactor === "mobile") {
    return mobileConfig;
  }

  // Default to mobile if no form factor specified
  return mobileConfig;
};

// Export for different use cases
export default getConfig();
export { mobileConfig, desktopConfig, baseConfig };
