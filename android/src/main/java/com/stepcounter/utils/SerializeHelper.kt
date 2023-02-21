package com.stepcounter.utils

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext

object SerializeHelper {
    fun serialize(appContext: ReactApplicationContext): HashMap<String, Any> {
            val map = Arguments.createMap()
            map.putString("name", appContext.javaClass.name)
            map.putString("packageName", appContext.packageName)
            map.putString("packageResourcePath", appContext.packageResourcePath)
            map.putString("sourceURL", appContext.sourceURL)
            map.putString("javaClass", appContext.javaClass.toString())
            map.putString("packageCodePath", appContext.packageCodePath)
            return map.toHashMap()
        }

    fun deserialize(appContext: Context?, intent: Intent?): ReactApplicationContext {
        val reactContextMap: Bundle? = intent?.getBundleExtra("reactContext")
        val reactContextClassName = reactContextMap?.getString("name")
        val reactContextClass = Class.forName(reactContextClassName!!)
        val constructor = reactContextClass.getDeclaredConstructor(ReactApplicationContext::class.java)
        return constructor.newInstance(appContext) as ReactApplicationContext
    }
}