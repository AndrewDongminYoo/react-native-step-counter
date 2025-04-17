import CoreMotion

@objc(SOMotionDetecter)
class SOMotionDetecter: NSObject {
    private let motionManager = CMMotionManager()
    private let queue = OperationQueue()
    private var updateBlock: ((Error?) -> Void)?
    
    @objc static let sharedInstance = SOMotionDetecter()
    
    private override init() {
        super.init()
        
        motionManager.accelerometerUpdateInterval = 0.2
        motionManager.deviceMotionUpdateInterval = 0.2
        motionManager.gyroUpdateInterval = 0.2
        motionManager.magnetometerUpdateInterval = 0.2
        motionManager.showsDeviceMovementDisplay = true
        
        queue.maxConcurrentOperationCount = 1
    }
    
    @objc func startDetection(withUpdateBlock callback: @escaping (Error?) -> Void) {
        if motionManager.isAccelerometerActive {
            return
        }
        
        updateBlock = callback
        
        motionManager.startAccelerometerUpdates(to: queue) { [weak self] (accelerometerData, error) in
            guard let self = self else { return }
            
            if let error = error {
                DispatchQueue.main.async {
                    self.updateBlock?(error)
                }
                return
            }
            
            guard let acceleration = accelerometerData?.acceleration else { return }
            
            let strength: Double = 1.2
            let isStep = abs(acceleration.x) > strength ||
                         abs(acceleration.y) > strength ||
                         abs(acceleration.z) > strength
            
            if isStep {
                DispatchQueue.main.async {
                    self.updateBlock?(nil)
                }
            }
        }
    }
    
    @objc func stopDetection() {
        if motionManager.isAccelerometerActive {
            motionManager.stopAccelerometerUpdates()
        }
        updateBlock = nil
    }
}