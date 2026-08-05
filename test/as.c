#include "as.h"

typedef struct {
  void *context;
  float value;
} aa;

typedef struct {
  void *context;
  aa (*read)(void *context,
                     float *sample); // 函数指针成员，形参 context / sample
  void (*enable)(void *context,
                     bool enabled); // 函数指针成员，形参 context / enabled
  float (*compute)(const float *a, float *out,
                   uint32_t n); // 复合形参：const / 指针 / 数组
  int32_t count;                // 普通数据成员（不应标）
} bb;

// 独立声明的函数指针变量（开启 highlightStandaloneFnPtr 后应标）
void (*g_enable)(void *context, bool enabled);
void test(void *context, bool enabled){}
int a(void) {
  bb s;
  bb *p = &s;
  float g_sample = 1.0f;
  float out = 0.0f;

  /* ① 成员函数指针调用：应金色（highlightMemberCalls） */
  s.enable(&s, true);
  p->read(&s, &g_sample);
  s.compute(&g_sample, &out, 16);


  /* ② 独立函数指针变量调用：开启 highlightStandaloneFnPtr 后应金色 */
  g_enable(&s, true);
  void (*local)(void *, bool) = g_enable;
  (*local)(&s, false); // 解引用调用，应标 local

  /* ③ 普通数据成员访问：后面不带括号，应保持默认变量色（不应标） */
  int c = s.count;

  /* ④ 注释里的相似文本：不应标 */
  // s.enable(&s, false);
  /* p->read(&s, &g_sample); */

  /* ⑤ 字符串里的相似文本：不应标 */
  const char *str = "s.enable(&s, false)";

  /* ⑥ 关键字与类型转换：不应标 */
  if (s.count > 0) {
  }
  int x = (int)(3.14f);

  return 0;
}
