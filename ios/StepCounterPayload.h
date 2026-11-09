#import <Foundation/Foundation.h>

// Shared by the Core Motion adapter and the native payload contract fixture.
static inline NSDictionary *StepCounterPayload(NSDate *startDate, NSDate *endDate,
                                              NSNumber *steps, NSNumber *distance,
                                              NSNumber *floorsAscended, NSNumber *floorsDescended) {
  return @{
    @"counterType": @"CMPedometer",
    @"startDate": startDate ? @((long long)(startDate.timeIntervalSince1970 * 1000.0)) : [NSNull null],
    @"endDate": endDate ? @((long long)(endDate.timeIntervalSince1970 * 1000.0)) : [NSNull null],
    @"steps": steps ?: [NSNull null],
    @"distance": distance ?: [NSNull null],
    @"floorsAscended": floorsAscended ?: [NSNull null],
    @"floorsDescended": floorsDescended ?: [NSNull null],
  };
}
