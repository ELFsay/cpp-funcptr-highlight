const re = /(?:\.|->)[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/g;
const cases = [
  's.pwm_enable(&s, M_PI_F);',
  'ret = pAxis->io.port.angle_read(0x01);',
  'axis.io.port.angle_read( 0x02 );'
];
for (const c of cases) {
  re.lastIndex = 0;
  let m;
  const names = [];
  while ((m = re.exec(c)) !== null) { names.push(m[1]); }
  console.log(c.padEnd(40), '=> exec 捕获到:', names.join(', ') || '(无)');
}
