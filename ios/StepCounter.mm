#import <CoreMotion/CoreMotion.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import "StepCounter.h"
#import "StepCounterPayload.h"
#import "SOMotionDetecter.h"

@interface StepCounter ()
@property (nonatomic, readonly) CMPedometer *pedometer;
@property (nonatomic, strong) dispatch_queue_t stateQueue;

// Session control
@property (nonatomic, strong) NSDate *sessionStartDate;
@property (nonatomic, strong) NSObject *sessionGeneration;
@property (nonatomic) BOOL invalidated;

// Baseline + monotonic
@property (nonatomic, strong) CMPedometerData *baselineData;
@property (nonatomic, strong) NSDate *sessionCutoff;
@property (nonatomic, strong) NSDate *lastEmittedEndDate;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSNumber *> *lastEmittedMetrics;
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
  __weak StepCounter *weakSelf = self;
  dispatch_sync(_stateQueue, ^{
    if (self->_invalidated) return;
    [self.pedometer queryPedometerDataFromDate:startDate
                                      toDate:endDate
                                 withHandler:^(CMPedometerData *data, NSError *error) {
      StepCounter *strongSelf = weakSelf;
      if (!strongSelf) return;
      dispatch_sync(strongSelf->_stateQueue, ^{
        if (strongSelf->_invalidated) return;
        handler(@[error.description ?: [NSNull null],
                  [strongSelf dictionaryFromPedometerData:data]]);
      });
    }];
  });
}

