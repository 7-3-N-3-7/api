import { Given, When, Then } from '@cucumber/cucumber';
import { request, APIRequestContext, expect } from '@playwright/test';
import { page } from './rbac.steps'; // reusing the page context if needed, but we'll use APIRequestContext for most

let apiContext: APIRequestContext;
let response: any;
let responseBody: any;

Given('the infrastructure is deployed', async function () {
  // Initialize the Playwright API request context for making HTTP calls without a browser
  apiContext = await request.newContext();
});

When('I send a GET request to the ZITADEL health endpoint at {string}', async function (url: string) {
  try {
    response = await apiContext.get(url);
  } catch (error) {
    // If the server isn't running, this will throw. We catch it so the assertion below handles the failure cleanly.
    response = { status: () => 503, ok: () => false };
  }
});

When('I send a GET request to the Backend health endpoint at {string}', async function (url: string) {
  try {
    response = await apiContext.get(url);
    if (response.ok()) {
      responseBody = await response.json();
    }
  } catch (error) {
    response = { status: () => 503, ok: () => false };
  }
});

Then('I should receive a {int} OK status', async function (expectedStatus: number) {
  expect(response.status()).toBe(expectedStatus);
});

Then('the response body should contain {string}', async function (expectedText: string) {
  expect(JSON.stringify(responseBody)).toContain(expectedText);
});

When('I navigate to the frontend URL at {string}', async function (url: string) {
  try {
    // Using the global page object from the Playwright browser context
    response = await page.goto(url);
  } catch (error) {
    response = null;
  }
});

Then('the page should load successfully', async function () {
  expect(response).not.toBeNull();
  expect(response.status()).toBe(200);
});
