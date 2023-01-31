
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNStepCounterSpec.h"

@interface StepCounter : NSObject <NativeStepCounterSpec>
#else
#import <React/RCTBridgeModule.h>

@interface StepCounter : NSObject <RCTBridgeModule>
#endif

@end
