import CoreMotion
import Foundation
import React

@objc(RNStepCounter)
class RNStepCounter: RCTEventEmitter {
    private let stepCounter: CMPedometer = .init()

    var numberOfSteps: Int! = 0

    override func supportedEvents() -> [String]! {
        return ["stepCounterUpdate"]
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc(isStepCountingSupported:withRejecter:)
    func isStepCountingSupported(resolve: RCTPromiseResolveBlock, reject _: RCTPromiseRejectBlock) {
        if CMPedometer.isStepCountingAvailable() {
            resolve(true)
        } else {
            resolve(false)
        }
    }

    @objc(startStepCounterUpdate)
    func startStepCounterUpdate(_ date: NSDate?) {
        guard authorizationStatus() else {
            fatalError("cant' auth")
        }
        stepCounter.startUpdates(from: date ?? NSDate(), withHandler: { data, error in
            guard let pedometerData = data, error == nil else {
                print("There was an error getting the data: \(String(describing: error))")
                return
            }
            if pedometerData != nil {
                let pedDataSteps = pedometerData.numberOfSteps.intValue
                DispatchQueue.main.async {
                    if self.numberOfSteps != pedDataSteps {
                        print("Steps: \(pedometerData)")
                        self.numberOfSteps = pedDataSteps
                        self.sendEvent(
                            withName: "stepCounterUpdate",
                            body: self.dictionaryFromPedometerData(pedometerData!)
                        )
                    }
                }
            }
        })
    }

    func dictionaryFromPedometerData(_ data: CMPedometerData) -> [String: Any] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(abbreviation: "UTC")
        return [
            "startDate": formatter.string(from: data.startDate) ?? NSNull(),
            "endDate": formatter.string(from: data.endDate) ?? NSNull(),
            "steps": data.numberOfSteps ?? NSNull(),
            "distance": data.distance ?? NSNull(),
            "floorsAscended": data.floorsAscended ?? NSNull(),
            "floorsDescended": data.floorsDescended ?? NSNull()
        ]
    }

    func authorizationStatus() -> Bool {
        var stepCounterAuth = false
        if #available(iOS 11.0, *) {
            switch CMPedometer.authorizationStatus() {
            case .authorized:
                // 완전히 허용한 경우
                stepCounterAuth = true
            case .restricted:
                // 제한적인 권한으로 승인한 경우
                stepCounterAuth = true
            case .notDetermined:
                // 일회성으로 허용하는 경우
                stepCounterAuth = true
            case .denied:
            // 완전히 거절한 경우
            @unknown default:
                // 사용이 불가능한 기종이나 컨디션인 경우
                break
            }
        } else {
            // Fallback on earlier versions (iOS 10 이하)
        }
        return stepCounterAuth
    }

    @objc(stopStepCounterUpdate)
    func stopStepCounterUpdate() {
        stepCounter.stopUpdates()
        if #available(iOS 10.0, *) {
            stepCounter.stopEventUpdates()
        } else if numberOfSteps != 0 {
            // Fallback on earlier versions (iOS 9 이하)
            numberOfSteps = 0
            sendEvent(withName: "stepCounterUpdate", body: ["steps": numberOfSteps])
        }
    }

    override init() {
        pedometer = CMPedometer()
    }
}
