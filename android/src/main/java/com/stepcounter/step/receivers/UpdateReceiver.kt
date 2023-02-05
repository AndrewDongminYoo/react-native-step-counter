package com.stepcounter.step.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.stepcounter.step.services.StepCounterService

// when an update to paseo is installed, restart the step counting service
class UpdateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent != null) {
            if (intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
                ContextCompat.startForegroundService(context, intent)
            }
        } else {
            val stepIntent = Intent(context, StepCounterService::class.java)
            stepIntent.action = Intent.ACTION_MY_PACKAGE_REPLACED
            ContextCompat.startForegroundService(context, stepIntent)
        }
    }
}