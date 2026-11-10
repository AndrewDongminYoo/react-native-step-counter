//  SOMotionDetecter.m
//  MotionDetection
//
//  Created by Artur on 5/15/15.
//  Copyright (c) 2015 Artur Mkrtchyan. All rights reserved.
//

#import "SOMotionDetecter.h"
#import <CoreMotion/CoreMotion.h>
#import <UIKit/UIKit.h>

#define kUpdateInterval 0.2f
@interface SOMotionDetecter ()

@property(strong, nonatomic) CMMotionManager *motionManager;
@property(strong, nonatomic) NSOperationQueue *queue;
@property(copy, nonatomic) void (^updateBlock)(NSError *);
@property(strong, nonatomic) NSObject *generation;

@end

@implementation SOMotionDetecter

+ (instancetype)sharedInstance {
  static id instance;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    instance = [self new];
  });

  return instance;
}

- (instancetype)init {
  self = [super init];

  self.motionManager = [CMMotionManager new];
  self.motionManager.accelerometerUpdateInterval = kUpdateInterval;
  self.motionManager.deviceMotionUpdateInterval = kUpdateInterval;
  self.motionManager.gyroUpdateInterval = kUpdateInterval;
  self.motionManager.magnetometerUpdateInterval = kUpdateInterval;
  self.motionManager.showsDeviceMovementDisplay = YES;
  self.queue = [NSOperationQueue new];
  self.queue.maxConcurrentOperationCount = 1;

  return self;
}

- (void)startDetectionWithUpdateBlock:(void (^)(NSError *))callback {
  @synchronized(self) {
    [self stopDetection];
    NSObject *generation = [NSObject new];
    self.generation = generation;
    self.updateBlock = callback;
    __weak SOMotionDetecter *weakSelf = self;
    [self.motionManager startAccelerometerUpdatesToQueue:self.queue
                                           withHandler:^(CMAccelerometerData *data, NSError *error) {
      CMAcceleration acceleration = data.acceleration;
      if (!error && (!data || (fabs(acceleration.x) <= 1.2f &&
                               fabs(acceleration.y) <= 1.2f &&
                               fabs(acceleration.z) <= 1.2f))) return;
      // Queued work holds no consumer callback; stop releases its captures immediately.
      dispatch_async(dispatch_get_main_queue(), ^{
        SOMotionDetecter *strongSelf = weakSelf;
        if (!strongSelf) return;
        void (^update)(NSError *);
        @synchronized(strongSelf) {
          if (strongSelf.generation != generation) return;
          update = strongSelf.updateBlock;
        }
        // Never enter module state while holding the detector monitor.
        if (update) update(error);
      });
    }];
  }
}

- (void)stopDetection {
  @synchronized(self) {
    self.generation = nil;
    self.updateBlock = nil;
    [self.motionManager stopAccelerometerUpdates];
  }
}

@end
