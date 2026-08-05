#include"pmsm_foc.h"
typedef struct
{
    void *context;
    void (*control_read)(void *context, float *sample);

    void (*pwm_enable)(void *context, bool enabled);
} ecsa_axis_port_t;
int a()
{
    ecsa_axis_port_t s;
    s.pwm_enable(&s, M_PI_F);
}
