package com.stepcounter.step.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.stepcounter.step.services.StepCounterService

class RebootActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        // This method is called when the BroadcastReceiver is receiving an Intent broadcast.
        val action = intent.action
        action?.let {
            if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_LOCKED_BOOT_COMPLETED) {
                val serviceIntent = Intent(context, StepCounterService::class.java)
                ContextCompat.startForegroundService(context, serviceIntent)
            }
        }
    }
}