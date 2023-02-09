import CoreMotion

@objc(Pedometer)
class Pedometer: RCTEventEmitter {

  private let pedometer: CMPedometer = CMPedometer()

  var numberOfSteps: Int! = 0

  override func supportedEvents() -> [String]! {
    return ["StepCounter"]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc(isStepCountingSupported:withRejecter:)
  func isStepCountingSupported(resolve: RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
    if CMPedometer.isStepCountingAvailable() {
      resolve(true)
    } else {
      resolve(false)
    }
  }

  @objc(startStepCounter)
  func startStepCounter() {
    guard checkAuthStatus() else {
      fatalError("cant' auth")
    }
    self.pedometer.startUpdates(from: Date()) { (data, error) in
      guard let pedometerData = data, error == nil else {
        print("There was an error getting the data: \(String(describing: error))")
        return
      }

      let pedDataSteps = pedometerData.numberOfSteps.intValue
      DispatchQueue.main.async {
        if self.numberOfSteps != pedDataSteps {
        print("Steps: \(pedometerData)")
        self.numberOfSteps = pedDataSteps
        self.sendEvent(withName: "StepCounter", body: ["steps": self.numberOfSteps])
        }
      }
    }
  }

  func checkAuthStatus() -> Bool {
    var pedometerAuth = false
    if #available(iOS 11.0, *) {
        switch CMPedometer.authorizationStatus() {
        case CMAuthorizationStatus.authorized:
            pedometerAuth = true
        default:
            break
        }
    } else {
        // Fallback on earlier versions
    }
    return pedometerAuth
  }

  @objc(stopStepCounter)
  func stopStepCounter() -> Void {
    pedometer.stopUpdates()
    if #available(iOS 10.0, *) {
        pedometer.stopEventUpdates()
    } else {
        // Fallback on earlier versions
    }
  }
}
