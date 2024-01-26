package com.stepcounter

import android.content.Context

class ReactNativeGetLocationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var locationManager: LocationManager? = null
    private var getLocation: GetLocation? = null

    init {
        try {
            locationManager = reactContext.getApplicationContext().getSystemService(Context.LOCATION_SERVICE) as LocationManager
        } catch (ex: Exception) {
            ex.printStackTrace()
        }
    }

    @ReactMethod
    fun openWifiSettings(promise: Promise) {
        try {
            SettingsUtil.openWifiSettings(getReactApplicationContext())
            promise.resolve(null)
        } catch (ex: Throwable) {
            promise.reject(ex)
        }
    }

    @ReactMethod
    fun openCelularSettings(primise: Promise) {
        try {
            SettingsUtil.openCelularSettings(getReactApplicationContext())
            primise.resolve(null)
        } catch (ex: Throwable) {
            primise.reject(ex)
        }
    }

    @ReactMethod
    fun openGpsSettings(primise: Promise) {
        try {
            SettingsUtil.openGpsSettings(getReactApplicationContext())
            primise.resolve(null)
        } catch (ex: Throwable) {
            primise.reject(ex)
        }
    }

    @ReactMethod
    fun openAppSettings(promise: Promise) {
        try {
            SettingsUtil.openAppSettings(getReactApplicationContext())
            promise.resolve(null)
        } catch (ex: Throwable) {
            promise.reject(ex)
        }
    }

    @ReactMethod
    fun getCurrentPosition(options: ReadableMap?, promise: Promise?) {
        if (getLocation != null) {
            getLocation.cancel()
        }
        getLocation = GetLocation(locationManager)
        getLocation.get(options, promise)
    }

    companion object {
        val name = "ReactNativeGetLocation"
            get() = Companion.field
    }
}