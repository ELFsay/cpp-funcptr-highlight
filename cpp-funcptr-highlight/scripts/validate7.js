const fs = require('fs');
const text = fs.readFileSync(require('path').join(__dirname, '..', '..', 'test', 'as.c'), 'utf8');
const MEMBER_RE = /(?:\.|->)[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/g;
const CALL_RE = /(?<![A-Za-z0-9_>.\-])([A-Za-z_][A-Za-z0-9_]*)[ \t]*\((?![ \t]*\*)/g;
const DECL_RE = /(?<=\(\s*\*\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*\(/g;
const KW = new Set(['if','for','while','do','switch','case','default','return','goto','sizeof','typeof','alignof','decltype','new','delete','catch','try','throw','else','defined','void','_Bool','bool','char','wchar_t','char16_t','char32_t','short','int','long','float','double','signed','unsigned','auto']);
function buildCodeMask(t){ const n=t.length; const mask=new Uint8Array(n); let i=0; let line=false,block=false,str=false,chr=false; while(i<n){ const ch=t[i],nx=t[i+1]; if(!line&&!block&&!str&&!chr){ if(ch==='"'){str=true;mask[i]=1;i++;continue;} if(ch==="'"){chr=true;mask[i]=1;i++;continue;} if(ch==='/'&&nx==='/'){line=true;mask[i]=1;mask[i+1]=1;i+=2;continue;} if(ch==='/'&&nx==='*'){block=true;mask[i]=1;mask[i+1]=1;i+=2;continue;} mask[i]=1;i++;continue; } if(str){if(ch==='\\'){i+=2;continue;}if(ch==='"')str=false;i++;continue;} if(chr){if(ch==='\\'){i+=2;continue;}if(ch==="'")chr=false;i++;continue;} if(line){if(ch==='\n')line=false;i++;continue;} if(ch==='*'&&nx==='/'){i+=2;block=false;continue;} i++; } return mask; }
const mask = buildCodeMask(text);
function lineOf(off){ return text.slice(0,off).split('\n').length; }
function collect(re, kind, useFilter){ re.lastIndex=0; let m; const byLine={}; while((m=re.exec(text))!==null){ const name=m[1]; if(useFilter&&KW.has(name)) continue; const off=m.index+m[0].indexOf(name); if(mask[off]===1){ const ln=lineOf(off); (byLine[ln]=byLine[ln]||[]).push(kind+':'+name); } } return byLine; }
const all={}; for(const o of [collect(MEMBER_RE,'成员',false), collect(DECL_RE,'声明',false), collect(CALL_RE,'调用',true)]) for(const k in o) (all[k]=all[k]||[]).push(...o[k]);
const lines=text.split('\n');
for(let i=0;i<lines.length;i++){ const hit=all[i+1]; if(hit) console.log('L'+(i+1), lines[i].trim().padEnd(56), '=>', hit.join('  ')); }

