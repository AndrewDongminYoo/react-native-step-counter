package com.stepcounter.step.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.stepcounter.step.services.StepCounterService

class ServiceRestarter : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        // restart the step counting service (different code to achieve this depending on Android version)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(Intent(context, StepCounterService::class.java))
        } else {
            context.startService(Intent(context, StepCounterService::class.java))
        }
    }
}