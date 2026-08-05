#ifndef PMSM_FOC_H_
#define PMSM_FOC_H_

#include <stdint.h>
#include <stddef.h>

#include "pmsm_foc_context.h"

#ifdef __cplusplus
extern "C" {
#endif

/* ==================== 编译/平台宏 ==================== */
#define _RAM_FUNC

/* ==================== 数学常量 ==================== */
#define M_PI_F         3.14159265358979323846F
#define M_2PI_F        6.28318530717958647693F
#define DIV_2PI_F      0.15915494309189533577F

/* ==================== 相序枚举 ==================== */
typedef enum {
    pmsm_foc_phase_abc = 0,
    pmsm_foc_phase_acb,
} pmsm_foc_phase_order_e;

/* ==================== 辅助函数声明 ==================== */
float motor_wrap_pm_pi(float angle);
float motor_sat(float val, float upper, float lower);
void pid_clear(pid_para_t *pid);
void pid_limit_init(pid_para_t *pid, float out_max, float out_min, float i_term_max, float i_term_min);

/* ==================== 电机参数子结构（pmsm_foc_param_t 所需，context.h 未定义） ==================== */
typedef struct {
    float Rs;
    float Ld;
    float Lq;
    float Ls;
    float Ldif;
    float flux;
    float Ke;
    float Kt;
    float Npp;
} pmsm_motor_elec_t;

typedef struct {
    float B;
    float Tc;
    float Js;
    float Gr_eff;
    float Gr;
} pmsm_motor_mech_t;

typedef struct {
    pmsm_foc_phase_order_e phase_order;
    float e_off;
    float r_off;
} pmsm_motor_sensor_t;

typedef struct {
    float inv_Npp;
    float Npp_over_2pi;
    float GKt;
    float inv_Kt;
    float inv_GKt;
    float inv_Gr;
} pmsm_motor_calc_t;

typedef struct {
    float peak_torque;
} pmsm_motor_nameplate_output_t;

typedef struct {
    pmsm_motor_nameplate_output_t output;
} pmsm_motor_nameplate_t;

typedef struct {
    pmsm_motor_elec_t elec;
    pmsm_motor_mech_t mech;
    pmsm_motor_sensor_t sensor;
    pmsm_motor_calc_t calc;
    pmsm_motor_nameplate_t nameplate;
} pmsm_motor_param_t;

typedef struct {
    pmsm_motor_param_t motor;
} pmsm_foc_param_t;

/* ==================== 其他 context.h 中 pmsm_t 引用的缺失类型 ==================== */
typedef struct {
    float torque;
    float speed;
    float position;
    float id_ref;
    float iq_ref;
    uint8_t enable;
    uint8_t mode_override;
} pmsm_foc_cmd_t;

typedef struct {
    float id;
    float iq;
    float speed;
    float position;
    float torque;
} pmsm_foc_ref_t;

typedef struct {
    float vd;
    float vq;
    float valpha;
    float vbeta;
    float theta;
    uint8_t open_loop_en;
} pmsm_foc_open_t;

typedef struct {
    float iq_pos;
    float iq_neg;
    float id_pos;
    float id_neg;
    float speed_pos;
    float speed_neg;
    float torque_max;
    float vd_max;
    float vq_max;
} pmsm_foc_limit_t;

typedef struct {
    uint8_t id_en;
    uint8_t iq_en;
    uint8_t speed_en;
    uint8_t position_en;
    uint8_t feedforward_en;
    uint8_t decouple_en;
    uint8_t mod_index;
    float vq_feedforward;
    float vd_feedforward;
} pmsm_foc_ctrl_t;

/* ==================== FOC 控制函数声明 ==================== */
void foc_volt(pmsm_t *pm, float vd, float vq, float theta);
void foc_curr(pmsm_t *pm, float id_ref, float iq_ref, float theta);
void foc_spd_pi_calc(pmsm_t *pm);
void foc_cur_pi_calc(pmsm_t *pm);

/* ==================== 对齐与辨识入口 ==================== */
void pmsm_foc_routine_init(void);
void pmsm_foc_encoder_align(pmsm_t *pm);
void cali_motor_param(pmsm_t *pm);
void cali_motor_res(pmsm_t *pm);
void cali_motor_ind(pmsm_t *pm);
void cali_motor_flux(pmsm_t *pm);
void cali_motor_js(pmsm_t *pm);

/* ==================== 外部全局变量 ==================== */
extern pmsm_t pm;

#ifdef __cplusplus
}
#endif

#endif /* PMSM_FOC_H_ */
