#import <XCTest/XCTest.h>
#import <CoreMotion/CoreMotion.h>
#import "../../ios/StepCounter.h"

// Only external hardware, bridge transport and motion helper are replaced.
@implementation CMPedometerData
@end
@implementation CMPedometer
+ (BOOL)isStepCountingAvailable { return YES; }
+ (BOOL)isPaceAvailable { return YES; }
+ (BOOL)isCadenceAvailable { return YES; }
+ (BOOL)isDistanceAvailable { return YES; }
+ (BOOL)isFloorCountingAvailable { return YES; }
+ (CMAuthorizationStatus)authorizationStatus { return CMAuthorizationStatusAuthorized; }
- (void)queryPedometerDataFromDate:(NSDate *)start toDate:(NSDate *)end withHandler:(CMPedometerHandler)handler {}
- (void)startPedometerUpdatesFromDate:(NSDate *)start withHandler:(CMPedometerHandler)handler {}
- (void)stopPedometerUpdates {}
@end
@implementation RCTEventEmitter
- (void)sendEventWithName:(NSString *)name body:(id)body {}
- (void)invalidate {}
@end
@implementation SOMotionDetecter
+ (instancetype)sharedInstance { static SOMotionDetecter *instance; if (!instance) instance = [self new]; return instance; }
- (void)startDetectionWithUpdateBlock:(void (^)(NSError *))callback {}
- (void)stopDetection {}
@end

@interface StepCounter (Testing)
- (void)startStepCounterUpdate:(double)from;
- (void)stopStepCounterUpdate;
- (void)queryStepCounterDataBetweenDates:(NSDate *)start endDate:(NSDate *)end handler:(RCTResponseSenderBlock)handler;
@end

@interface ScheduledPedometer : CMPedometer
@property(nonatomic, strong) NSMutableArray<CMPedometerHandler> *queries;
@property(nonatomic, strong) NSMutableArray<CMPedometerHandler> *updates;
@property(nonatomic, strong) NSMutableArray<NSDate *> *queryStarts;
@property(nonatomic, strong) NSMutableArray<NSDate *> *queryEnds;
@property(nonatomic, copy) void (^onStop)(void);
@end
@implementation ScheduledPedometer
- (instancetype)init { if ((self = [super init])) { _queries = [NSMutableArray new]; _updates = [NSMutableArray new]; _queryStarts = [NSMutableArray new]; _queryEnds = [NSMutableArray new]; } return self; }
- (void)queryPedometerDataFromDate:(NSDate *)start toDate:(NSDate *)end withHandler:(CMPedometerHandler)handler { [self.queryStarts addObject:start]; [self.queryEnds addObject:end]; [self.queries addObject:[handler copy]]; }
- (void)startPedometerUpdatesFromDate:(NSDate *)start withHandler:(CMPedometerHandler)handler { [self.updates addObject:[handler copy]]; }
- (void)stopPedometerUpdates { if (self.onStop) self.onStop(); }
@end

@interface RecordingCounter : StepCounter
@property(nonatomic, strong) NSMutableArray *events;
@property(nonatomic, copy) void (^onEmit)(void);
@end
@implementation RecordingCounter
- (instancetype)init { if ((self = [super init])) _events = [NSMutableArray new]; return self; }
- (void)sendEventWithName:(NSString *)name body:(id)body { if (self.onEmit) self.onEmit(); [self.events addObject:@{@"name": name, @"body": body}]; }
@end

