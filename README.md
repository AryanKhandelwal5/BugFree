# BugFree - Turn You Code Into Production-level , Secure , Reliable & Scalable Code in 1 CLICK!

BugFree is a beginner-friendly app that turns pasted code into a production-level , secure , safe , scalable ,reliable, error-free code efficiently. It helps developers spot likely bugs, edge cases, modern syntax practices, and severity before they ship.

Built for **OpenAI Build Week**.

## Features

- Likely bugs, edge cases, modern syntax practice, and severity levels
- React-based two-panel production-code workspace
- Built-in language-specific checks, safer code suggestions, explanations, and edge cases.
- Friendly loading and error messages

## Tech stack

- React 19 browser application with a modern responsive UI
- Node.js built-in HTTP server
- Local Node.js rule engine;

## Setup and running locally

1. Install [Node.js](https://nodejs.org/) 18 or later.
2. Open a terminal in this folder.
3. Run `npm start`. If PowerShell says scripts are disabled, run `npm.cmd start` instead.
4. Open `http://localhost:3000`.

No local package install is required; the browser loads the React runtime. An internet connection is needed for the UI runtime and OpenAI analysis.

## Example

Input:

```js
for (let i = 0; i <= items.length; i++) console.log(items[i]);
```

Sample result:

- Severity: Medium
- Likely bug: the loop can read one item beyond the array (Out-Of-Index Error).
- Edge case: an empty list.
- Syntax: Modern & Up-to-date already.

## Publish to GitHub

1. Create a new empty repository at [github.com/new](https://github.com/new).
2. Run these commands in this folder (replace the URL with yours):

   git init
   git add .
   git commit -m "Build TestPilot MVP"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/testpilot.git
   git push -u origin main

3. Run `git status --ignored` before publishing. Confirm `.env` is listed as ignored, and confirm it is absent from GitHub.

## Known limitations

- AI output can be incomplete or wrong, so review it before relying on it.
- The MVP processes one snippet at a time.

## How we used Codex and GPT-5.6

We used Codex to plan the product, build the React workspace and Node server, implement language-specific local review rules, test the code paths, and write the documentation.
