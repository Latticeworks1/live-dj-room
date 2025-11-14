#!/usr/bin/env node

/**
 * Pre-commit verification checks
 * - Remove emojis from code
 * - Check for hardcoded secrets
 * - Validate file sizes
 * - Check Socket.IO event naming conventions
 */

const fs = require('fs');
const path = require('path');

// Get files from command line arguments (passed by lint-staged)
const files = process.argv.slice(2);

// Emoji regex pattern
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2B06}\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu;

// Secret patterns to detect
const SECRET_PATTERNS = [
  { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, name: 'API Key' },
  { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, name: 'Password' },
  { pattern: /token\s*[:=]\s*['"][^'"]+['"]/gi, name: 'Token' },
  { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/gi, name: 'Secret' },
  { pattern: /github_pat_\w+/gi, name: 'GitHub Personal Access Token' },
  { pattern: /sk-[a-zA-Z0-9]{48}/gi, name: 'OpenAI API Key' },
];

// Socket.IO event naming convention (lowercase with spaces)
const SOCKET_EVENT_PATTERN = /socket\.(emit|on|broadcast\.emit)\s*\(\s*['"]([^'"]+)['"]/g;

let hasErrors = false;
let hasWarnings = false;

console.log('🔍 Running pre-commit checks...\n');

files.forEach((file) => {
  if (!file.endsWith('.js')) return;
  if (file.includes('node_modules')) return;

  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const fileName = path.basename(file);

  // Check 1: Remove emojis from code (not in strings or comments)
  const emojiMatches = content.match(EMOJI_REGEX);
  if (emojiMatches && emojiMatches.length > 0) {
    console.log(`⚠️  [${fileName}] Found ${emojiMatches.length} emoji(s) - removing...`);

    // Remove emojis (simple approach - removes all emojis)
    // More sophisticated: preserve in comments and strings
    content = content.replace(EMOJI_REGEX, '');
    modified = true;
    hasWarnings = true;
  }

  // Check 2: Detect hardcoded secrets
  SECRET_PATTERNS.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`❌ [${fileName}] SECURITY: Potential ${name} detected!`);
      console.log(`   Matches: ${matches.join(', ')}`);
      console.log(`   ⚠️  Remove sensitive data before committing!\n`);
      hasErrors = true;
    }
  });

  // Check 3: Check for debugger statements
  if (/\bdebugger\b/.test(content)) {
    console.log(`⚠️  [${fileName}] Found debugger statement - should remove before commit`);
    hasWarnings = true;
  }

  // Check 4: File size check (warn if > 500 lines)
  const lines = content.split('\n').length;
  if (lines > 500) {
    console.log(`⚠️  [${fileName}] Large file detected (${lines} lines)`);
    console.log(`   Consider splitting into smaller modules\n`);
    hasWarnings = true;
  }

  // Check 5: Validate Socket.IO event naming
  let match;
  while ((match = SOCKET_EVENT_PATTERN.exec(content)) !== null) {
    const eventName = match[2];

    // Check if event follows convention (lowercase, spaces for multi-word)
    if (eventName !== eventName.toLowerCase()) {
      console.log(`⚠️  [${fileName}] Socket.IO event naming: "${eventName}"`);
      console.log(`   Convention: use lowercase (e.g., "${eventName.toLowerCase()}")\n`);
      hasWarnings = true;
    }

    // Check for camelCase (should use spaces instead)
    if (/[a-z][A-Z]/.test(eventName)) {
      console.log(`⚠️  [${fileName}] Socket.IO event naming: "${eventName}"`);
      console.log(`   Convention: use spaces instead of camelCase`);
      console.log(`   Example: "new message" instead of "newMessage"\n`);
      hasWarnings = true;
    }
  }

  // Check 6: Check for .env files being committed
  if (file.includes('.env') && !file.includes('.env.example')) {
    console.log(`❌ [${fileName}] CRITICAL: .env file should not be committed!`);
    console.log(`   Add to .gitignore or use .env.example instead\n`);
    hasErrors = true;
  }

  // Write modifications back if any
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ [${fileName}] Cleaned and updated\n`);
  }
});

// Summary
console.log('━'.repeat(50));
if (hasErrors) {
  console.log('❌ Pre-commit checks FAILED - fix errors above');
  console.log('   Use --no-verify to skip (NOT RECOMMENDED)\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Pre-commit checks completed with warnings');
  console.log('   Review warnings above but allowing commit\n');
  process.exit(0);
} else {
  console.log('✅ All pre-commit checks passed!\n');
  process.exit(0);
}
