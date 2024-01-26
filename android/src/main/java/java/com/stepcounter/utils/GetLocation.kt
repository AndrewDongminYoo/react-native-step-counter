
package com.stepcounter.utils
import android.location.LocationManager
import com.facebook.react.bridge.Promise

class GetLocation(locationManager: LocationManager) {
    private val locationManager: LocationManager
    private var timer: Timer? = null
    private var listener: LocationListener? = null
    private var promise: Promise? = null

    init {
        this.locationManager = locationManager
    }

    operator fun get(options: ReadableMap, promise: Promise) {
        this.promise = promise
        try {
            if (!isLocationEnabled) {
                promise.reject("UNAVAILABLE", "Location not available")
                return
            }
            val enableHighAccuracy = options.hasKey("enableHighAccuracy") && options.getBoolean("enableHighAccuracy")
            val timeout = if (options.hasKey("timeout")) options.getDouble("timeout") else 0
            val criteria = Criteria()
            criteria.setAccuracy(if (enableHighAccuracy) Criteria.ACCURACY_FINE else Criteria.ACCURACY_COARSE)
            listener = object : LocationListener {
                private var locationFound = false
                @Synchronized
                override fun onLocationChanged(location: Location) {
                    if (location != null && !locationFound) {
                        locationFound = true
                        val resultLocation = WritableNativeMap()
                        resultLocation.putString("provider", location.getProvider())
                        resultLocation.putDouble("latitude", location.getLatitude())
                        resultLocation.putDouble("longitude", location.getLongitude())
                        resultLocation.putDouble("accuracy", location.getAccuracy())
                        resultLocation.putDouble("altitude", location.getAltitude())
                        resultLocation.putDouble("speed", location.getSpeed())
                        resultLocation.putDouble("bearing", location.getBearing())
                        resultLocation.putDouble("time", location.getTime())
                        promise.resolve(resultLocation)
                        stop()
                        clearReferences()
                    }
                }

                override fun onStatusChanged(provider: String, status: Int, extras: Bundle) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }
            locationManager.requestLocationUpdates(0L, 0f, criteria, listener, Looper.myLooper())
            if (timeout > 0) {
                timer = Timer()
                timer.schedule(object : TimerTask() {
                    override fun run() {
                        try {
                            promise.reject("TIMEOUT", "Location timed out")
                            stop()
                            clearReferences()
                        } catch (ex: Exception) {
                            ex.printStackTrace()
                        }
                    }
                }, timeout)
            }
        } catch (ex: SecurityException) {
            ex.printStackTrace()
            stop()
            promise.reject("UNAUTHORIZED", "Location permission denied", ex)
        } catch (ex: Exception) {
            ex.printStackTrace()
            stop()
            promise.reject("UNAVAILABLE", "Location not available", ex)
        }
    }

    @Synchronized
    fun cancel() {
        if (promise == null) {
            return
        }
        try {
            promise.reject("CANCELLED", "Location cancelled by another request")
            stop()
            clearReferences()
        } catch (ex: Exception) {
            ex.printStackTrace()
        }
    }

    private fun stop() {
        if (timer != null) {
            timer.cancel()
        }
        if (listener != null) {
            locationManager.removeUpdates(listener)
        }
    }

    private fun clearReferences() {
        promise = null
        timer = null
        listener = null
    }

    private val isLocationEnabled: Boolean
        private get() {
            try {
                return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                        locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
            } catch (ex: Exception) {
                ex.printStackTrace()
            }
            return false
        }
}