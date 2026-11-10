#import <Foundation/Foundation.h>

// XCTest may load system CoreMotion indirectly. Keep doubles in their own namespace.
#define CMPedometer SCFixturePedometer
#define CMPedometerData SCFixturePedometerData

typedef NS_ENUM(NSInteger, CMAuthorizationStatus) { CMAuthorizationStatusAuthorized = 3 };
@interface CMPedometerData : NSObject
@property(nonatomic, strong) NSDate *startDate;
@property(nonatomic, strong) NSDate *endDate;
@property(nonatomic, strong) NSNumber *numberOfSteps;
@property(nonatomic, strong) NSNumber *distance;
@property(nonatomic, strong) NSNumber *floorsAscended;
@property(nonatomic, strong) NSNumber *floorsDescended;
@end
typedef void (^CMPedometerHandler)(CMPedometerData *, NSError *);
@interface CMPedometer : NSObject
+ (BOOL)isStepCountingAvailable;
+ (BOOL)isPaceAvailable;
+ (BOOL)isCadenceAvailable;
+ (BOOL)isDistanceAvailable;
+ (BOOL)isFloorCountingAvailable;
+ (CMAuthorizationStatus)authorizationStatus;
- (void)queryPedometerDataFromDate:(NSDate *)start toDate:(NSDate *)end withHandler:(CMPedometerHandler)handler;
- (void)startPedometerUpdatesFromDate:(NSDate *)start withHandler:(CMPedometerHandler)handler;
- (void)stopPedometerUpdates;
@end

#define CMMotionManager SCFixtureMotionManager
#define CMAccelerometerData SCFixtureAccelerometerData
typedef struct { double x, y, z; } CMAcceleration;
@interface CMAccelerometerData : NSObject
@property(nonatomic) CMAcceleration acceleration;
@end
typedef void (^CMAccelerometerHandler)(CMAccelerometerData *, NSError *);
@interface CMMotionManager : NSObject
@property(nonatomic) NSTimeInterval accelerometerUpdateInterval;
@property(nonatomic) NSTimeInterval deviceMotionUpdateInterval;
@property(nonatomic) NSTimeInterval gyroUpdateInterval;
@property(nonatomic) NSTimeInterval magnetometerUpdateInterval;
@property(nonatomic) BOOL showsDeviceMovementDisplay;
@property(nonatomic) BOOL isAccelerometerActive;
@property(nonatomic, copy) CMAccelerometerHandler updateHandler;
- (void)startAccelerometerUpdatesToQueue:(NSOperationQueue *)queue withHandler:(CMAccelerometerHandler)handler;
- (void)stopAccelerometerUpdates;
@end
