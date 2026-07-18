// MAIN CODE OF THE PROJECT

const http = require("http");
const fs = require("fs");
const path = require("path");

loadEnv();

const publicFolder = path.join(__dirname, "public");
const port = Number(process.env.PORT || 3000);

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, {
    "Content-Type": `${type}; charset=utf-8`,
    "Cache-Control": "no-store, max-age=0"
  });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function hasPotentialDivision(source) {
  return source.split(/\r?\n/).some(line => {
    const code = line.trim();
    if (!code || code.startsWith("#") || code.startsWith("//")) return false;
    return /\bdivide\s*\(/.test(code) || /(?:\breturn\s+|\b\w+\s*=\s*)\w+\s*\/\s*(?![/*])\w+/.test(code);
  });
}

function sampleAnalysis(input, language) {
  const text = input.toLowerCase();
  const lines = input.split(/\r?\n/).filter(line => line.trim());
  const divisionFound = hasPotentialDivision(input);
  if (divisionFound) return { source: "sample", severity: "High", summary: "The divisor needs a safety check before division.", likelyBugs: ["Dividing by zero produces Infinity or an invalid calculation."], edgeCases: ["A divisor of 0", "A negative divisor", "A divisor that is not a number"], testCases: [{ name: "Zero divisor", steps: "Call divide(10, 0).", expected: "Return a clear error instead of a number." }, { name: "Normal division", steps: "Call divide(10, 2).", expected: "Return 5." }] };
  if (/user\.name|undefined|null/.test(text)) return { source: "sample", severity: "High", summary: "A value may be missing before its property is read.", likelyBugs: ["Reading user.name can crash when user is null or undefined."], edgeCases: ["No user object", "A user with no name", "An empty name"], testCases: [{ name: "Missing user", steps: "Run with user set to null.", expected: "Show a friendly fallback instead of crashing." }, { name: "Valid user", steps: "Run with a user containing a name.", expected: "Show the formatted name." }] };
  if (/fetch\(|api\//.test(text)) return { source: "sample", severity: "Medium", summary: "The API call needs a path for network and server failures.", likelyBugs: ["A failed request or non-200 response can leave the user without feedback."], edgeCases: ["No internet connection", "A 500 server response", "Invalid JSON from the server"], testCases: [{ name: "Server failure", steps: "Mock a 500 API response.", expected: "Show a retry-friendly error message." }, { name: "Network failure", steps: "Mock a rejected fetch request.", expected: "Show that the connection failed." }] };
  if (/password|login/.test(text)) return { source: "sample", severity: "Critical", summary: "A hard-coded password is unsafe and should never be used for authentication.", likelyBugs: ["Anyone who can read the code can discover the password."], edgeCases: ["A blank password", "Repeated failed attempts", "A leaked source file"], testCases: [{ name: "Wrong password", steps: "Try an incorrect password.", expected: "Reject it without revealing sensitive details." }, { name: "Secure storage", steps: "Review the authentication design.", expected: "Passwords are hashed and checked on a server." }] };
  if (/<=\s*items\.length|<=.*\.length/.test(text)) return { source: "sample", severity: "Medium", summary: "The loop may run one extra time and read beyond the final item.", likelyBugs: ["Using <= length reaches an index that does not exist."], edgeCases: ["An empty list", "A list with one item", "A list with many items"], testCases: [{ name: "Single item", steps: "Run the loop with one item.", expected: "Log it once and never log undefined." }, { name: "Empty list", steps: "Run the loop with [].", expected: "Do not try to read items[0]." }] };
  const likelyBugs = [];
  const fixes = [];
  const edgeCases = ["Empty input or missing values", "Very large input", "Unexpected data types"];
  const testCases = [
    { name: "Happy path", steps: "Use normal, valid input.", expected: "The feature completes successfully." },
    { name: "Empty value", steps: "Submit an empty value.", expected: "Show a helpful validation message." },
    { name: "Boundary value", steps: "Try the smallest and largest allowed values.", expected: "Both values are handled safely." }
  ];

  if (text.includes("undefined") || text.includes("null")) {
    likelyBugs.push("A value may be used before checking that it exists.");
    fixes.push({ title: "Check before using a value", explanation: "The program can stop when it tries to read a property from an empty value.", before: "user.name", after: "user?.name ?? 'Guest'", avoid: "Check values from users, APIs, and databases before using them." });
    edgeCases.unshift("A null or undefined value");
  }
  if (text.includes("=" ) && text.includes("if")) {
    likelyBugs.push("Check whether a single = was used where a comparison was intended.");
    fixes.push({ title: "Use a comparison in conditions", explanation: "A single = changes a value. Use == or === when you want to compare two values.", before: "if (age = 18)", after: "if (age === 18)", avoid: "Read every if condition as a question: it should compare, not assign." });
  }
  if (text.includes("error") || text.includes("exception")) likelyBugs.push("The error may not be handled with a clear message for the user.");
  if (/<=\s*\w+\.length|<=\s*\w+\.size\s*\(/.test(text)) {
    likelyBugs.push("A loop can run one step too far and access an item that does not exist.");
    fixes.push({ title: "Stop before the final length", explanation: "Arrays start at 0, so the last valid position is length - 1. Using <= reaches one invalid position.", before: "for (int i = 0; i <= items.size(); i++)", after: "for (int i = 0; i < items.size(); i++)", avoid: "Use < with length or size() in loops." });
  }
  if (divisionFound) fixes.push({ title: "Guard against division by zero", explanation: "Division is unsafe when the second number is zero.", before: "result = a / b;", after: "if (b == 0) { /* show an error */ } else { result = a / b; }", avoid: "Validate divisors before every calculation." });
  if (/\b(printf|cout)\s*\([^;]*%s/.test(text) || /strcpy\s*\(/.test(text)) {
    likelyBugs.push("A string may be copied or printed without checking its size, which can cause a buffer overflow.");
    fixes.push({ title: "Use size-safe string handling", explanation: "Fixed-size character arrays can overflow when the input is longer than the array.", before: "char name[10]; strcpy(name, input);", after: "std::string name = input;", avoid: "Prefer std::string in C++ and always limit input length in C." });
    edgeCases.unshift("A string longer than the destination buffer");
  }
  if (/\bgets\s*\(/.test(text)) {
    likelyBugs.push("gets() is unsafe because it cannot limit the amount of input read.");
    fixes.push({ title: "Replace gets()", explanation: "gets() can write past the end of an array and should not be used.", before: "gets(name);", after: "fgets(name, sizeof name, stdin);", avoid: "Use input functions that accept a maximum length." });
  }
  if (/\bnew\s+\w+/.test(text) && !/\bdelete\b/.test(text)) {
    likelyBugs.push("Memory created with new may never be released, causing a memory leak.");
    fixes.push({ title: "Avoid manual memory cleanup", explanation: "Every new should have a matching delete, but smart pointers are safer.", before: "User* user = new User();", after: "auto user = std::make_unique<User>();", avoid: "Use std::unique_ptr, std::vector, and other RAII containers in modern C++." });
    edgeCases.unshift("Repeatedly running the allocation code");
  }
  if (/\b(array|vector)\s*\[|\w+\s*\[\s*\w+\s*\]/.test(text) && !/\.at\s*\(/.test(text)) {
    likelyBugs.push("An array index may be outside the valid range if the input is not checked.");
    fixes.push({ title: "Validate array positions", explanation: "Indexes must be from 0 up to length - 1. Invalid indexes can crash or corrupt data.", before: "value = items[index];", after: "if (index >= 0 && index < items.size()) value = items[index];", avoid: "Check indexes that come from users, loops, or calculations." });
    edgeCases.unshift("An index of -1, 0, length - 1, and length");
  }
  if (/\b(cin\s*>>|scanf\s*\()/.test(text)) {
    likelyBugs.push("User input may be invalid, but the code may continue as if it were correct.");
    fixes.push({ title: "Check user input", explanation: "A user can type text when the program expects a number, leaving the program in an invalid state.", before: "cin >> age;", after: "if (!(cin >> age)) { cerr << \"Please enter a number\"; return 1; }", avoid: "Validate every value read from a user before using it." });
    edgeCases.unshift("Letters entered where a number is expected");
  }
  if (!likelyBugs.length) {
    likelyBugs.push(`No definite bug pattern was recognized in these ${lines.length} line(s) of ${language} code.`);
    fixes.push({ title: "Give the analyzer useful context", explanation: "This code may be valid, or the bug may depend on input not shown here. Include the exact error, expected result, and actual result for a more accurate review.", before: "// Code only", after: "// Code + error + expected result + actual result", avoid: "Keep functions small and test normal, empty, invalid, and boundary inputs." });
  }

  const highRisk = /delete|payment|password|auth|security|crash/.test(text);
  return {
    source: "sample",
    severity: highRisk ? "High" : "Medium",
    summary: "This is a helpful sample analysis. Add an API key later for analysis tailored to your exact code.",
    likelyBugs,
    fixes,
    edgeCases,
    testCases
  };
}

function findPythonSyntaxIssue(input) {
  const lines = input.split(/\r?\n/);
  const nonEmpty = lines.map((line, index) => ({ line, index })).filter(item => item.line.trim());
  const hasTabIndent = nonEmpty.some(item => /^\t+/.test(item.line));
  const hasSpaceIndent = nonEmpty.some(item => /^ +/.test(item.line));
  if (hasTabIndent && hasSpaceIndent) return { severity: "High", summary: "This file mixes tabs and spaces for indentation.", likelyBugs: ["Python can raise TabError or indent code differently than you expect."], fixes: [{ title: "Use four spaces consistently", explanation: "Python uses indentation to define code blocks, so every block must use one consistent style.", before: "\tprint(\"one\")\n    print(\"two\")", after: "    print(\"one\")\n    print(\"two\")", avoid: "Configure your editor to insert four spaces when you press Tab." }], improvedCode: "# Use four spaces for every indentation level", securityChecklist: "No direct security issue detected.", scalabilityTip: "Use a formatter and linter in CI to keep style consistent." };

  for (const { line, index } of nonEmpty) {
    const trimmed = line.trim();
    if (/^(print|input|len|range)\s*\(.*\)\s*:$/.test(trimmed)) return { severity: "High", summary: "This statement has a colon where Python does not allow one.", likelyBugs: ["print() is a normal function call, not the start of an indented block."], fixes: [{ title: "Remove the colon", explanation: "Only block starters such as if, for, while, def, class, try, and with use a colon.", before: trimmed, after: trimmed.replace(/:\s*$/, ""), avoid: "Use a colon only when the next line should become an indented block." }], improvedCode: trimmed.replace(/:\s*$/, ""), securityChecklist: "No direct security issue detected.", scalabilityTip: "Run a syntax checker or test suite before deployment." };

    if (/^(if|elif|else|for|while|def|class|try|except|finally|with|match|case)\b.*:\s*(#.*)?$/.test(trimmed)) {
      const baseIndent = line.match(/^\s*/)[0].length;
      const next = nonEmpty.find(item => item.index > index);
      if (!next || next.line.match(/^\s*/)[0].length <= baseIndent) return { severity: "High", summary: "A Python block starts here but its body is not indented.", likelyBugs: ["Python expects an indented statement after a line ending in a block colon."], fixes: [{ title: "Indent the block body", explanation: "Indentation is part of Python syntax, not just formatting.", before: `${trimmed}\nprint(\"hello\")`, after: `${trimmed}\n    print(\"hello\")`, avoid: "After if, for, while, def, class, try, with, and similar lines, indent the body by four spaces." }], improvedCode: `${trimmed}\n    # Add the block body here`, securityChecklist: "No direct security issue detected.", scalabilityTip: "Use an editor with Python formatting support." };
    }
  }

  const first = nonEmpty[0];
  if (first && /^\s+/.test(first.line)) return { severity: "High", summary: "The first statement is indented even though no block starts before it.", likelyBugs: ["Python may raise IndentationError: unexpected indent."], fixes: [{ title: "Remove the extra leading spaces", explanation: "Top-level statements should begin at the left edge.", before: first.line, after: first.line.trimStart(), avoid: "Only indent code that belongs inside a block." }], improvedCode: first.line.trimStart(), securityChecklist: "No direct security issue detected.", scalabilityTip: "Apply a formatter before committing code." };
  return null;
}

function findPythonDelimiterIssue(input) {
  const opening = new Set(["(", "[", "{"]);
  const matchingOpen = { ")": "(", "]": "[", "}": "{" };
  const matchingClose = { "(": ")", "[": "]", "{": "}" };
  const stack = [];
  let quote = null;
  let escaped = false;
  let line = 1;
  let column = 0;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    column += 1;
    if (character === "\n") { line += 1; column = 0; continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (character === "\\") { escaped = true; continue; }
      if (character === quote) quote = null;
      continue;
    }
    if (character === "#") {
      while (index + 1 < input.length && input[index + 1] !== "\n") index += 1;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (opening.has(character)) { stack.push({ character, line, column }); continue; }
    if (matchingOpen[character]) {
      const previous = stack.at(-1);
      if (!previous || previous.character !== matchingOpen[character]) {
        return { type: "unexpected", character, line, column, expected: previous ? matchingClose[previous.character] : null };
      }
      stack.pop();
    }
  }
  const previous = stack.at(-1);
  return previous ? { type: "unclosed", ...previous, expected: matchingClose[previous.character] } : null;
}

function findCppDelimiterIssue(input) {
  const opening = new Set(["(", "[", "{"]);
  const matchingOpen = { ")": "(", "]": "[", "}": "{" };
  const matchingClose = { "(": ")", "[": "]", "{": "}" };
  const stack = [];
  let quote = null;
  let escaped = false;
  let blockComment = false;
  let line = 1;
  let column = 0;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    column += 1;
    if (character === "\n") { line += 1; column = 0; continue; }
    if (blockComment) {
      if (character === "*" && next === "/") { blockComment = false; index += 1; column += 1; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (character === "\\") { escaped = true; continue; }
      if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "/") {
      while (index + 1 < input.length && input[index + 1] !== "\n") index += 1;
      continue;
    }
    if (character === "/" && next === "*") { blockComment = true; index += 1; column += 1; continue; }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (opening.has(character)) { stack.push({ character, line, column }); continue; }
    if (matchingOpen[character]) {
      const previous = stack.at(-1);
      if (!previous || previous.character !== matchingOpen[character]) return { type: "unexpected", character, line, column, expected: previous ? matchingClose[previous.character] : null };
      stack.pop();
    }
  }
  const previous = stack.at(-1);
  return previous ? { type: "unclosed", ...previous, expected: matchingClose[previous.character] } : null;
}

function findCppMissingSemicolon(input) {
  const lines = input.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const code = lines[index].replace(/\/\/.*$/, "").trim();
    if (!code || code.startsWith("#") || /[;{}:,]$/.test(code)) continue;
    if (/^(if|for|while|switch|catch|else|do|try|class|struct|namespace)\b/.test(code)) continue;
    if (/^[\w:<>,~*&\s]+\w+\s*\([^;]*\)\s*$/.test(code)) continue;
    if (/\breturn\b|\b(?:std::)?cout\s*<<|\b(?:const\s+)?(?:int|long|double|float|bool|char|auto|std::string|std::vector)\b/.test(code)) return { line: index + 1, code };
  }
  return null;
}

function findCppDivision(input) {
  const lines = input.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const code = lines[index].replace(/\/\/.*$/, "").trim();
    if (!code || code.startsWith("#") || code.startsWith("//")) continue;
    if (/(?:\b\w+\b|\)|\])\s*\/\s*(?:[+-]?\b\w+\b|[+-]?\d+(?:\.\d+)?)/.test(code)) return { line: index + 1, code };
  }
  return null;
}

function focusedSampleAnalysis(input, language) {
  const text = input.toLowerCase();
  const base = { source: "local", engine: "bugfree-local-v2", severity: "Low", likelyBugs: [], fixes: [], edgeCases: ["Empty input", "Unexpected input type", "Large input"], testCases: [{ name: "Expected input", steps: "Run with a normal valid value.", expected: "The result is correct." }, { name: "Invalid input", steps: "Use an invalid or missing value.", expected: "The program handles it safely." }], securityChecklist: "No high-risk pattern was found by the local check.", scalabilityTip: "Test the code with realistic and larger input sizes." };
  const report = values => ({ ...base, ...values });

  if (language === "C++") {
    const delimiterIssue = findCppDelimiterIssue(input);
    if (delimiterIssue) return report({ severity: "High", summary: "This C++ code cannot compile because its brackets do not match.", likelyBugs: [delimiterIssue.type === "unclosed" ? `The ${delimiterIssue.character} on line ${delimiterIssue.line} needs a matching ${delimiterIssue.expected}.` : `The ${delimiterIssue.character} on line ${delimiterIssue.line} has no matching opening bracket.`], fixes: [{ title: delimiterIssue.type === "unclosed" ? `Add the missing ${delimiterIssue.expected}` : `Fix the bracket pair`, explanation: "C++ requires brackets and braces to be paired in the correct order before the compiler can understand the code.", before: input, after: delimiterIssue.type === "unclosed" ? `${input}${delimiterIssue.expected}` : input, avoid: "Use bracket matching in your editor and compile early and often." }], improvedCode: delimiterIssue.type === "unclosed" ? `${input}${delimiterIssue.expected}` : input, securityChecklist: "Fix syntax errors before evaluating security.", scalabilityTip: "Add a compiler check to CI for every change." });
    const missingSemicolon = findCppMissingSemicolon(input);
    const unknownCout = /\bcout\s*<</.test(input) && !/\bstd::cout\s*<</.test(input) && !/using\s+namespace\s+std\s*;/.test(input);
    if (missingSemicolon || unknownCout) {
      let improvedCode = input;
      const fixes = [];
      const likelyBugs = [];
      if (missingSemicolon) {
        improvedCode = improvedCode.replace(missingSemicolon.code, `${missingSemicolon.code};`);
        likelyBugs.push(`Line ${missingSemicolon.line} is a statement, but C++ needs ; to mark where that statement ends.`);
        fixes.push({ title: "Add the semicolon", explanation: "C++ statements such as declarations, return statements, and std::cout output must end with a semicolon.", before: missingSemicolon.code, after: `${missingSemicolon.code};`, avoid: "When a line performs an action or stores a value, check that it ends in ;." });
      }
      if (unknownCout) {
        improvedCode = improvedCode.replace(/\bcout\b/g, "std::cout");
        likelyBugs.push("cout belongs to the C++ standard library as std::cout unless a using declaration brings it into scope.");
        fixes.push({ title: "Use std::cout", explanation: "Writing std::cout makes it clear that cout comes from the standard library and avoids hidden namespace conflicts.", before: "cout << \"Hello\";", after: "std::cout << \"Hello\";", avoid: "Prefer explicit std:: names in production C++ code instead of using namespace std;." });
      }
      return report({ severity: "High", summary: `This C++ code has ${fixes.length} compilation issue${fixes.length === 1 ? "" : "s"} to fix.`, likelyBugs, fixes, improvedCode, securityChecklist: "Fix compilation errors before evaluating security.", scalabilityTip: "Use compiler warnings in CI: -Wall -Wextra -Wpedantic." });
    }
    if (/\b(strcpy|gets)\s*\(/.test(text)) return report({ severity: "High", summary: "Unsafe C-style string handling can write beyond the destination buffer.", likelyBugs: ["This function does not safely limit copied input."], fixes: [{ title: "Use safer C++ strings", explanation: "A fixed character buffer can overflow when input is longer than expected.", before: "char name[10]; strcpy(name, input);", after: "std::string name = input;", avoid: "Use std::string and standard containers instead of raw character buffers." }], securityChecklist: "Replace unsafe string operations before deployment." });
    if (/\bnew\s+\w+/.test(text) && !/\b(delete|unique_ptr|shared_ptr)\b/.test(text)) return report({ severity: "Medium", summary: "Manual allocation may leak memory if every path does not release it.", likelyBugs: ["A new allocation has no visible RAII owner or matching delete."], fixes: [{ title: "Use RAII ownership", explanation: "Smart pointers clean up automatically, even when a function exits early.", before: "User* user = new User();", after: "auto user = std::make_unique<User>();", avoid: "Prefer std::unique_ptr, std::vector, and standard containers in modern C++." }], scalabilityTip: "Prefer standard containers to make memory ownership explicit." });
    if (/<=\s*\w+\.(size\s*\(|length\s*\()/.test(text)) return report({ severity: "Medium", summary: "This loop can access one item beyond the collection.", likelyBugs: ["The final valid index is size() - 1, but <= allows size()."], fixes: [{ title: "Use a strict upper bound", explanation: "C++ collections are zero-indexed, so size() itself is out of range.", before: "for (size_t i = 0; i <= items.size(); ++i)", after: "for (size_t i = 0; i < items.size(); ++i)", avoid: "Use < collection.size() for index-based loops." }] });
    const division = findCppDivision(input);
    if (division && !/\bif\s*\([^)]*\b\w+\s*!=\s*0/.test(input)) return report({ severity: "Medium", summary: "This division may fail or produce undefined behavior when the divisor is zero.", likelyBugs: [`Line ${division.line} divides a value without visibly checking the divisor first.`], fixes: [{ title: "Validate the divisor", explanation: "Check the divisor before dividing so bad input is handled intentionally instead of crashing.", before: division.code, after: `if (count == 0) throw std::invalid_argument(\"count must not be zero\");\n${division.code}`, avoid: "Validate values received from users, files, APIs, or calculations before using them as divisors." }], improvedCode: input, securityChecklist: "Validate all external numeric input before calculations." });
  }

  if (language === "Python") {
    const emptyPrint = input.match(/^\s*print\(\s*$/m);
    if (emptyPrint) {
      return report({
        severity: "High",
        summary: "This print statement is incomplete: its opening bracket is never closed.",
        likelyBugs: ["Python raises SyntaxError because every opening bracket must have a matching closing bracket."],
        fixes: [{
          title: "Close the print() call",
          explanation: "print( starts a function call. Add ) to show Python where that call ends.",
          before: "print(",
          after: "print()",
          avoid: "When you type (, [, or {, close it before running your code. Most editors can insert the matching character automatically."
        }],
        improvedCode: "print()",
        securityChecklist: "No direct security issue detected in this small snippet.",
        scalabilityTip: "Keep output code separate from application logic as your program grows."
      });
    }
    const incompletePrint = input.match(/^\s*print\(\s*([A-Za-z_]\w*)\s*$/m);
    if (incompletePrint && !new RegExp(`^\\s*${incompletePrint[1]}\\s*=`, "m").test(input)) {
      const name = incompletePrint[1];
      return report({
        severity: "High",
        summary: "This print statement cannot run because it is missing a closing bracket and treats text as a variable.",
        likelyBugs: [
          "print( is never closed with a matching ). Python raises SyntaxError before it runs the program.",
          `${name} has no quotes, so Python treats it as a variable. If it was meant to be text, this would later raise NameError.`
        ],
        fixes: [
          { title: "Close print()", explanation: "Every opening bracket needs a matching closing bracket. Python cannot read the file until print( is closed.", before: `print(${name}`, after: `print(${name})`, avoid: "Use an editor with bracket matching enabled and look for the matching pair before running code." },
          { title: "Put text inside quotes", explanation: `Python reads ${name} as a variable name. Quotes tell Python it is the text you want to show.`, before: `print(${name})`, after: `print(\"${name}\")`, avoid: "Write text in single or double quotes; only use a bare name after defining that variable." }
        ],
        improvedCode: `print(\"${name}\")`,
        securityChecklist: "No direct security issue detected in this small snippet.",
        scalabilityTip: "Keep output code separate from application logic as your program grows."
      });
    }
    const barePrintWithColon = input.match(/\bprint\(\s*([A-Za-z_]\w*)\s*\)\s*:/);
    if (barePrintWithColon && !new RegExp(`^\\s*${barePrintWithColon[1]}\\s*=`, "m").test(input)) return report({ severity: "High", summary: "This line has two Python errors that prevent it from running.", likelyBugs: [`The colon after print(...) is invalid because print is not a block starter.`, `${barePrintWithColon[1]} is treated as a variable, but it has not been defined.`], fixes: [{ title: "Remove the colon", explanation: "A colon belongs after block starters such as if, for, def, and class—not after print().", before: `print(${barePrintWithColon[1]}):`, after: `print(${barePrintWithColon[1]})`, avoid: "Use a colon only when the next line must be an indented block." }, { title: "Make the text a string", explanation: "Quotes tell Python that hello is text instead of a variable name.", before: `print(${barePrintWithColon[1]})`, after: `print("${barePrintWithColon[1]}")`, avoid: "Use quotes for text; use a bare name only for a defined variable." }], improvedCode: `print("${barePrintWithColon[1]}")`, securityChecklist: "No direct security issue detected in this small snippet.", scalabilityTip: "Keep output code separate from application logic as your program grows." });
    const delimiterIssue = findPythonDelimiterIssue(input);
    if (delimiterIssue) {
      const description = delimiterIssue.type === "unclosed"
        ? `The ${delimiterIssue.character} on line ${delimiterIssue.line} is missing its matching ${delimiterIssue.expected}.`
        : `The ${delimiterIssue.character} on line ${delimiterIssue.line} does not have a matching opening bracket.`;
      return report({
        severity: "High",
        summary: "Python cannot run this code because its brackets do not match.",
        likelyBugs: [description],
        fixes: [{
          title: delimiterIssue.type === "unclosed" ? `Add the missing ${delimiterIssue.expected}` : `Check the ${delimiterIssue.character}`,
          explanation: "Opening and closing brackets must be paired in the right order. Python stops before running when the pairs do not match.",
          before: input,
          after: delimiterIssue.type === "unclosed" ? `${input}${delimiterIssue.expected}` : input,
          avoid: "Use bracket matching in your editor and check the highlighted line before you run the program."
        }],
        improvedCode: delimiterIssue.type === "unclosed" ? `${input}${delimiterIssue.expected}` : input,
        securityChecklist: "Fix syntax errors before assessing security or deployment readiness.",
        scalabilityTip: "Keep functions short and use automated syntax checks in CI."
      });
    }
    const syntaxIssue = findPythonSyntaxIssue(input);
    if (syntaxIssue) return report(syntaxIssue);
    const bareNameStatement = input.match(/^\s*([A-Za-z_]\w*)\s*$/m);
    if (bareNameStatement && !/^(True|False|None|pass|break|continue)$/.test(bareNameStatement[1]) && !new RegExp(`^\s*(?:${bareNameStatement[1]}|def|class|import|from)\\b`, "m").test(input.replace(bareNameStatement[0], ""))) {
      const name = bareNameStatement[1];
      return report({ severity: "Medium", summary: `Python tries to read ${name} as a variable, but this code never defines it.`, likelyBugs: [`Running this code raises NameError: name '${name}' is not defined.`], fixes: [{ title: "Make the text explicit", explanation: `A bare word is a variable name in Python. If you wanted the program to display the word, put it inside quotes.`, before: name, after: `print("${name}")`, avoid: "Define variables before using them, or use quotes when you mean literal text." }], improvedCode: `print("${name}")`, securityChecklist: "No direct security issue detected in this small snippet.", scalabilityTip: "Use type checking and tests to catch undefined names before deployment." });
    }
    const barePrint = input.match(/\bprint\(\s*([A-Za-z_]\w*)\s*\)/);
    if (barePrint && !new RegExp(`^\\s*${barePrint[1]}\\s*=`, "m").test(input)) return report({ severity: "Medium", summary: `Python treats ${barePrint[1]} as a variable name, but no value for it is defined.`, likelyBugs: [`print(${barePrint[1]}) raises NameError because ${barePrint[1]} is not a string literal or a defined variable.`], fixes: [{ title: "Put text inside quotes", explanation: "Quotes tell Python that hello is text. Without quotes, Python looks for a variable called hello.", before: `print(${barePrint[1]})`, after: `print("${barePrint[1]}")`, avoid: "Use quotes for text. Use a bare name only after assigning a value to that variable." }], improvedCode: `print("${barePrint[1]}")`, securityChecklist: "No security risk detected in this small snippet.", scalabilityTip: "Keep output separate from business logic as the program grows." });
    if (/\bpickle\.(load|loads)\s*\(/.test(text)) return report({ severity: "Critical", summary: "Unpickling data can run arbitrary code when the data is not completely trusted.", likelyBugs: ["pickle.load or pickle.loads is unsafe for data received from users, files, or the network."], fixes: [{ title: "Use a safe data format", explanation: "Pickle can execute code while reading data. JSON is safer for untrusted data because it only represents data, not Python objects.", before: "data = pickle.loads(payload)", after: "import json\ndata = json.loads(payload)", avoid: "Only use pickle for data you fully trust and control." }], improvedCode: "import json\n\ndata = json.loads(payload)", securityChecklist: "Do not unpickle untrusted data." });
    if (/\bsubprocess\.(run|call|popen|check_output)\s*\([^)]*shell\s*=\s*true/.test(text)) return report({ severity: "Critical", summary: "shell=True can allow command injection when any command input is untrusted.", likelyBugs: ["User-controlled text may be interpreted by a system shell as additional commands."], fixes: [{ title: "Pass command arguments as a list", explanation: "A list avoids asking a shell to parse the command text.", before: "subprocess.run(f\"grep {term}\", shell=True)", after: "subprocess.run([\"grep\", term], check=True, text=True)", avoid: "Avoid shell=True. Validate and allow-list any arguments passed to external programs." }], improvedCode: "subprocess.run([\"grep\", term], check=True, text=True)", securityChecklist: "Remove shell=True from paths that process external input." });
    if (/\bos\.system\s*\(/.test(text)) return report({ severity: "High", summary: "os.system runs a shell command and makes safe argument handling difficult.", likelyBugs: ["Untrusted input can change the command that runs."], fixes: [{ title: "Use subprocess with explicit arguments", explanation: "subprocess lets you avoid shell parsing and check failures.", before: "os.system(command)", after: "subprocess.run([\"tool\", argument], check=True)", avoid: "Pass command arguments as a list; do not build shell command strings." }], improvedCode: "subprocess.run([\"tool\", argument], check=True)", securityChecklist: "Avoid os.system in production code." });
    if (/\bdatetime\.utcnow\s*\(/.test(text)) return report({ severity: "Low", summary: "datetime.utcnow() creates a timezone-naive value and is deprecated.", likelyBugs: ["A naive UTC timestamp can be mistaken for local time later in the program."], fixes: [{ title: "Create an aware UTC time", explanation: "An aware datetime carries its timezone, which prevents common conversion mistakes.", before: "from datetime import datetime\nnow = datetime.utcnow()", after: "from datetime import datetime, UTC\nnow = datetime.now(UTC)", avoid: "Store and exchange UTC datetimes with timezone information." }], improvedCode: "from datetime import datetime, UTC\n\nnow = datetime.now(UTC)", scalabilityTip: "Use timezone-aware values at service boundaries and in storage." });
    if (/from\s+typing\s+import\s+[^\n]*(\bList\b|\bDict\b|\bSet\b|\bTuple\b)/.test(input)) return report({ severity: "Low", summary: "This uses older typing aliases that modern Python can express with built-in generic types.", likelyBugs: ["typing.List and typing.Dict are deprecated aliases in modern Python."], fixes: [{ title: "Use built-in generic types", explanation: "Python supports list[str], dict[str, int], and similar annotations directly.", before: "from typing import List\ndef names() -> List[str]: ...", after: "def names() -> list[str]: ...", avoid: "Prefer built-in generic annotations in Python 3.9 and newer." }], improvedCode: "def names() -> list[str]:\n    return []", scalabilityTip: "Add type hints to public functions and validate them with a type checker." });
    if (/\brequests\.(get|post|put|delete|patch)\s*\(/.test(text) && !/timeout\s*=/.test(text)) return report({ severity: "Medium", summary: "This HTTP request has no timeout and can wait indefinitely.", likelyBugs: ["A slow dependency can consume worker capacity and make the service unreliable."], fixes: [{ title: "Set a request timeout", explanation: "A timeout bounds how long the program waits for another service.", before: "response = requests.get(url)", after: "response = requests.get(url, timeout=10)\nresponse.raise_for_status()", avoid: "Set connect/read timeouts and handle request exceptions." }], improvedCode: "response = requests.get(url, timeout=10)\nresponse.raise_for_status()", scalabilityTip: "Use timeouts, retries with backoff, and connection pooling for external services." });
    if (/\b\w+\s*=\s*open\s*\(/.test(text) && !/\.close\s*\(/.test(text)) return report({ severity: "Medium", summary: "This file may stay open if the function exits early or raises an error.", likelyBugs: ["A file handle is created without visible cleanup."], fixes: [{ title: "Use a context manager", explanation: "with closes the file automatically, including when an exception happens.", before: "file = open(path)\ndata = file.read()", after: "with open(path, encoding=\"utf-8\") as file:\n    data = file.read()", avoid: "Use with for files, locks, database sessions, and other resources." }], improvedCode: "with open(path, encoding=\"utf-8\") as file:\n    data = file.read()", scalabilityTip: "Always release resources deterministically under load." });
    if (/except\s+(baseexception|keyboardinterrupt|systemexit)\b/.test(text)) return report({ severity: "High", summary: "This handler catches control-flow exceptions that should normally stop the program.", likelyBugs: ["Catching KeyboardInterrupt or SystemExit can prevent clean shutdown and make a service hard to control."], fixes: [{ title: "Catch the expected application error", explanation: "Exception handlers should name the specific failure they can recover from.", before: "except BaseException as error:", after: "except ValueError as error:", avoid: "Do not catch BaseException, KeyboardInterrupt, or SystemExit in normal application code." }], improvedCode: "try:\n    value = parse_input(raw_value)\nexcept ValueError as error:\n    logger.warning(\"Invalid input: %s\", error)", securityChecklist: "Allow interrupts and shutdown signals to propagate." });
    if (/except\s+exception(?:\s+as\s+\w+)?\s*:\s*(pass|return\s+none)/.test(text)) return report({ severity: "High", summary: "This handler silently hides an unexpected application failure.", likelyBugs: ["The program may continue with missing or corrupted state, with no error record for debugging."], fixes: [{ title: "Handle a specific exception and preserve context", explanation: "Catch only errors you expect, log useful context, and either recover safely or re-raise.", before: "except Exception:\n    pass", after: "except ValueError as error:\n    logger.warning(\"Invalid value: %s\", error)\n    raise", avoid: "Never use pass or a silent return for broad Exception handlers." }], improvedCode: "try:\n    value = parse_input(raw_value)\nexcept ValueError as error:\n    logger.warning(\"Invalid value: %s\", error)\n    raise", securityChecklist: "Do not silently ignore failed validation or security checks." });
    if (/raise\s+exception\s*\(/.test(text)) return report({ severity: "Low", summary: "This raises the broad Exception type, which makes error handling less precise.", likelyBugs: ["Callers cannot distinguish an invalid value from a missing resource or service failure."], fixes: [{ title: "Raise a specific exception", explanation: "Specific exception classes tell callers what recovery action makes sense.", before: "raise Exception(\"Invalid user ID\")", after: "raise ValueError(\"Invalid user ID\")", avoid: "Use built-in or domain-specific exception classes that describe the actual failure." }], improvedCode: "raise ValueError(\"Invalid user ID\")", scalabilityTip: "Use consistent exception types at service boundaries for reliable retries and monitoring." });
    if (/\b(eval|exec)\s*\(/.test(text)) return report({ severity: "Critical", summary: "Dynamic execution can run untrusted code.", likelyBugs: ["eval() or exec() may execute attacker-controlled input."], fixes: [{ title: "Avoid executing strings", explanation: "Dynamic execution is dangerous when any part of the input is not fully trusted.", before: "result = eval(user_input)", after: "# Parse and validate a known input format instead.", avoid: "Use explicit parsing, mappings, or safe libraries for structured input." }], securityChecklist: "Remove eval/exec from production request paths." });
    if (/except\s*:/.test(text)) return report({ severity: "Medium", summary: "A bare except hides unexpected failures.", likelyBugs: ["The code catches every exception, including programming mistakes and system exits."], fixes: [{ title: "Catch expected exceptions", explanation: "Narrow exception handling makes bugs visible and gives users better messages.", before: "except:\n    pass", after: "except ValueError as error:\n    logger.warning('Invalid value: %s', error)", avoid: "Catch the smallest relevant exception type and log or handle it." }] });
    if (/def\s+\w+\([^)]*=\s*\[/.test(text)) return report({ severity: "Medium", summary: "A mutable default list can be shared across function calls.", likelyBugs: ["The same list may be reused when the function is called again."], fixes: [{ title: "Use None as the default", explanation: "Default argument values are created once, not every time the function runs.", before: "def add_item(item, items=[]):", after: "def add_item(item, items=None):\n    items = [] if items is None else items", avoid: "Use None for optional mutable values." }] });
  }

  if (language === "Java") {
    if (/\b\w+\s*==\s*"[^"]*"/.test(input)) return report({ severity: "High", summary: "Java string comparison with == compares object identity, not text.", likelyBugs: ["Two strings with the same characters may not be treated as equal."], fixes: [{ title: "Use equals for String values", explanation: "== checks whether two references point to the same object.", before: "if (role == \"admin\")", after: "if (\"admin\".equals(role))", avoid: "Use a constant on the left to stay safe when the variable is null." }] });
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(text)) return report({ severity: "Medium", summary: "An empty catch block silently hides an error.", likelyBugs: ["The application can continue in an unknown state with no record of the failure."], fixes: [{ title: "Handle or report the exception", explanation: "At minimum, record the failure and return a safe result.", before: "catch (Exception e) { }", after: "catch (Exception e) {\n  logger.error(\"Operation failed\", e);\n  throw e;\n}", avoid: "Do not swallow exceptions unless there is a documented recovery path." }] });
  }

  if (language === "JavaScript") {
    if (/\.innerhtml\s*=/.test(text)) return report({ severity: "High", summary: "Writing untrusted data with innerHTML can enable cross-site scripting.", likelyBugs: ["HTML from a user or API may run as script in the page."], fixes: [{ title: "Use textContent for plain text", explanation: "textContent renders text without interpreting it as HTML.", before: "element.innerHTML = userInput;", after: "element.textContent = userInput;", avoid: "Only use sanitized, trusted HTML with innerHTML." }], securityChecklist: "Avoid inserting untrusted HTML into the page." });
    if (/fetch\s*\(/.test(text) && !/\.catch\s*\(|try\s*\{/.test(text)) return report({ severity: "Medium", summary: "This request has no visible failure handling.", likelyBugs: ["A network error or non-success response can leave the UI in a broken state."], fixes: [{ title: "Check the response and catch failures", explanation: "fetch only rejects on network failures; HTTP errors need an explicit response.ok check.", before: "const response = await fetch('/api/data');", after: "const response = await fetch('/api/data');\nif (!response.ok) throw new Error('Request failed');", avoid: "Wrap async request code in try/catch and show a useful retry message." }] });
    if (/\b\w+\s*==\s*[^=]/.test(text)) return report({ severity: "Low", summary: "Loose equality can coerce values in surprising ways.", likelyBugs: ["A value such as 0, false, or an empty string may compare unexpectedly."], fixes: [{ title: "Use strict equality", explanation: "=== compares both value and type.", before: "if (status == 200)", after: "if (status === 200)", avoid: "Use === and !== unless type coercion is intentional and documented." }] });
  }

  return report({ summary: `No confirmed issue was found by BugFree's local check in this ${language} snippet.`, edgeCases: ["Empty or missing input", "Boundary values", "Unexpected external failures"], testCases: [{ name: "Normal behavior", steps: "Run the code with representative valid input.", expected: "It produces the expected result." }, { name: "Failure behavior", steps: "Simulate invalid input or a dependency failure.", expected: "It fails safely with a clear message." }] });
}

async function getAiAnalysis(input, language) {
  const standards = {
    "C++": "Use C++23 stable idioms: RAII, standard containers, and smart pointers where ownership is needed. Do not use C++26 proposals.",
    "Python": "Target Python 3.14 stable. Python 3.16 is currently in development, so do not introduce 3.16-only syntax unless the user explicitly requests it.",
    "Java": "Target Java SE 26 stable APIs and syntax. Do not introduce preview features.",
    "JavaScript": "Use ECMAScript 2026 standard syntax only when broadly compatible with the stated runtime; do not use proposals."
  };
  const prompt = `You are BugFree, a senior ${language} engineer, security reviewer, and patient teacher. Turn the user's code into a safer, production-oriented version. ${standards[language]} Find only real, visible problems. Preserve intended behavior; never invent missing requirements. Do not claim code is fully production-ready without noting assumptions. Return ONLY valid JSON with this exact shape: {"severity":"Low|Medium|High|Critical","summary":"short plain-English assessment","productionCode":"complete corrected code only, with no markdown fence","changes":[{"title":"short change","reason":"simple explanation of the original problem and why this fix is safer"}],"tests":[{"name":"test name","purpose":"what it verifies"}],"readiness":{"security":"specific status","reliability":"specific status","scalability":"specific practical advice"}}. Include every real bug or outdated pattern you can see. If the input is already sound, keep the code essentially unchanged and say so.\n\nInput:\n${input}`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", input: prompt })
  });
  if (!response.ok) throw new Error("OpenAI request failed");
  const data = await response.json();
  const output = data.output_text || "";
  const cleaned = output.replace(/^```json\s*|\s*```$/g, "").trim();
  return { ...JSON.parse(cleaned), source: "ai" };
}

function localProductionAnalysis(input, language) {
  const report = focusedSampleAnalysis(input, language);
  const fixes = report.fixes || [];
  const primaryFix = fixes[0];
  const productionCode = report.improvedCode || primaryFix?.after || input;
  const changes = fixes.length
    ? fixes.map(fix => ({ title: fix.title, reason: `${fix.explanation} ${fix.avoid ? `How to avoid it: ${fix.avoid}` : ''}`.trim() }))
    : [{ title: "No confirmed issue found", reason: "BugFree's local checks found no known problem in this snippet. Keep testing real inputs and dependencies before deployment." }];
  const tests = (report.testCases || []).map(test => ({ name: test.name, purpose: `${test.steps} Expected: ${test.expected}` }));
  return {
    source: "local",
    engine: "bugfree-local-v1",
    severity: report.severity,
    summary: report.summary,
    productionCode,
    highlights: localHighlights(input, language),
    changes,
    tests: tests.length ? tests : [{ name: "Normal behavior", purpose: "Use representative valid input and verify the expected output." }, { name: "Failure behavior", purpose: "Use invalid input and confirm the program fails safely." }],
    readiness: {
      security: report.securityChecklist || "No high-risk local pattern found. Review authentication and external input separately.",
      reliability: report.severity === "Low" ? "No known local reliability issue found." : "Apply the recommended fix, then run the suggested tests.",
      scalability: report.scalabilityTip || "Measure performance with realistic production-size inputs."
    }
  };
}

function localHighlights(input, language) {
  const highlights = [];
  const add = (line, title, explanation) => highlights.push({ line, title, explanation });
  const lines = input.split(/\r?\n/);
  const hasCatch = /\.catch\s*\(|try\s*\{/.test(input);
  const pythonDelimiterIssue = language === "Python" ? findPythonDelimiterIssue(input) : null;
  const cppDelimiterIssue = language === "C++" ? findCppDelimiterIssue(input) : null;
  const cppMissingSemicolon = language === "C++" ? findCppMissingSemicolon(input) : null;
  const cppDivision = language === "C++" ? findCppDivision(input) : null;
  lines.forEach((line, index) => {
    const number = index + 1;
    const text = line.trim();
    if (language === "Python") {
      const printName = text.match(/^print\(\s*([A-Za-z_]\w*)\s*\)\s*:/);
      const printWithColon = /^print\(.*\)\s*:$/.test(text);
      if (printName) add(number, "Invalid print statement", "The colon is not allowed after print(), and the unquoted word is treated as an undefined variable.");
      else if (printWithColon) add(number, "Invalid print statement", "The colon is not allowed after print(). A colon only starts a code block after statements such as if, for, def, or class.");
      const incompletePrint = text.match(/^print\(\s*([A-Za-z_]\w*)\s*$/);
      if (incompletePrint) add(number, "Incomplete print statement", `print( needs a closing ). ${incompletePrint[1]} is also read as a variable; use quotes if it is text.`);
      else if (/^print\(\s*$/.test(text)) add(number, "Incomplete print statement", "print( needs a closing ). Add it to finish the function call.");
      else if (/^print\(\s*[A-Za-z_]\w*\s*\)/.test(text) && !/^print\(\s*(True|False|None)\s*\)/.test(text)) add(number, "Possibly undefined name", "A bare word inside print() is a variable. Put text inside quotes or define the variable first.");
      else if (/^[A-Za-z_]\w*$/.test(text) && !/^(True|False|None|pass|break|continue)$/.test(text) && !new RegExp(`^\\s*(?:${text})\\s*=`, "m").test(input) && !new RegExp(`^\\s*(?:def|class)\\s+${text}\\b`, "m").test(input)) add(number, "Possibly undefined name", "A standalone word is treated as a variable. Define it first, or put it in quotes if it is text.");
      if (/\b(eval|exec)\s*\(/.test(text)) add(number, "Unsafe dynamic execution", "eval() and exec() can run untrusted code.");
      if (/\bpickle\.(load|loads)\s*\(/.test(text)) add(number, "Unsafe deserialization", "Untrusted pickle data can execute code while loading.");
      if (/\bsubprocess\..*shell\s*=\s*True/.test(text) || /\bos\.system\s*\(/.test(text)) add(number, "Shell command risk", "Shell commands can interpret untrusted text as commands.");
      if (/except\s*(Exception)?\s*:\s*(pass|return\s+None)?/.test(text)) add(number, "Exception may be hidden", "Broad or silent exception handlers can hide real failures.");
      if (/datetime\.utcnow\s*\(/.test(text)) add(number, "Outdated UTC time", "Use a timezone-aware UTC datetime instead.");
      if (pythonDelimiterIssue && pythonDelimiterIssue.line === number && !/^print\(\s*([A-Za-z_]\w*)?\s*$/.test(text)) {
        add(number, "Mismatched bracket", pythonDelimiterIssue.type === "unclosed" ? `This ${pythonDelimiterIssue.character} needs a matching ${pythonDelimiterIssue.expected}.` : `This ${pythonDelimiterIssue.character} does not match the earlier bracket.`);
      }
    }
    if (language === "JavaScript") {
      if (/\.innerHTML\s*=/.test(text)) add(number, "Potential XSS", "Untrusted HTML can run code in the page.");
      if (/fetch\(/.test(text) && !hasCatch) add(number, "Missing request handling", "Network and HTTP failures need explicit handling.");
      if (/password\s*===\s*["']/.test(text)) add(number, "Hard-coded password", "Secrets should never be stored in client code.");
    }
    if (language === "Java") {
      if (/\b\w+\s*==\s*"[^"]*"/.test(text)) add(number, "Incorrect String comparison", "Use .equals() to compare text values in Java.");
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(text)) add(number, "Empty catch block", "The error disappears with no recovery or log message.");
    }
    if (language === "C++") {
      if (cppDelimiterIssue && cppDelimiterIssue.line === number) add(number, "Mismatched bracket", cppDelimiterIssue.type === "unclosed" ? `This ${cppDelimiterIssue.character} needs a matching ${cppDelimiterIssue.expected}.` : `This ${cppDelimiterIssue.character} has no matching opening bracket.`);
      if (cppMissingSemicolon && cppMissingSemicolon.line === number) add(number, "Missing semicolon", "C++ statements need ; at the end.");
      if (/\bcout\s*<</.test(text) && !/\bstd::cout\s*<</.test(text) && !/using\s+namespace\s+std\s*;/.test(input)) add(number, "Unknown name: cout", "Use std::cout or add a specific using declaration.");
      if (/\b(strcpy|gets)\s*\(/.test(text)) add(number, "Unsafe string handling", "This can write beyond a fixed-size buffer.");
      if (/\bnew\s+\w+/.test(text)) add(number, "Manual memory ownership", "Prefer RAII or a smart pointer to avoid memory leaks.");
      if (/<=\s*\w+\.size\s*\(/.test(text)) add(number, "Loop bound can overflow", "size() is one past the final valid index.");
      if (cppDivision && cppDivision.line === number) add(number, "Possible division by zero", "Validate the divisor before dividing.");
    }
  });
  return highlights;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/analyze") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { input = "", language = "JavaScript", demoMode = false } = JSON.parse(body);
        const supportedLanguages = new Set(["C++", "Python", "Java", "JavaScript"]);
        if (!input.trim()) return send(res, 400, { error: "Please paste some code or an error message first." });
        if (!supportedLanguages.has(language)) return send(res, 400, { error: "BugFree currently supports C++, Python, Java, and JavaScript." });
        return send(res, 200, localProductionAnalysis(input, language));
      } catch { send(res, 400, { error: "Something went wrong. Please try again." }); }
    });
    return;
  }

  const requested = req.url === "/" ? "index.html" : req.url.split("?")[0].replace(/^\//, "");
  const file = path.normalize(path.join(publicFolder, requested));
  if (!file.startsWith(publicFolder) || !fs.existsSync(file)) return send(res, 404, "Not found", "text/plain");
  const types = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml" };
  send(res, 200, fs.readFileSync(file), types[path.extname(file)] || "text/plain");
});

if (require.main === module) {
  const listenOnAvailablePort = candidate => {
    server.once("error", error => {
      if (error.code === "EADDRINUSE" && candidate < port + 20) {
        console.log(`Port ${candidate} is busy; trying ${candidate + 1}...`);
        listenOnAvailablePort(candidate + 1);
        return;
      }
      console.error(error);
      process.exitCode = 1;
    });
    server.listen(candidate, () => console.log(`BugFree is ready at http://localhost:${candidate}`));
  };
  listenOnAvailablePort(port);
}

module.exports = { focusedSampleAnalysis, localProductionAnalysis, sampleAnalysis };
