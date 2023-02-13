# 안드로이드 기본센서 & 복합센서

- [안드로이드 동작 센서](https://developer.android.com/guide/topics/sensors/sensors_motion?hl=ko)
- [안드로이드 센서 유형](https://source.android.com/docs/core/interaction/sensors/sensor-types?hl=ko)

## TYPE_ACCELEROMETER

SensorEvent.values[0] x축의 가속력(중력 포함). m/s2
SensorEvent.values[1] y축의 가속력(중력 포함). m/s2
SensorEvent.values[2] z축의 가속력(중력 포함). m/s2

## TYPE_ACCELEROMETER_UNCALIBRATED

SensorEvent.values[0] 편향 보상 없이 X축을 따라 측정한 가속. m/s2
SensorEvent.values[1] 편향 보상 없이 Y축을 따라 측정한 가속. m/s2
SensorEvent.values[2] 편향 보상 없이 Z축을 따라 측정한 가속. m/s2
SensorEvent.values[3] 추정된 편향 보상을 적용하여 X축을 따라 측정한 가속. m/s2
SensorEvent.values[4] 추정된 편향 보상을 적용하여 Y축을 따라 측정한 가속. m/s2
SensorEvent.values[5] 추정된 편향 보상을 적용하여 Z축을 따라 측정한 가속. m/s2

## TYPE_GRAVITY

SensorEvent.values[0] x축의 중력. m/s2
SensorEvent.values[1] y축의 중력. m/s2
SensorEvent.values[2] z축의 중력. m/s2

## TYPE_GYROSCOPE

SensorEvent.values[0] x축을 중심으로 한 회전 속도. rad/s
SensorEvent.values[1] y축을 중심으로 한 회전 속도. rad/s
SensorEvent.values[2] z축을 중심으로 한 회전 속도. rad/s

## TYPE_GYROSCOPE_UNCALIBRATED

SensorEvent.values[0] x축을 중심으로 한 회전 속도(드리프트 보상 없음). rad/s
SensorEvent.values[1] y축을 중심으로 한 회전 속도(드리프트 보상 없음). rad/s
SensorEvent.values[2] z축을 중심으로 한 회전 속도(드리프트 보상 없음). rad/s
SensorEvent.values[3] x축을 중심으로 추정한 드리프트. rad/s
SensorEvent.values[4] y축을 중심으로 추정한 드리프트. rad/s
SensorEvent.values[5] z축을 중심으로 추정한 드리프트. rad/s

## TYPE_LINEAR_ACCELERATION

SensorEvent.values[0] x축의 가속력(중력 제외). m/s2
SensorEvent.values[1] y축의 가속력(중력 제외). m/s2
SensorEvent.values[2] z축의 가속력(중력 제외). m/s2

## TYPE_ROTATION_VECTOR

SensorEvent.values[0] x축의 회전 벡터 구성요소(x _ sin(θ/2)). 단위 없음
SensorEvent.values[1] y축의 회전 벡터 구성요소(y _ sin(θ/2)). 단위 없음
SensorEvent.values[2] z축의 회전 벡터 구성요소(z \* sin(θ/2)). 단위 없음
SensorEvent.values[3] 회전 벡터의 스칼라 구성요소((cos(θ/2)). 옵셔널.단위 없음

## TYPE_STEP_COUNTER

SensorEvent.values[0] 센서가 활성화되어 있는 동안 마지막 재부팅 이후로 사용자가 걸은 걸음 수. 단위 보

### TYPE_SIGNIFICANT_MOTION

(중요하거나 위험할 수 있는 활동 감지) 해당 없음

### TYPE_STEP_DETECTOR

해당 없음
