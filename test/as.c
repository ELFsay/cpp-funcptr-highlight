#include"as.h"
typedef struct
{
    void *context;

} aa;

typedef struct
{
    void *context;
    aa (*control_read)(void *context, float *sample);

    void (*pwm_enable)(void *context, bool enabled);
} bb;

int a()
{
    bb s;
    s.pwm_enable(&s, M_PI_F);
}
