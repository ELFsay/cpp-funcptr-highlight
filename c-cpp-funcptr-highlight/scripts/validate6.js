const CALL_RE = /(?<![A-Za-z0-9_.\-])([A-Za-z_][A-Za-z0-9_]*)[ \t]*\((?![ \t]*\*)/g;
const DECL_RE = /(?<=\(\s*\*\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*\(/g;
const KW = new Set(['if','for','while','do','switch','case','default','return','goto','sizeof','typeof','alignof','decltype','new','delete','catch','try','throw','else','defined','void','_Bool','bool','char','wchar_t','char16_t','char32_t','short','int','long','float','double','signed','unsigned','auto']);
function hit(s) {
  const out = [];
  CALL_RE.lastIndex = 0; let m;
  while ((m = CALL_RE.exec(s)) !== null) if (!KW.has(m[1])) out.push(m[1]);
  DECL_RE.lastIndex = 0;
  while ((m = DECL_RE.exec(s)) !== null) out.push(m[1]);
  return out;
}
const cases = [
  ['void (*pwm_enable)(void *context, bool enabled);', 'pwm_enable'],
  ['pwm_enable(&s, M_PI_F);', 'pwm_enable'],
  ['MyStatus (*init)(int code);', 'init'],
  ['(*cb)(value);', 'cb'],
  ['(*p).field = 1;', ''],
  ['int x = foo(1);', 'foo'],
  ['if (a) { }', ''],
  ['(int)(x);', ''],
  ['void fn(void (*done)(int));', 'done'] // 已知局限：fn 是普通函数，语法无法与函数指针区分，会一并匹配
];
let pass = true;
for (const [code, expect] of cases) {
  const got = hit(code);
  const exp = expect ? expect.split(',') : [];
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) pass = false;
  console.log(ok ? 'PASS' : 'FAIL', code.padEnd(46), '期望=[' + exp.join(',') + '] 实际=[' + got.join(',') + ']');
}
console.log('\n(注: 最后一行为已知局限——普通函数 fn( 与函数指针调用语法不可区分)');
console.log('全部通过:', pass);
