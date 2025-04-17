import CoreMotion
import React

@objc(StepCounter)
class StepCounter: RCTEventEmitter {
    private var pedometer: CMPedometer!
    private let motionDetector = SOMotionDetecter.sharedInstance
    
    override init() {
        super.init()
        pedometer = CMPedometer()
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return [
            "StepCounter.stepCounterUpdate",
            "StepCounter.stepDetected",
            "StepCounter.errorOccurred",
            "StepCounter.stepsSensorInfo"
        ]
    }
    
    @objc func isStepCountingSupported(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        let result: [String: Any] = [
            "granted": authorizationStatus(),
            "supported": CMPedometer.isStepCountingAvailable()
        ]
        resolve(result)
        sendEvent(withName: "StepCounter.stepsSensorInfo", body: dictionaryAboutSensorInfo())
    }
    
    @objc func queryStepCounterDataBetweenDates(_ startDate: Date, endDate: Date, handler: @escaping RCTResponseSenderBlock) {
        pedometer.queryPedometerData(from: startDate, to: endDate) { (pedometerData, error) in
            if let error = error {
                handler([error.localizedDescription, NSNull()])
            } else {
                handler([NSNull(), self.dictionary(from: pedometerData)])
            }
        }
    }
    
    @objc func startStepCounterUpdate(_ date: Date?) {
        let startDate = date ?? Date()
        pedometer.startUpdates(from: startDate) { (pedometerData, error) in
            if let error = error {
                self.sendEvent(withName: "StepCounter.errorOccurred", body: ["error": error.localizedDescription])
            } else if let pedometerData = pedometerData {
                self.sendEvent(withName: "StepCounter.stepCounterUpdate", body: self.dictionary(from: pedometerData))
            }
        }
    }
    
    private func dictionaryAboutSensorInfo() -> [String: Any] {
        return [
            "name": "CMPedometer",
            "granted": authorizationStatus(),
            "stepCounting": CMPedometer.isStepCountingAvailable(),
            "pace": CMPedometer.isPaceAvailable(),
            "cadence": CMPedometer.isCadenceAvailable(),
            "distance": CMPedometer.isDistanceAvailable(),
            "floorCounting": CMPedometer.isFloorCountingAvailable()
        ]
    }
    
    private func dictionary(from data: CMPedometerData?) -> [String: Any] {
        guard let data = data else { return [:] }
        
        let startDate = data.startDate.timeIntervalSince1970 * 1000
        let endDate = data.endDate.timeIntervalSince1970 * 1000
        
        return [
            "counterType": "CMPedometer",
            "startDate": startDate,
            "endDate": endDate,
            "steps": data.numberOfSteps,
            "distance": data.distance ?? NSNull(),
            "floorsAscended": data.floorsAscended ?? NSNull(),
            "floorsDescended": data.floorsDescended ?? NSNull()
        ]
    }
    
    @objc func stopStepCounterUpdate() {
        pedometer.stopUpdates()
        motionDetector.stopDetection()
    }
    
    @objc func startStepsDetection() {
        motionDetector.startDetection { error in
            if let error = error {
                self.sendEvent(withName: "StepCounter.errorOccurred", body: ["error": error.localizedDescription])
            } else {
                self.sendEvent(withName: "StepCounter.stepDetected", body: ["detected": true])
            }
        }
    }
    
    private func authorizationStatus() -> Bool {
        if #available(iOS 11.0, *) {
            return CMPedometer.authorizationStatus() == .authorized
        }
        return true
    }
}
