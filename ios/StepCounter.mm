#import <CoreMotion/CoreMotion.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import "StepCounter.h"
#import "SOMotionDetecter.h"

@interface StepCounter ()
@property (nonatomic, readonly) CMPedometer *pedometer;

// Session control
@property (nonatomic, strong) NSDate *sessionStartDate;

// Baseline + monotonic
@property (nonatomic) NSInteger baselineSteps;      // steps recorded at session start
@property (nonatomic) NSInteger lastEmittedSteps;   // last emitted delta (monotonic)
@property (nonatomic) BOOL baselineReady;
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

#pragma mark - Public API

RCT_EXPORT_METHOD(isStepCountingSupported:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  resolve(@{
    @"granted": @([self authorizationStatus]),
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
    handler(@[
      error.description ?: [NSNull null],
      [self dictionaryFromPedometerData:pedometerData]
    ]);
  }];
}

RCT_EXPORT_METHOD(startStepCounterUpdate:(double)from) {
  // Stop any in-progress pedometer session before starting a new one.
  [self.pedometer stopPedometerUpdates];

  // --- Timestamp guard (ms vs seconds) ---
  // Valid Unix timestamp in seconds is ~1.7–2.0e9 (2024–2033),
  // while milliseconds is ~1.7–2.0e12.
  double fromSeconds = (from > 1e12) ? (from / 1000.0) : from;

  // Extra sanity: if caller accidentally passes ms-but-small (unlikely) or future timestamps,
  // clamp to "now" to avoid "future date" sessions.
  NSDate *now = [NSDate date];
  NSDate *requested = (fromSeconds > 0) ? [NSDate dateWithTimeIntervalSince1970:fromSeconds] : now;
  if ([requested timeIntervalSinceDate:now] > 60.0) { // > 60s into the future
    requested = now;
  }
  _sessionStartDate = requested;

  // Reset session state.
  _baselineSteps = 0;
  _lastEmittedSteps = 0;
  _baselineReady = NO;

  // 1) Establish baseline at session start (start -> now).
  // This makes "reset/restart" deterministic: emitted steps are delta since sessionStartDate.
  [self.pedometer queryPedometerDataFromDate:_sessionStartDate
                                      toDate:now
                                 withHandler:^(CMPedometerData *data, NSError *error) {
    if (error) {
      [self sendEventWithName:@"StepCounter.errorOccurred" body:error];
      return;
    }
    self->_baselineSteps = data.numberOfSteps.integerValue;
    self->_baselineReady = YES;
  }];

  // 2) Live updates from sessionStartDate.
  [self.pedometer startPedometerUpdatesFromDate:_sessionStartDate
                                    withHandler:^(CMPedometerData *data, NSError *error) {
    if (error) {
      [self sendEventWithName:@"StepCounter.errorOccurred" body:error];
      return;
    }
    if (!data) return;

    // If baseline hasn't been computed yet, drop updates (keep logic simple + deterministic).
    if (!self->_baselineReady) return;

    // Filter: accept only updates whose startDate matches the session start.
    // iOS can interleave "segment/window" updates with different startDate values.
    NSTimeInterval startDiff = fabs([data.startDate timeIntervalSinceDate:self->_sessionStartDate]);
    if (startDiff > 1.0) {
      return;
    }

    NSInteger cumulative = data.numberOfSteps.integerValue;

    // Convert cumulative -> delta since session start.
    NSInteger delta = cumulative - self->_baselineSteps;

    // If OS performs corrections or timestamps shift, delta can go negative.
    // Clamp + rebase to keep future deltas sane.
    if (delta < 0) {
      delta = 0;
      self->_baselineSteps = cumulative;
    }

    // Monotonic guard: never emit backwards.
    if (delta <= self->_lastEmittedSteps) return;
    self->_lastEmittedSteps = delta;

    NSMutableDictionary *body = [[self dictionaryFromPedometerData:data] mutableCopy];
    body[@"steps"] = @(delta);
    body[@"counterType"] = @"CMPedometer";

    [self sendEventWithName:@"StepCounter.stepCounterUpdate" body:[body copy]];
  }];
}

RCT_EXPORT_METHOD(stopStepCounterUpdate) {
  [self.pedometer stopPedometerUpdates];
  [[SOMotionDetecter sharedInstance] stopDetection];

  _sessionStartDate = nil;
  _baselineSteps = 0;
  _lastEmittedSteps = 0;
  _baselineReady = NO;
}

RCT_EXPORT_METHOD(startStepsDetection) {
  [[SOMotionDetecter sharedInstance]
   startDetectionWithUpdateBlock:^(NSError *error) {
    if (error) {
      [self sendEventWithName:@"StepCounter.errorOccurred" body:error];
    } else {
      [self sendEventWithName:@"StepCounter.stepDetected" body:@true];
    }
  }];
}

#pragma mark - Sensor info / mapping

- (NSDictionary *)dictionaryAboutSensorInfo {
  return @{
    @"name": @"CMPedometer",
    @"granted": @([self authorizationStatus]),
    @"stepCounting": @([CMPedometer isStepCountingAvailable]),
    @"pace": @([CMPedometer isPaceAvailable]),
    @"cadence": @([CMPedometer isCadenceAvailable]),
    @"distance": @([CMPedometer isDistanceAvailable]),
    @"floorCounting": @([CMPedometer isFloorCountingAvailable]),
  };
}

- (NSDictionary *)dictionaryFromPedometerData:(CMPedometerData *)data {
  if (!data) {
    return @{
      @"counterType": @"CMPedometer",
      @"startDate": [NSNull null],
      @"endDate": [NSNull null],
      @"steps": [NSNull null],
      @"distance": [NSNull null],
      @"floorsAscended": [NSNull null],
      @"floorsDescended": [NSNull null],
    };
  }

  NSNumber *startDate = @((long long)(data.startDate.timeIntervalSince1970 * 1000.0));
  NSNumber *endDate = @((long long)(data.endDate.timeIntervalSince1970 * 1000.0));

  return @{
    @"counterType": @"CMPedometer",
    @"startDate": startDate ?: [NSNull null],
    @"endDate": endDate ?: [NSNull null],
    @"steps": data.numberOfSteps ?: [NSNull null],
    @"distance": data.distance ?: [NSNull null],
    @"floorsAscended": data.floorsAscended ?: [NSNull null],
    @"floorsDescended": data.floorsDescended ?: [NSNull null],
  };
}

- (BOOL)authorizationStatus {
#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 110000
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wpartial-availability"
  CMAuthorizationStatus status = [CMPedometer authorizationStatus];
  return status == CMAuthorizationStatusAuthorized;
#pragma clang diagnostic pop
#else
  return NO;
#endif
}

#pragma mark - Init

- (instancetype)init {
  self = [super init];
  if (!self) return nil;

  _pedometer = [[CMPedometer alloc] init];
  _baselineSteps = 0;
  _lastEmittedSteps = 0;
  _baselineReady = NO;

  return self;
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeStepCounterSpecJSI>(params);
}
#endif // RCT_NEW_ARCH_ENABLED

@end
