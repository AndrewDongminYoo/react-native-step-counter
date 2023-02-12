folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

Pod::Spec.new do |s|
  s.name         = "RNStepCounter"
  s.version      = "1.0.0"
  s.summary      = "step-counter implement as react-native module"
  s.homepage     = "https://github.com/AndrewDongminYoo/react-native-step-counter"
  s.license      = "MIT"
  s.authors      = "Dongmin,Yoo <ydm2790@gmail.com> (https://github.com/AndrewDongminYoo)"
  s.description  = "It is a multi-platform library that combines MotionSensor from iOS's Core Module with SensorEventListener from Android."
  s.platforms    = { :ios => "11.0" }
  s.source       = { :git => "https://github.com/AndrewDongminYoo/react-native-step-counter.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.dependency "React-Core"

  # Don't install the dependencies when we run `pod install` in the old architecture.
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
    s.pod_target_xcconfig    = {
        "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\"",
        "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1",
        "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    }
    s.dependency "React-Codegen"
    s.dependency "RCT-Folly"
    s.dependency "RCTRequired"
    s.dependency "RCTTypeSafety"
    s.dependency "ReactCommon/turbomodule/core"
  end
end
