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
@property(nonatomic, copy) void (^onStop)(void);
@end
@implementation ScheduledPedometer
- (instancetype)init { if ((self = [super init])) { _queries = [NSMutableArray new]; _updates = [NSMutableArray new]; } return self; }
- (void)queryPedometerDataFromDate:(NSDate *)start toDate:(NSDate *)end withHandler:(CMPedometerHandler)handler { [self.queries addObject:[handler copy]]; }
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
@end
@implementation StepCounterSessionTests
- (void)setUp { self.sensor = [ScheduledPedometer new]; self.counter = [RecordingCounter new]; [self.counter setValue:self.sensor forKey:@"pedometer"]; }
- (CMPedometerData *)data:(NSInteger)steps start:(double)start {
  CMPedometerData *data = [CMPedometerData new];
  data.startDate = [NSDate dateWithTimeIntervalSince1970:start]; data.endDate = [data.startDate dateByAddingTimeInterval:20]; data.numberOfSteps = @(steps); return data;
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
  self.sensor.updates[0]([self data:2 start:1000], nil);
  self.sensor.updates[0]([self data:99 start:2000], nil);
  self.sensor.updates[0](nil, self.error);
  XCTAssertEqual(self.counter.events.count, 3u);
  XCTAssertEqualObjects(self.counter.events[1][@"body"][@"steps"], @3);
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
@end
