
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNStepCounterSpec.h"

@interface RNStepCounter : NSObject <NativeStepCounterSpec>

#else
#if __has_include("RCTEventEmitter.h")
#import "RCTEventEmitter.h"
#else
#import <React/RCTEventEmitter.h>
#endif

@interface RNStepCounter : RCTEventEmitter

#endif

- (void)isStepCountingSupported:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject;
- (NSNumber *)startStepCounterUpdate:(double)from;
- (void)stopStepCounterUpdate;
- (void)addListener:(NSString *)eventName;
- (void)removeListeners:(double)count;

@end
