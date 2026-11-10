#import <XCTest/XCTest.h>
#import <CoreMotion/CoreMotion.h>
#import "../../ios/SOMotionDetecter.h"

@implementation CMAccelerometerData
@end
@implementation CMMotionManager
- (void)startAccelerometerUpdatesToQueue:(NSOperationQueue *)queue withHandler:(CMAccelerometerHandler)handler { self.isAccelerometerActive = YES; self.updateHandler = handler; }
- (void)stopAccelerometerUpdates { self.isAccelerometerActive = NO; self.updateHandler = nil; }
@end

@interface SOMotionDetecterTests : XCTestCase
@end
@implementation SOMotionDetecterTests
- (CMAccelerometerData *)step { CMAccelerometerData *data = [CMAccelerometerData new]; data.acceleration = (CMAcceleration){2, 0, 0}; return data; }
- (void)drainMainQueue {
  XCTestExpectation *done = [self expectationWithDescription:@"main callbacks drained"];
  dispatch_async(dispatch_get_main_queue(), ^{ [done fulfill]; });
  [self waitForExpectations:@[done] timeout:2];
}
- (void)testStopDropsQueuedDeliveryAndReleasesCallbackCaptures {
  SOMotionDetecter *detector = [SOMotionDetecter new];
  CMMotionManager *manager = [detector valueForKey:@"motionManager"];
  __block NSUInteger calls = 0;
  __weak NSObject *weakCapture;
  @autoreleasepool {
    NSObject *capture = [NSObject new]; weakCapture = capture;
    [detector startDetectionWithUpdateBlock:^(NSError *error) { (void)[capture description]; calls++; }];
  }
  CMAccelerometerHandler stale = manager.updateHandler;
  stale(self.step, nil);
  [detector stopDetection];
  [detector stopDetection];
  XCTAssertFalse(manager.isAccelerometerActive);
  XCTAssertNil(manager.updateHandler);
  XCTAssertNil(weakCapture);
  stale(self.step, nil);
  stale(nil, [NSError errorWithDomain:@"test" code:1 userInfo:nil]);
  [self drainMainQueue];
  XCTAssertEqual(calls, 0u);
}
- (void)testRestartReplacesCallbackAndRetiredDeliveryCannotReachNewOwner {
  SOMotionDetecter *detector = [SOMotionDetecter new];
  CMMotionManager *manager = [detector valueForKey:@"motionManager"];
  __block NSUInteger oldCalls = 0, newCalls = 0;
  [detector startDetectionWithUpdateBlock:^(NSError *error) { oldCalls++; }];
  CMAccelerometerHandler stale = manager.updateHandler;
  [detector startDetectionWithUpdateBlock:^(NSError *error) { newCalls++; }];
  stale(self.step, nil);
  manager.updateHandler(self.step, nil);
  [self drainMainQueue];
  XCTAssertEqual(oldCalls, 0u);
  XCTAssertEqual(newCalls, 1u);
  [detector stopDetection];
}
- (void)testHardwareHandlerDoesNotRetainDetector {
  CMMotionManager *manager;
  __weak SOMotionDetecter *weakDetector;
  @autoreleasepool {
    SOMotionDetecter *detector = [SOMotionDetecter new];
    manager = [detector valueForKey:@"motionManager"];
    [detector startDetectionWithUpdateBlock:^(NSError *error) {}];
    weakDetector = detector;
  }
  XCTAssertNil(weakDetector);
}
- (void)testInvalidOrBelowThresholdAccelerationDoesNotCountAsAStep {
  SOMotionDetecter *detector = [SOMotionDetecter new];
  CMMotionManager *manager = [detector valueForKey:@"motionManager"];
  __block NSUInteger calls = 0;
  [detector startDetectionWithUpdateBlock:^(NSError *error) { calls++; }];
  for (NSNumber *x in @[@0, @1.2f, @(NAN)]) {
    CMAccelerometerData *data = [CMAccelerometerData new];
    data.acceleration = (CMAcceleration){x.doubleValue, 0, 0};
    manager.updateHandler(data, nil);
  }
  [self drainMainQueue];
  XCTAssertEqual(calls, 0u);
  [detector stopDetection];
}
@end
