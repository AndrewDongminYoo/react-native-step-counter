#import <Foundation/Foundation.h>
#define RCT_EXPORT_MODULE()
#define RCT_EXPORT_METHOD(method) - (void)method

typedef void (^RCTPromiseResolveBlock)(id);
typedef void (^RCTPromiseRejectBlock)(NSString *, NSString *, NSError *);
typedef void (^RCTResponseSenderBlock)(NSArray *);
@interface RCTEventEmitter : NSObject
@property(nonatomic, weak) id bridge;
@property(nonatomic, weak) id callableJSModules;
- (void)sendEventWithName:(NSString *)name body:(id)body;
- (void)invalidate;
@end
