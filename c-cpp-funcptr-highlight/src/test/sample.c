#include <stdio.h>
#include <stdint.h>

typedef int (*read_fn)(uint32_t reg);

#define TEST_MACRO 0x1F

typedef struct {
    read_fn angle_read;   // 函数指针成员
    int32_t angle;        // 普通数据成员
} Port;

typedef struct {
    Port port;
    float speed;
} IO;

typedef struct {
    IO io;
    int id;
} Axis;

int main(void) {
    Axis axis = {0};
    Axis *pAxis = &axis;

    // 下面 4 处应为金黄色（函数指针调用 obj.func( / ptr->func( )
    int a = pAxis->io.port.angle_read(0x01);
    int b = axis.io.port.angle_read(0x02);
    int c = pAxis->io.port.angle_read(0x03);
    int d = axis.io.port.angle_read(0x04);

    // 下面这些应保持默认变量颜色（普通成员，后面不带括号）
    int e = axis.io.port.angle;
    float f = pAxis->io.speed;
    int g = pAxis->id;
    int h = TEST_MACRO;

    // 注释里的相似文本不应被高亮：pAxis->io.fake(
    const char *s = "pAxis->io.fake(";

    printf("%d %d %d %d %d %f %d %d %s\n", a, b, c, d, e, f, g, h, s);
    return 0;
}
