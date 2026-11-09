#import "../../ios/StepCounterPayload.h"

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    if (argc != 2) return 2;
    NSData *json = [NSData dataWithContentsOfFile:@(argv[1])];
    NSError *error = nil;
    NSArray *fixtures = json ? [NSJSONSerialization JSONObjectWithData:json options:0 error:&error] : nil;
    if (!fixtures || error) return 2;
    for (NSDictionary *expected in fixtures) {
      id (^optional)(NSString *) = ^id(NSString *key) {
        id value = expected[key];
        return value == [NSNull null] ? nil : value;
      };
      NSDate *start = [NSDate dateWithTimeIntervalSince1970:[expected[@"startDate"] doubleValue] / 1000.0];
      NSDate *end = [NSDate dateWithTimeIntervalSince1970:[expected[@"endDate"] doubleValue] / 1000.0];
      NSDictionary *actual = StepCounterPayload(start, end, expected[@"steps"], optional(@"distance"),
                                                optional(@"floorsAscended"), optional(@"floorsDescended"));
      if (![actual isEqualToDictionary:expected]) {
        NSLog(@"Payload mismatch: %@ != %@", actual, expected);
        return 1;
      }
      if (![NSJSONSerialization isValidJSONObject:actual]) return 1;
    }
    NSDate *fractionalStart = [NSDate dateWithTimeIntervalSince1970:0.1255];
    NSDate *fractionalEnd = [NSDate dateWithTimeIntervalSince1970:1.8755];
    NSDictionary *fractional = StepCounterPayload(fractionalStart, fractionalEnd, nil, nil, nil, nil);
    if (![fractional[@"startDate"] isEqualToNumber:@125] ||
        ![fractional[@"endDate"] isEqualToNumber:@1875]) return 1;
    NSDictionary *empty = StepCounterPayload(nil, nil, nil, nil, nil, nil);
    if (empty[@"steps"] != [NSNull null] || empty[@"startDate"] != [NSNull null]) return 1;
    puts("Native iOS payload fixtures passed");
  }
  return 0;
}