@interface StepCounterSessionTests : XCTestCase
@property(nonatomic, strong) ScheduledPedometer *sensor;
@property(nonatomic, strong) RecordingCounter *counter;
@property(nonatomic) NSTimeInterval sampleEnd;
@end
@implementation StepCounterSessionTests
- (void)setUp { self.sampleEnd = [NSDate date].timeIntervalSince1970 + 20; self.sensor = [ScheduledPedometer new]; self.counter = [RecordingCounter new]; [self.counter setValue:self.sensor forKey:@"pedometer"]; }
- (CMPedometerData *)data:(NSInteger)steps start:(double)start {
  CMPedometerData *data = [CMPedometerData new];
  data.startDate = [NSDate dateWithTimeIntervalSince1970:start]; self.sampleEnd += 1; data.endDate = [NSDate dateWithTimeIntervalSince1970:self.sampleEnd]; data.numberOfSteps = @(steps); return data;
}
- (NSError *)error { return [NSError errorWithDomain:@"test" code:1 userInfo:nil]; }
- (void)testRestartRejectsOldBaselineWithIdenticalDates {
  [self.counter startStepCounterUpdate:1000]; [self.counter startStepCounterUpdate:1000];
  self.sensor.queries[1]([self data:20 start:1000], nil);
  self.sensor.queries[0]([self data:900 start:1000], nil);
  self.sensor.updates[1]([self data:25 start:1000], nil);
  XCTAssertEqual(self.counter.events.count, 1u);
  XCTAssertEqualObjects(self.counter.events.lastObject[@"body"][@"steps"], @5);
}
- (void)testStopRejectsBaselineAndLiveSuccessAndErrors {
  [self.counter startStepCounterUpdate:1000]; [self.counter stopStepCounterUpdate];
  self.sensor.queries[0]([self data:10 start:1000], nil);
  self.sensor.queries[0](nil, self.error);
  self.sensor.updates[0]([self data:30 start:1000], nil);
  self.sensor.updates[0](nil, self.error);
  XCTAssertEqual(self.counter.events.count, 0u);
  XCTAssertFalse([[self.counter valueForKey:@"baselineReady"] boolValue]);
}
- (void)testRestartRejectsStaleLiveAndErrors {
  [self.counter startStepCounterUpdate:1000]; [self.counter startStepCounterUpdate:1000];
  self.sensor.queries[1]([self data:10 start:1000], nil);
  self.sensor.updates[0]([self data:100 start:1000], nil);
  self.sensor.queries[0](nil, self.error); self.sensor.updates[0](nil, self.error);
  self.sensor.updates[1]([self data:12 start:1000], nil);
  XCTAssertEqual(self.counter.events.count, 1u);
  if (self.counter.events.count == 1) {
    XCTAssertEqualObjects(self.counter.events.lastObject[@"body"][@"steps"], @2);
  }
}
- (void)testEarlyLiveAndCurrentErrorsPreserveBehavior {
  [self.counter startStepCounterUpdate:1000];
  self.sensor.updates[0]([self data:12 start:1000], nil);
  XCTAssertEqual(self.counter.events.count, 0u);
  self.sensor.queries[0](nil, self.error);
  self.sensor.updates[0]([self data:3 start:1000], nil);
  self.sensor.updates[0]([self data:5 start:1000], nil);
  self.sensor.updates[0]([self data:2 start:1000], nil);
  self.sensor.updates[0]([self data:99 start:2000], nil);
  self.sensor.updates[0](nil, self.error);
  XCTAssertEqual(self.counter.events.count, 3u);
  XCTAssertEqualObjects(self.counter.events[1][@"body"][@"steps"], @2);
}
- (void)testInvalidationRejectsAllCallbacksAndFutureStarts {
  [self.counter startStepCounterUpdate:1000];
  __block BOOL historicalCalled = NO;
  [self.counter queryStepCounterDataBetweenDates:[NSDate date] endDate:[NSDate date] handler:^(NSArray *args) { historicalCalled = YES; }];
  [self.counter invalidate];
  self.sensor.queries[0]([self data:10 start:1000], nil);
  self.sensor.queries[1]([self data:10 start:1000], nil);
  self.sensor.updates[0]([self data:30 start:1000], nil);
  self.sensor.updates[0](nil, self.error);
  [self.counter startStepCounterUpdate:1000];
  XCTAssertFalse(historicalCalled); XCTAssertEqual(self.counter.events.count, 0u); XCTAssertEqual(self.sensor.updates.count, 1u);
}
- (void)testHandlersDoNotRetainModule {
  __weak RecordingCounter *weakCounter = self.counter;
  self.counter = nil;
  @autoreleasepool {
    RecordingCounter *counter = [RecordingCounter new]; [counter setValue:self.sensor forKey:@"pedometer"];
    weakCounter = counter; [counter startStepCounterUpdate:1000];
  }
  XCTAssertNil(weakCounter);
}
- (void)testGenerationInvalidatesBeforeStoppingProducer {
  [self.counter startStepCounterUpdate:1000];
  NSObject *old = [self.counter valueForKey:@"sessionGeneration"];
  __weak RecordingCounter *counter = self.counter;
  self.sensor.onStop = ^{ XCTAssertNotEqual([counter valueForKey:@"sessionGeneration"], old); };
  [self.counter startStepCounterUpdate:1000];
  self.sensor.onStop = ^{ XCTAssertNil([counter valueForKey:@"sessionGeneration"]); };
  [self.counter stopStepCounterUpdate];
  self.sensor.onStop = nil;
  [self.counter startStepCounterUpdate:1000];
  self.sensor.onStop = ^{ XCTAssertNil([counter valueForKey:@"sessionGeneration"]); };
  [self.counter invalidate];
}
- (void)testOldBaselineCannotUnlockReplacementBeforeItsBaseline {
  [self.counter startStepCounterUpdate:1000]; [self.counter startStepCounterUpdate:2000];
  self.sensor.queries[0]([self data:10 start:1000], nil);
  self.sensor.updates[1]([self data:15 start:2000], nil);
  XCTAssertEqual(self.counter.events.count, 0u);
  XCTAssertFalse([[self.counter valueForKey:@"baselineReady"] boolValue]);
  self.sensor.queries[1]([self data:12 start:2000], nil);
  self.sensor.updates[1]([self data:15 start:2000], nil);
  XCTAssertEqualObjects(self.counter.events.lastObject[@"body"][@"steps"], @3);
}
- (void)testHistoricalQuerySurvivesLiveRestartAndStop {
  __block NSUInteger called = 0;
  [self.counter queryStepCounterDataBetweenDates:[NSDate date] endDate:[NSDate date] handler:^(NSArray *args) { called++; }];
  [self.counter startStepCounterUpdate:1000]; [self.counter stopStepCounterUpdate];
  self.sensor.queries[0]([self data:10 start:1000], nil);
  XCTAssertEqual(called, 1u);
}
- (void)testStopWaitsForInFlightEmission {
  [self.counter startStepCounterUpdate:1000]; self.sensor.queries[0]([self data:10 start:1000], nil);
  dispatch_semaphore_t emitting = dispatch_semaphore_create(0), releaseEmission = dispatch_semaphore_create(0), stopped = dispatch_semaphore_create(0), stopEntered = dispatch_semaphore_create(0);
  self.counter.onEmit = ^{ dispatch_semaphore_signal(emitting); dispatch_semaphore_wait(releaseEmission, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC)); };
  dispatch_async(dispatch_get_global_queue(0, 0), ^{ self.sensor.updates[0]([self data:15 start:1000], nil); });
  XCTAssertEqual(dispatch_semaphore_wait(emitting, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC)), 0L);
  dispatch_async(dispatch_get_global_queue(0, 0), ^{ dispatch_semaphore_signal(stopEntered); [self.counter stopStepCounterUpdate]; dispatch_semaphore_signal(stopped); });
  XCTAssertEqual(dispatch_semaphore_wait(stopEntered, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC)), 0L);
  long prematureStop = dispatch_semaphore_wait(stopped, dispatch_time(DISPATCH_TIME_NOW, 100 * NSEC_PER_MSEC));
  XCTAssertNotEqual(prematureStop, 0L);
  dispatch_semaphore_signal(releaseEmission);
  if (prematureStop != 0) {
    XCTAssertEqual(dispatch_semaphore_wait(stopped, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC)), 0L);
  }
  NSUInteger count = self.counter.events.count; self.sensor.updates[0]([self data:30 start:1000], nil);
  XCTAssertEqual(self.counter.events.count, count);
}

