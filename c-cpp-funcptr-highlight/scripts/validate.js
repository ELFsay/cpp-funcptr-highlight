const fs = require('fs');
const path = require('path');
const text = fs.readFileSync(path.join(__dirname, '..', 'src', 'test', 'sample.c'), 'utf8');

// 与 src/extension.ts 等价的正则（字面量形式，避免字符串转义差异）
const RE = /(?:\.|->)[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/g;

// 与 src/extension.ts 完全一致的注释/字符串掩码逻辑
function buildCodeMask(text) {
  const n = text.length;
  const mask = new Uint8Array(n);
  let i = 0;
  let inLine = false, inBlock = false, inStr = false, inChar = false;
  while (i < n) {
    const ch = text[i], next = text[i + 1];
    if (!inLine && !inBlock && !inStr && !inChar) {
      if (ch === '"') { inStr = true; mask[i] = 1; i++; continue; }
      if (ch === "'") { inChar = true; mask[i] = 1; i++; continue; }
      if (ch === '/' && next === '/') { inLine = true; mask[i] = 1; mask[i + 1] = 1; i += 2; continue; }
      if (ch === '/' && next === '*') { inBlock = true; mask[i] = 1; mask[i + 1] = 1; i += 2; continue; }
      mask[i] = 1; i++; continue;
    }
    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === '"') inStr = false;
      i++; continue;
    }
    if (inChar) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === "'") inChar = false;
      i++; continue;
    }
    if (inLine) {
      if (ch === '\n') inLine = false;
      i++; continue;
    }
    if (ch === '*' && next === '/') { i += 2; inBlock = false; continue; }
    i++;
  }
  return mask;
}

const mask = buildCodeMask(text);
const hits = [];
let m;
while ((m = RE.exec(text)) !== null) {
  const name = m[1];
  const startOffset = m.index + m[0].indexOf(name);
  const line = text.slice(0, startOffset).split('\n').length;
  hits.push({ name, inCode: mask[startOffset] === 1, line });
}
console.log('全部命中:', hits.map(h => `${h.name}@L${h.line}(${h.inCode ? '代码' : '注释/字符串'})`).join('  '));
const code = hits.filter(h => h.inCode);
const angle = code.filter(h => h.name === 'angle_read').length;
console.log('验证1(4个angle_read):', angle === 4 ? 'PASS' : 'FAIL');
console.log('验证2(注释/字符串fake未误标):', code.every(h => h.name !== 'fake') ? 'PASS' : 'FAIL');
console.log('验证3(普通成员angle/speed/id未误标):', code.every(h => h.name !== 'angle' && h.name !== 'speed' && h.name !== 'id') ? 'PASS' : 'FAIL');
