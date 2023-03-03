
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNStepCounterSpec.h"

@interface RNStepCounter : NSObject <NativeStepCounterSpec>

#else
#import <React/RCTEventEmitter.h>
#import <CoreMotion/CMPedometer.h>

@interface RNStepCounter : RCTEventEmitter<RCTBridgeModule>
@property (nonatomic, readwrite) CMPedometer *pedometer;
#endif

- (void)isStepCountingSupported:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject;
- (void)startStepCounterUpdate:(double)from;
- (void)stopStepCounterUpdate;

@end