// Literals deliberately differ from the raw cumulative values: forwarding the
// original payload, assuming missing baselines are zero, or rebasing corrections
// must fail these assertions against the real module.
- (CMPedometerData *)sample:(NSInteger)steps distance:(NSNumber *)distance up:(NSNumber *)up down:(NSNumber *)down end:(NSDate *)end {
  CMPedometerData *data = [self data:steps start:self.sensor.queryStarts.lastObject.timeIntervalSince1970];
  data.endDate = end; data.distance = distance; data.floorsAscended = up; data.floorsDescended = down;
  return data;
}
- (NSNumber *)milliseconds:(NSDate *)date { return @((long long)(date.timeIntervalSince1970 * 1000)); }
- (void)testPastOriginSubtractsAllBaselinesAndUsesCutoffDates {
  [self.counter startStepCounterUpdate:1000];
  NSDate *cutoff = self.sensor.queryEnds[0], *end = [cutoff dateByAddingTimeInterval:10];
  self.sensor.queries[0]([self sample:100 distance:@80 up:@7 down:@4 end:cutoff], nil);
  self.sensor.updates[0]([self sample:110 distance:@87.5 up:@9 down:@5 end:end], nil);
  NSDictionary *body = self.counter.events.lastObject[@"body"];
  XCTAssertEqualObjects(body[@"steps"], @10); XCTAssertEqualObjects(body[@"distance"], @7.5);
  XCTAssertEqualObjects(body[@"floorsAscended"], @2); XCTAssertEqualObjects(body[@"floorsDescended"], @1);
  XCTAssertEqualObjects(body[@"startDate"], [self milliseconds:cutoff]); XCTAssertEqualObjects(body[@"endDate"], [self milliseconds:end]);
}
- (void)testCurrentAndFutureOriginsDoNotCreateInvertedIntervals {
  for (NSNumber *offset in @[@0, @30, @120]) {
    [self.counter.events removeAllObjects];
    [self.counter startStepCounterUpdate:[NSDate date].timeIntervalSince1970 + offset.doubleValue];
    NSDate *cutoff = self.sensor.queryEnds.lastObject;
    XCTAssertLessThanOrEqual([self.sensor.queryStarts.lastObject compare:cutoff], NSOrderedSame);
    self.sensor.queries.lastObject([self sample:0 distance:@0 up:@0 down:@0 end:cutoff], nil);
    self.sensor.updates.lastObject([self sample:4 distance:@3 up:@0 down:@1 end:[cutoff dateByAddingTimeInterval:5]], nil);
    NSDictionary *body = self.counter.events.lastObject[@"body"];
    XCTAssertEqualObjects(body[@"steps"], @4); XCTAssertEqualObjects(body[@"distance"], @3);
    XCTAssertEqualObjects(body[@"startDate"], [self milliseconds:cutoff]);
  }
}
- (void)testUnknownBaselinesStayNullWhenMetricsAppear {
  [self.counter startStepCounterUpdate:1000]; NSDate *cutoff = self.sensor.queryEnds[0];
  self.sensor.queries[0]([self sample:100 distance:nil up:nil down:nil end:cutoff], nil);
  self.sensor.updates[0]([self sample:105 distance:@90 up:@8 down:@4 end:[cutoff dateByAddingTimeInterval:5]], nil);
  NSDictionary *body = self.counter.events.lastObject[@"body"];
  XCTAssertEqualObjects(body[@"steps"], @5); XCTAssertEqualObjects(body[@"distance"], [NSNull null]);
  XCTAssertEqualObjects(body[@"floorsAscended"], [NSNull null]); XCTAssertEqualObjects(body[@"floorsDescended"], [NSNull null]);
}
- (void)testRestartClearsAllEmittedMetricAndDateHighwaters {
  [self.counter startStepCounterUpdate:1000]; NSDate *oldCutoff = self.sensor.queryEnds.lastObject;
  self.sensor.queries.lastObject([self sample:100 distance:@80 up:@7 down:@4 end:oldCutoff], nil);
  self.sensor.updates.lastObject([self sample:150 distance:@120 up:@20 down:@10 end:[oldCutoff dateByAddingTimeInterval:100]], nil);
  [self.counter stopStepCounterUpdate];
  [self.counter startStepCounterUpdate:1000]; NSDate *cutoff = self.sensor.queryEnds.lastObject;
  self.sensor.queries.lastObject([self sample:200 distance:@160 up:@14 down:@8 end:cutoff], nil);
  self.sensor.updates.lastObject([self sample:202 distance:@161 up:@15 down:@9 end:[cutoff dateByAddingTimeInterval:1]], nil);
  XCTAssertEqual(self.counter.events.count, 2u);
  NSDictionary *body = self.counter.events.lastObject[@"body"];
  XCTAssertEqualObjects(body[@"steps"], @2); XCTAssertEqualObjects(body[@"distance"], @1);
  XCTAssertEqualObjects(body[@"floorsAscended"], @1); XCTAssertEqualObjects(body[@"floorsDescended"], @1);
  XCTAssertEqualObjects(body[@"startDate"], [self milliseconds:cutoff]);
}
- (void)testMissingCurrentMetricsAreNullAndRecoveryUsesOriginalBaseline {
  [self.counter startStepCounterUpdate:1000]; NSDate *cutoff = self.sensor.queryEnds[0];
  self.sensor.queries[0]([self sample:100 distance:@80 up:@7 down:@4 end:cutoff], nil);
  self.sensor.updates[0]([self sample:105 distance:nil up:nil down:nil end:[cutoff dateByAddingTimeInterval:5]], nil);
  NSDictionary *missing = self.counter.events.lastObject[@"body"];
  XCTAssertEqualObjects(missing[@"distance"], [NSNull null]); XCTAssertEqualObjects(missing[@"floorsAscended"], [NSNull null]); XCTAssertEqualObjects(missing[@"floorsDescended"], [NSNull null]);
  self.sensor.updates[0]([self sample:110 distance:@88 up:@9 down:@5 end:[cutoff dateByAddingTimeInterval:10]], nil);
  NSDictionary *body = self.counter.events.lastObject[@"body"];
  XCTAssertEqualObjects(body[@"distance"], @8); XCTAssertEqualObjects(body[@"floorsAscended"], @2); XCTAssertEqualObjects(body[@"floorsDescended"], @1);
}
- (void)testFailedOrEmptyQuerySeedsFirstLiveSampleWithoutCatchUp {
  for (NSNumber *fails in @[@YES, @NO]) {
    [self.counter.events removeAllObjects]; [self.counter startStepCounterUpdate:1000];
    self.sensor.queries.lastObject(nil, fails.boolValue ? self.error : nil);
    NSDate *anchor = [self.sensor.queryEnds.lastObject dateByAddingTimeInterval:10];
    self.sensor.updates.lastObject([self sample:900 distance:@700 up:@30 down:@20 end:anchor], nil);
    XCTAssertEqual(self.counter.events.count, fails.boolValue ? 1u : 0u);
    self.sensor.updates.lastObject([self sample:904 distance:@703 up:@31 down:@22 end:[anchor dateByAddingTimeInterval:5]], nil);
    NSDictionary *body = self.counter.events.lastObject[@"body"];
    XCTAssertEqualObjects(body[@"steps"], @4); XCTAssertEqualObjects(body[@"distance"], @3);
    XCTAssertEqualObjects(body[@"floorsAscended"], @1); XCTAssertEqualObjects(body[@"floorsDescended"], @2);
    XCTAssertEqualObjects(body[@"startDate"], [self milliseconds:anchor]);
  }
}
- (void)testCorrectionsNeverLowerBaselinesOrEmitDecreasingMetrics {
  [self.counter startStepCounterUpdate:1000]; NSDate *cutoff = self.sensor.queryEnds[0];
  self.sensor.queries[0]([self sample:100 distance:@80 up:@7 down:@4 end:cutoff], nil);
  self.sensor.updates[0]([self sample:110 distance:@88 up:@9 down:@6 end:[cutoff dateByAddingTimeInterval:10]], nil);
  self.sensor.updates[0]([self sample:90 distance:@70 up:@5 down:@3 end:[cutoff dateByAddingTimeInterval:11]], nil);
  self.sensor.updates[0]([self sample:111 distance:@89 up:@10 down:@7 end:[cutoff dateByAddingTimeInterval:12]], nil);
  XCTAssertEqualObjects(self.counter.events.lastObject[@"body"][@"steps"], @11);
  // Every optional metric independently rejects a correction of the whole window.
  self.sensor.updates[0]([self sample:112 distance:@88 up:@10 down:@7 end:[cutoff dateByAddingTimeInterval:13]], nil);
  self.sensor.updates[0]([self sample:112 distance:@90 up:@9 down:@7 end:[cutoff dateByAddingTimeInterval:14]], nil);
  self.sensor.updates[0]([self sample:112 distance:@90 up:@11 down:@6 end:[cutoff dateByAddingTimeInterval:15]], nil);
  XCTAssertEqual(self.counter.events.count, 2u);
  self.sensor.updates[0]([self sample:112 distance:@90 up:@11 down:@8 end:[cutoff dateByAddingTimeInterval:16]], nil);
  NSDictionary *body = self.counter.events.lastObject[@"body"];
  XCTAssertEqualObjects(body[@"steps"], @12); XCTAssertEqualObjects(body[@"distance"], @10);
  XCTAssertEqualObjects(body[@"floorsAscended"], @4); XCTAssertEqualObjects(body[@"floorsDescended"], @4);
}
- (void)testZeroDeltaAndStaleDatesDoNotAdvanceSession {
  [self.counter startStepCounterUpdate:1000]; NSDate *cutoff = self.sensor.queryEnds[0];
  self.sensor.queries[0]([self sample:100 distance:@80 up:@7 down:@4 end:cutoff], nil);
  self.sensor.updates[0]([self sample:100 distance:@80 up:@7 down:@4 end:[cutoff dateByAddingTimeInterval:1]], nil);
  self.sensor.updates[0]([self sample:101 distance:@81 up:@7 down:@4 end:[cutoff dateByAddingTimeInterval:-1]], nil);
  XCTAssertEqual(self.counter.events.count, 0u);
  self.sensor.updates[0]([self sample:105 distance:@84 up:@8 down:@4 end:[cutoff dateByAddingTimeInterval:5]], nil);
  self.sensor.updates[0]([self sample:106 distance:@85 up:@8 down:@4 end:[cutoff dateByAddingTimeInterval:4]], nil);
  self.sensor.updates[0]([self sample:106 distance:@85 up:@8 down:@4 end:[cutoff dateByAddingTimeInterval:5]], nil);
  XCTAssertEqual(self.counter.events.count, 1u);
  self.sensor.updates[0]([self sample:106 distance:@85 up:@8 down:@4 end:[cutoff dateByAddingTimeInterval:6]], nil);
  XCTAssertEqualObjects(self.counter.events.lastObject[@"body"][@"steps"], @6);
}
- (void)testHistoricalQueryKeepsOriginalMetricsAndDates {
  NSDate *start = [NSDate dateWithTimeIntervalSince1970:1000], *end = [start dateByAddingTimeInterval:60];
  __block NSArray *result;
  [self.counter queryStepCounterDataBetweenDates:start endDate:end handler:^(NSArray *args) { result = args; }];
  CMPedometerData *data = [self data:100 start:1000]; data.endDate = end; data.distance = @80; data.floorsAscended = @7; data.floorsDescended = @4;
  self.sensor.queries[0](data, nil);
  NSDictionary *body = result[1];
  XCTAssertEqualObjects(body[@"steps"], @100); XCTAssertEqualObjects(body[@"distance"], @80);
  XCTAssertEqualObjects(body[@"floorsAscended"], @7); XCTAssertEqualObjects(body[@"floorsDescended"], @4);
  XCTAssertEqualObjects(body[@"startDate"], @1000000); XCTAssertEqualObjects(body[@"endDate"], @1060000);
}
@end
