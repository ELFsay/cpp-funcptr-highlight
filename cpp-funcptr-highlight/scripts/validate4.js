// 与 src/extension.ts 一致的正则
const STANDALONE_RE = /(?<![A-Za-z0-9_.\-])([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/g;
const KEYWORDS = new Set([
  'if','for','while','do','switch','case','default','return','goto','sizeof','typeof','alignof',
  'decltype','new','delete','catch','try','throw','else','defined','register','extern','static',
  'const','volatile','union','enum','struct','typedef','inline','restrict','namespace','template',
  'class','typename','using','public','private','protected','friend','operator','virtual','override',
  'final','constexpr','constinit','consteval','explicit','mutable','thread_local','requires','concept',
  'co_await','co_yield','co_return','_Atomic','_Generic','_Noreturn','_Static_assert','_Thread_local',
  'void','_Bool','bool','char','wchar_t','char16_t','char32_t','short','int','long','float','double',
  'signed','unsigned','auto','size_t','ssize_t','ptrdiff_t','intptr_t','uintptr_t',
  'int8_t','int16_t','int32_t','int64_t','uint8_t','uint16_t','uint32_t','uint64_t',
  'nullptr','true','false'
]);
function hits(s) { STANDALONE_RE.lastIndex = 0; let m; const out = []; while ((m = STANDALONE_RE.exec(s)) !== null) { if (!KEYWORDS.has(m[1])) out.push(m[1]); } return out; }
const cases = [
  'void (*pwm_enable)(void *context, bool enabled);',  // 声明：void/pwm_enable 都不该标
  'pwm_enable(&s, M_PI_F);',                            // 调用：应标 pwm_enable
  'int x = foo(1);',                                    // foo 应标（普通函数）
  'if (a) {}'                                           // 关键字不标
];
for (const c of cases) console.log(c.padEnd(48), '=>', hits(c).join(', ') || '(无)');
