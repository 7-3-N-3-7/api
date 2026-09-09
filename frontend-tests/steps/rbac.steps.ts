import { Given, When, Then, BeforeAll, AfterAll, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser, Page, expect } from '@playwright/test';

// Increase default timeout to 60 seconds (useful for browser launch / network calls)
setDefaultTimeout(60 * 1000);

let browser: Browser;
let page: Page;
const FRONTEND_URL = 'http://localhost';

BeforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

AfterAll(async () => {
  await browser.close();
});

After(async () => {
  // Close the page context after each scenario to clear cookies/session
  await page.close();
});

Given('I navigate to the frontend application', async () => {
  page = await browser.newPage();
  await page.goto(FRONTEND_URL);
});

When('I log in as {string} with password {string}', async (username, password) => {
  await page.click('text="Login"');
  await page.fill('input[name="loginName"]', username);
  await page.click('button[type="submit"]:has-text("next")');
  
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]:has-text("next")');
  
  await page.waitForURL(FRONTEND_URL);
});

Then('I should see the welcome message containing role {string}, organization {string}, and service {string}', async (role, organization, service) => {
  // Extracting username from the scenario isn't directly passed here, 
  // but we can assert the second half of the string.
  // The expected format was: "welcome {username}, you have attributes, role: {role}, organization: {organization}, service: {service}"
  
  const attributeString = `role: ${role}, organization: ${organization}, service: ${service}`;
  await expect(page.getByText(new RegExp(`welcome .*, you have attributes, ${attributeString}`))).toBeVisible();
});
