#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(StepCounter, RCTEventEmitter)

RCT_EXTERN_METHOD(isStepCountingSupported:
                 (RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startStepCounterUpdate)

RCT_EXTERN_METHOD(stopStepCounterUpdate)

@end