RCT_EXPORT_METHOD(startStepCounterUpdate:(double)from) {
  // --- Timestamp guard (ms vs seconds) ---
  // Valid Unix timestamp in seconds is ~1.7–2.0e9 (2024–2033),
  // while milliseconds is ~1.7–2.0e12.
  double fromSeconds = (from > 1e12) ? (from / 1000.0) : from;

  // Clamp future origins to the query cutoff so its interval cannot be inverted.
  NSDate *now = [NSDate date];
  NSDate *requested = (fromSeconds > 0) ? [NSDate dateWithTimeIntervalSince1970:fromSeconds] : now;
  if ([requested compare:now] == NSOrderedDescending) {
    requested = now;
  }
  // Lifecycle, state mutation and event enqueueing share one serialization boundary.
  // A fresh object identifies a session even when callers reuse the same date.
  NSObject *generation = [NSObject new];
  NSDate *sessionStart = [requested copy];
  __weak StepCounter *weakSelf = self;
  dispatch_sync(_stateQueue, ^{
    if (self->_invalidated) return;
    [self resetSession];
    self->_sessionGeneration = generation;
    [self.pedometer stopPedometerUpdates];
    self->_sessionStartDate = sessionStart;
    self->_sessionCutoff = now;
    self->_lastEmittedMetrics = [NSMutableDictionary new];

    [self.pedometer queryPedometerDataFromDate:sessionStart
                                      toDate:now
                                 withHandler:^(CMPedometerData *data, NSError *error) {
      StepCounter *strongSelf = weakSelf;
      if (!strongSelf) return;
      dispatch_sync(strongSelf->_stateQueue, ^{
        if (strongSelf->_sessionGeneration != generation) return;
        strongSelf->_baselineData = error ? nil : data;
        strongSelf->_baselineReady = YES;
        if (error) {
          [strongSelf sendEventWithName:@"StepCounter.errorOccurred" body:error];
        }
      });
    }];

    [self.pedometer startPedometerUpdatesFromDate:sessionStart
                                    withHandler:^(CMPedometerData *data, NSError *error) {
      StepCounter *strongSelf = weakSelf;
      if (!strongSelf) return;
      dispatch_sync(strongSelf->_stateQueue, ^{
        if (strongSelf->_sessionGeneration != generation) return;
        if (error) {
          [strongSelf sendEventWithName:@"StepCounter.errorOccurred" body:error];
          return;
        }
        if (!data || !data.startDate || !data.endDate || !data.numberOfSteps ||
            !strongSelf->_baselineReady) return;

        // Date matching filters OS windows; generation establishes ownership.
        NSTimeInterval startDiff = fabs([data.startDate timeIntervalSinceDate:sessionStart]);
        if (startDiff > 1.0 || [data.endDate compare:strongSelf->_sessionCutoff] == NSOrderedAscending) return;
        if (!strongSelf->_baselineData) {
          // A failed/empty query cannot safely imply a zero historical baseline.
          // Seed every metric together and discard this first cumulative sample.
          strongSelf->_baselineData = data;
          strongSelf->_sessionCutoff = data.endDate;
          return;
        }
        if ([data.endDate compare:strongSelf->_sessionCutoff] != NSOrderedDescending ||
            (strongSelf->_lastEmittedEndDate &&
             [data.endDate compare:strongSelf->_lastEmittedEndDate] != NSOrderedDescending)) return;
        NSInteger delta = data.numberOfSteps.integerValue - strongSelf->_baselineData.numberOfSteps.integerValue;
        // Never lower the baseline on a correction: recovery must not add history.
        if (delta <= strongSelf->_lastEmittedSteps) return;
        NSDictionary *baseline = [strongSelf dictionaryFromPedometerData:strongSelf->_baselineData];
        NSMutableDictionary *body = [StepCounterPayload(strongSelf->_sessionCutoff, data.endDate, @(delta),
                                                        data.distance, data.floorsAscended, data.floorsDescended) mutableCopy];
        for (NSString *key in @[@"distance", @"floorsAscended", @"floorsDescended"]) {
          NSNumber *current = body[key], *initial = baseline[key];
          if ((id)current == [NSNull null] || (id)initial == [NSNull null]) {
            body[key] = [NSNull null];
            continue;
          }
          double metricDelta = current.doubleValue - initial.doubleValue;
          if (!isfinite(metricDelta) || metricDelta < 0 ||
              metricDelta < strongSelf->_lastEmittedMetrics[key].doubleValue) return;
          body[key] = @(metricDelta);
        }
        // Commit state only after the complete window passes validation.
        strongSelf->_lastEmittedSteps = delta;
        strongSelf->_lastEmittedEndDate = data.endDate;
        for (NSString *key in @[@"distance", @"floorsAscended", @"floorsDescended"]) {
          if (body[key] != [NSNull null]) strongSelf->_lastEmittedMetrics[key] = body[key];
        }
        [strongSelf sendEventWithName:@"StepCounter.stepCounterUpdate" body:body];
      });
    }];
  });
}

// Must run on stateQueue, before asking producers to stop.
- (void)resetSession {
  _sessionGeneration = nil;
  _sessionStartDate = nil;
  _baselineData = nil;
  _sessionCutoff = nil;
  _lastEmittedEndDate = nil;
  _lastEmittedMetrics = nil;
  _lastEmittedSteps = 0;
  _baselineReady = NO;
}

RCT_EXPORT_METHOD(stopStepCounterUpdate) {
  dispatch_sync(_stateQueue, ^{
    [self resetSession];
    [self.pedometer stopPedometerUpdates];
    [[SOMotionDetecter sharedInstance] stopDetection];
  });
}

- (void)invalidate {
  dispatch_sync(_stateQueue, ^{
    self->_invalidated = YES;
    [self resetSession];
    [self.pedometer stopPedometerUpdates];
    [[SOMotionDetecter sharedInstance] stopDetection];
  });
  [super invalidate];
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
  return StepCounterPayload(data.startDate, data.endDate, data.numberOfSteps, data.distance,
                            data.floorsAscended, data.floorsDescended);
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
  _stateQueue = dispatch_queue_create("com.dongminyu.stepcounter.state", DISPATCH_QUEUE_SERIAL);
  _baselineData = nil;
  _sessionCutoff = nil;
  _lastEmittedEndDate = nil;
  _lastEmittedMetrics = nil;
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
