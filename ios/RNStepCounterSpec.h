#ifndef __cplusplus
#error This file must be compiled as Obj-C++. If you are importing it, you must change your file extension to .mm.
#endif
#import <Foundation/Foundation.h>
#import <RCTRequired/RCTRequired.h>
#import <RCTTypeSafety/RCTConvertHelpers.h>
#import <RCTTypeSafety/RCTTypedModuleConstants.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTCxxConvert.h>
#import <React/RCTManagedPointer.h>
#import <ReactCommon/RCTTurboModule.h>
#import <optional>
#import <vector>


@protocol NativeStepCounterSpec <RCTBridgeModule, RCTTurboModule>

- (NSNumber *)isStepCountingSupported;
- (NSNumber *)startStepCounterUpdate:(double)from;
- (void)stopStepCounterUpdate;
- (void)addListener:(NSString *)eventName;
- (void)removeListeners:(double)count;

@end
namespace facebook {
  namespace react {
    /**
     * ObjC++ class for module 'NativeStepCounter'
     */
    class JSI_EXPORT NativeStepCounterSpecJSI : public ObjCTurboModule {
    public:
      NativeStepCounterSpecJSI(const ObjCTurboModule::InitParams &params);
    };
  } // namespace react
} // namespace facebook

