#import <CoreMotion/CoreMotion.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import "StepCounter.h"
#import "SOMotionDetecter.h"

@interface StepCounter ()
@property (nonatomic, readonly) CMPedometer *pedometer;
@property (nonatomic) NSDate *sessionStartDate;
@property (nonatomic) NSInteger lastCumulativeSteps;
@end

@implementation StepCounter
+ (BOOL)requiresMainQueueSetup {
    return YES;
}

@synthesize bridge = _bridge;
@synthesize callableJSModules = _callableJSModules;

RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"StepCounter.stepCounterUpdate",
        @"StepCounter.stepDetected",
        @"StepCounter.errorOccurred",
        @"StepCounter.stepsSensorInfo"
    ];
}

#ifdef RCT_NEW_ARCH_ENABLED
// In New Architecture, RCTEventEmitter.receiveEvent is not a registered callable JS module.
// In bridgeless mode (RCTHost), _bridge is nil; events must go through callableJSModules.
// In bridge-based New Architecture, fall back to _bridge.enqueueJSCall via RCTDeviceEventEmitter.
- (void)sendEventWithName:(NSString *)eventName body:(id)body {
    NSArray *args = body ? @[eventName, body] : @[eventName];
    if (_callableJSModules) {
        [_callableJSModules invokeModule:@"RCTDeviceEventEmitter"
                                  method:@"emit"
                                withArgs:args];
    } else if (_bridge) {
        [_bridge enqueueJSCall:@"RCTDeviceEventEmitter"
                        method:@"emit"
                          args:args
                    completion:nil];
    }
}
#endif // RCT_NEW_ARCH_ENABLED

RCT_EXPORT_METHOD(isStepCountingSupported:(RCTPromiseResolveBlock)resolve
                                   reject:(RCTPromiseRejectBlock)reject) {

    resolve(@{
        @"granted": @(self.authorizationStatus),
        @"supported": @([CMPedometer isStepCountingAvailable]),
    });
    [self sendEventWithName:@"StepCounter.stepsSensorInfo"
                       body:[self dictionaryAboutSensorInfo]];
}

RCT_EXPORT_METHOD(queryStepCounterDataBetweenDates:(NSDate *)startDate
                  endDate:(NSDate *)endDate
                  handler:(RCTResponseSenderBlock)handler) {
    [self.pedometer queryPedometerDataFromDate:startDate
                                        toDate:endDate
                                   withHandler:^(CMPedometerData *pedometerData, NSError *error) {
        handler(@[error.description?:[NSNull null],
                  [self dictionaryFromPedometerData:pedometerData]]);
    }];
}

RCT_EXPORT_METHOD(startStepCounterUpdate:(double)from) {
    // Stop any in-progress pedometer session before starting a new one.
    // Without this, repeated calls accumulate CMPedometer handlers that each
    // fire events from their respective session start dates, causing the step
    // count to oscillate between old-session cumulative totals and new-session counts.
    [self.pedometer stopPedometerUpdates];

    // JS passes Date.getTime() / 1000 (seconds since epoch); convert to NSDate.
    _sessionStartDate = from > 0 ? [NSDate dateWithTimeIntervalSince1970:from] : [NSDate date];
    _lastCumulativeSteps = 0;

    [self.pedometer startPedometerUpdatesFromDate:_sessionStartDate
                                      withHandler:^(CMPedometerData *pedometerData, NSError *error) {
        if (error) {
            [self sendEventWithName:@"StepCounter.errorOccurred"
                               body:error];
        } else if (pedometerData) {
            NSInteger incomingSteps = [pedometerData.numberOfSteps integerValue];
            // CMPedometer delivers two update types:
            //   1. Cumulative update: startDate ≈ sessionStartDate, numberOfSteps = total since session start
            //   2. Activity-window update: startDate = new walk segment start, numberOfSteps = that segment only
            // Without correction, type-2 updates cause the step count to jump backwards.
            NSTimeInterval startDiff = fabs([pedometerData.startDate timeIntervalSinceDate:self->_sessionStartDate]);
            NSInteger reportedSteps;
            if (startDiff < 2.0) {
                // Cumulative update — authoritative total; update baseline
                self->_lastCumulativeSteps = incomingSteps;
                reportedSteps = incomingSteps;
            } else {
                // Activity-window update — add new segment steps to the last known cumulative total
                reportedSteps = self->_lastCumulativeSteps + incomingSteps;
            }

            NSMutableDictionary *body = [[self dictionaryFromPedometerData:pedometerData] mutableCopy];
            body[@"steps"] = @(reportedSteps);
            [self sendEventWithName:@"StepCounter.stepCounterUpdate"
                               body:[body copy]];
        }
    }];
}

- (NSDictionary *)dictionaryAboutSensorInfo {
    return @{
        @"name": @"CMPedometer",
        @"granted": @(self.authorizationStatus),
        @"stepCounting": @([CMPedometer isStepCountingAvailable]),
        @"pace": @([CMPedometer isPaceAvailable]),
        @"cadence": @([CMPedometer isCadenceAvailable]),
        @"distance": @([CMPedometer isDistanceAvailable]),
        @"floorCounting": @([CMPedometer isFloorCountingAvailable]),
    };
}

- (NSDictionary *)dictionaryFromPedometerData:(CMPedometerData *)data {
    NSNumber *startDate = @((long long)(data.startDate.timeIntervalSince1970 * 1000.0));
    NSNumber *endDate = @((long long)(data.endDate.timeIntervalSince1970 * 1000.0));
    return @{
        @"counterType": @"CMPedometer",
        @"startDate": startDate?:[NSNull null],
        @"endDate": endDate?:[NSNull null],
        @"steps": data.numberOfSteps?:[NSNull null],
        @"distance": data.distance?:[NSNull null],
        @"floorsAscended": data.floorsAscended?:[NSNull null],
        @"floorsDescended": data.floorsDescended?:[NSNull null],
    };
}

RCT_EXPORT_METHOD(stopStepCounterUpdate) {
    [self.pedometer stopPedometerUpdates];
    [[SOMotionDetecter sharedInstance] stopDetection];
    _sessionStartDate = nil;
    _lastCumulativeSteps = 0;
}

RCT_EXPORT_METHOD(startStepsDetection) {
    [[SOMotionDetecter sharedInstance]
      startDetectionWithUpdateBlock:^(NSError *error) {
        if(error) {
            [self sendEventWithName:@"StepCounter.errorOccurred"
                               body:error];
        } else {
            [self sendEventWithName:@"StepCounter.stepDetected"
                               body:@true];
        }
    }];
}

- (BOOL)authorizationStatus {
#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 110000
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wpartial-availability"
    CMAuthorizationStatus status = [CMPedometer authorizationStatus];
    return status == CMAuthorizationStatusAuthorized;
#pragma clang diagnostic pop
#endif // __IPHONE_OS_VERSION_MAX_ALLOWED >= 110000
}

#pragma mark - Private

- (instancetype)init {
    self = [super init];
    if (self == nil) {
        return nil;
    }
    _pedometer = [[CMPedometer alloc]init];
    return self;
}

// Don't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
(const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeStepCounterSpecJSI>(params);
}
#endif // RCT_NEW_ARCH_ENABLED

@end
