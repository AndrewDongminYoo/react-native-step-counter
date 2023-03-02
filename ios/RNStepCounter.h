
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNStepCounterSpec.h"

@interface RNStepCounter : NSObject <NativeStepCounterSpec>

#else
#if __has_include("RCTBridgeModule.h")
#import "RCTBridgeModule.h"
#else
#import <React/RCTBridgeModule.h>
#endif

@interface RNStepCounter : NSObject <RCTBridgeModule>
#endif

- (void)isStepCountingSupported:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject;
- (NSNumber *)startStepCounterUpdate:(double)from;
- (void)stopStepCounterUpdate;
- (void)addListener:(NSString *)eventName;
- (void)removeListeners:(double)count;

@end
