// 与 src/extension.ts 一致的正则
const CALL_RE = /(?:\.|->)[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/g;
const STANDALONE_RE = /(?<![A-Za-z0-9_.\-])([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/g;
const KEYWORDS = new Set(['if','for','while','do','switch','case','default','return','goto','sizeof','typeof','alignof','decltype','new','delete','catch','try','throw','else','defined','register','extern','static','const','volatile','union','enum','struct','typedef','inline','restrict','namespace','template','class','typename','using','public','private','protected','friend','operator','virtual','override','final','constexpr','constinit','consteval','explicit','mutable','thread_local','requires','concept','co_await','co_yield','co_return','_Atomic','_Generic','_Noreturn','_Static_assert','_Thread_local']);

const tests = [
  ['s.pwm_enable(&s, M_PI_F);', 'member', 'pwm_enable'],
  ['pwm_enable(&s, M_PI_F);',   'standalone', 'pwm_enable'],
  ['axis->io.port.angle_read(0x01);', 'member', 'angle_read'],
  ['int e = axis.io.port.angle;', 'member', null],
  ['if (x) { }', 'standalone', null],
  ['for (;;) { }', 'standalone', null],
  ['return 0;', 'standalone', null],
  ['printf("hi");', 'standalone', 'printf'],
  ['fnptr(5);', 'standalone', 'fnptr']
];
function match(re, s) { re.lastIndex = 0; let m; const out = []; while ((m = re.exec(s)) !== null) out.push(m[1]); return out; }
let pass = true;
for (const [code, mode, expect] of tests) {
  let got = null;
  if (mode === 'member') got = match(CALL_RE, code)[0] ?? null;
  else { const hits = match(STANDALONE_RE, code).filter(n => !KEYWORDS.has(n)); got = hits[0] ?? null; }
  const ok = (got ?? null) === expect;
  if (!ok) pass = false;
  console.log(ok ? 'PASS' : 'FAIL', code.padEnd(42), '期望=' + expect, '实际=' + got);
}
console.log('\n全部通过:', pass ? '是' : '否');
