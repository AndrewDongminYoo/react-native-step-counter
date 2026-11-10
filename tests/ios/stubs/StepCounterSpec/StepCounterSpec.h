#import <Foundation/Foundation.h>
#import <React/RCTEventEmitter.h>
#include <functional>
#include <string>
namespace facebook::react {
using EventEmitterCallback = std::function<void(const std::string &, id)>;
}
@interface EventEmitterCallbackWrapper : NSObject {
@public
  facebook::react::EventEmitterCallback _eventEmitterCallback;
}
@end
@protocol NativeStepCounterSpec <NSObject>
@end
@interface NativeStepCounterSpecBase : NSObject {
@protected
  facebook::react::EventEmitterCallback _eventEmitterCallback;
}
- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *)wrapper;
- (void)emitOnStepCounterUpdate:(NSDictionary *)value;
- (void)emitOnStepDetected:(BOOL)value;
- (void)emitOnErrorOccurred:(NSDictionary *)value;
- (void)emitOnStepsSensorInfo:(NSDictionary *)value;
@end
