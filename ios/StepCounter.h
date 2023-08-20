#ifdef RCT_NEW_ARCH_ENABLED
#import "RNStepCounterSpec.h"

@interface StepCounter : NSObject <NativeStepCounterSpec>
#else
#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import "SOMotionDetecter.h"

@interface StepCounter : RCTEventEmitter<RCTBridgeModule>
#endif

@end
