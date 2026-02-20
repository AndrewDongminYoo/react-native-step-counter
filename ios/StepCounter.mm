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
    // Guard: if the caller accidentally passes milliseconds (value > 1e12), divide once more.
    // A valid Unix timestamp in seconds is ~1.7–1.9 billion (2024–2030);
    // a millisecond timestamp is ~1.7–1.9 trillion.
    double fromSeconds = from > 1e12 ? from / 1000.0 : from;
    _sessionStartDate = fromSeconds > 0 ? [NSDate dateWithTimeIntervalSince1970:fromSeconds] : [NSDate date];
    _lastCumulativeSteps = 0;

    [self.pedometer startPedometerUpdatesFromDate:_sessionStartDate
                                      withHandler:^(CMPedometerData *pedometerData, NSError *error) {
        if (error) {
            [self sendEventWithName:@"StepCounter.errorOccurred"
                               body:error];
        } else if (pedometerData) {
            NSInteger incomingSteps = [pedometerData.numberOfSteps integerValue];

            // ── Filter 1: catch-up guard ──────────────────────────────────────────
            // CMPedometer may deliver a retrospective "catch-up" update when the
            // device was already mid-walk when startPedometerUpdatesFromDate: was
            // called.  That update's startDate reflects the walking session's ACTUAL
            // start (possibly hours ago), not the date we requested.  Its step count
            // represents the entire session up to now (~150), producing a sudden jump
            // after a few real-time increments (1, 2, 3 → 150).
            // Discard any update whose startDate is more than 5 seconds BEFORE our
            // requested session start; regular live updates always have
            // startDate ≈ _sessionStartDate.
            NSTimeInterval startDiff =
                [pedometerData.startDate timeIntervalSinceDate:self->_sessionStartDate];
            if (startDiff < -5.0) {
                return; // Historical catch-up — discard to keep count from session start.
            }

            // ── Filter 2: monotonic guard ─────────────────────────────────────────
            // CMPedometer also interleaves activity-window updates (startDate = recent
            // walk segment, numberOfSteps = just that segment) with cumulative updates
            // (startDate ≈ session start, numberOfSteps = total since session start).
            // Activity-window counts are smaller and would cause backward jumps.
            // Only emit when the step count strictly increases.
            if (incomingSteps <= self->_lastCumulativeSteps) {
                return; // Not a new high — drop to prevent backward jumps.
            }
            self->_lastCumulativeSteps = incomingSteps;

            NSMutableDictionary *body = [[self dictionaryFromPedometerData:pedometerData] mutableCopy];
            body[@"steps"] = @(self->_lastCumulativeSteps);
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
