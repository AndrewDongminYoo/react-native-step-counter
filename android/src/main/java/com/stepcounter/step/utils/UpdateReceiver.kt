package com.stepcounter.step.utils

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.stepcounter.step.background.StepCounterService

// when an update to paseo is installed, restart the step counting service
class UpdateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null) {
            return
        }

        val serviceIntent = Intent(context, StepCounterService::class.java)
        ContextCompat.startForegroundService(context, serviceIntent)
    }
}