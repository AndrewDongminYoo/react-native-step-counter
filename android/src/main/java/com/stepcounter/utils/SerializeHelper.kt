package com.stepcounter.utils

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.bridge.ReactApplicationContext

object SerializeHelper {
    fun serialize(appContext: ReactApplicationContext): Bundle {
            val bundle = Bundle()
            bundle.putString("name", appContext.javaClass.name)
//            bundle.putString("packageName", appContext.packageName)
//            bundle.putString("packageResourcePath", appContext.packageResourcePath)
//            bundle.putString("sourceURL", appContext.sourceURL)
//            bundle.putString("javaClass", appContext.javaClass.toString())
//            bundle.putString("packageCodePath", appContext.packageCodePath)
            return bundle
        }

    fun deserialize(appContext: Context?, intent: Intent?, key: String): ReactApplicationContext {
        try {
            val reactContextMap = intent?.getBundleExtra(key)
            val reactContextClassName = reactContextMap?.getString("name")
                ?: throw ClassNotFoundException("Bundle's name not found")
            val reactContextClass = Class.forName(reactContextClassName)
            val constructor = reactContextClass.getDeclaredConstructor(Context::class.java)
            return constructor.newInstance(appContext) as ReactApplicationContext
        } catch (e: Exception) {
            throw RuntimeException(e)
        }
    }
}