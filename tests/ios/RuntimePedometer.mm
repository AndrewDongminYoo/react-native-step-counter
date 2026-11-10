// Test-only Core Motion replay for a disposable bridgeless consumer app.
// Never compile this file into the library or the normal example target.
#import <CoreMotion/CoreMotion.h>
#import <objc/runtime.h>

@interface SCReplayData : NSObject
@property(nonatomic, strong) NSDate *startDate;
@property(nonatomic, strong) NSDate *endDate;
@property(nonatomic, strong) NSNumber *numberOfSteps;
@property(nonatomic, strong) NSNumber *distance;
@property(nonatomic, strong) NSNumber *floorsAscended;
@property(nonatomic, strong) NSNumber *floorsDescended;
@end
@implementation SCReplayData
@end

static CMPedometerData *SCSample(NSDate *start, NSInteger steps, double elapsed) {
  SCReplayData *data = [SCReplayData new];
  data.startDate = start;
  data.endDate = [NSDate dateWithTimeIntervalSinceNow:elapsed];
  data.numberOfSteps = @(steps);
  data.distance = @(steps * 0.6);
  data.floorsAscended = @(steps / 5);
  data.floorsDescended = @0;
  return (CMPedometerData *)data;
}

@interface CMPedometer (SCRuntimeReplay)
@end
@implementation CMPedometer (SCRuntimeReplay)
+ (void)load {
  method_exchangeImplementations(class_getClassMethod(self, @selector(isStepCountingAvailable)), class_getClassMethod(self, @selector(sc_available)));
  method_exchangeImplementations(class_getClassMethod(self, @selector(authorizationStatus)), class_getClassMethod(self, @selector(sc_authorization)));
  method_exchangeImplementations(class_getInstanceMethod(self, @selector(queryPedometerDataFromDate:toDate:withHandler:)), class_getInstanceMethod(self, @selector(sc_queryFrom:to:handler:)));
  method_exchangeImplementations(class_getInstanceMethod(self, @selector(startPedometerUpdatesFromDate:withHandler:)), class_getInstanceMethod(self, @selector(sc_startFrom:handler:)));
  method_exchangeImplementations(class_getInstanceMethod(self, @selector(stopPedometerUpdates)), class_getInstanceMethod(self, @selector(sc_stop)));
}
+ (BOOL)sc_available { return YES; }
+ (CMAuthorizationStatus)sc_authorization { return CMAuthorizationStatusAuthorized; }
- (void)sc_queryFrom:(NSDate *)start to:(NSDate *)end handler:(CMPedometerHandler)handler {
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{ handler(SCSample(start, 10, 0), nil); });
}
- (void)sc_startFrom:(NSDate *)start handler:(CMPedometerHandler)handler {
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 200 * NSEC_PER_MSEC), dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{ handler(SCSample(start, 15, 2), nil); });
  // Deliberately deliver late even after stop: real module ownership must reject it.
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 700 * NSEC_PER_MSEC), dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{ handler(SCSample(start, 20, 3), nil); });
}
- (void)sc_stop {}
@end
