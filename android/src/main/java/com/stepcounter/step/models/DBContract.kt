package com.stepcounter.step.models

import android.provider.BaseColumns

object DBContract {

    // Inner class that defines the table contents
    class StepsTable : BaseColumns {
        companion object {
            const val TABLE_NAME = "hours"
            const val COLUMN_DATE_ID = "_id"
            const val COLUMN_DATE = "date"
            const val COLUMN_TIME = "hour"
            const val COLUMN_START_STEPS = "startSteps"
            const val COLUMN_END_STEPS = "endSteps"
            const val COLUMN_EDIT = "edit"
        }
    }

    // Inner class that defines the table contents
    class ActivityTypeTable : BaseColumns {
        companion object {
            const val TABLE_NAME = "activityType"
            const val COLUMN_DATE_ID = "_id"
            const val COLUMN_DATE = "date"
            const val COLUMN_START_TIME = "startTime"
            const val COLUMN_END_TIME = "endTime"
            const val COLUMN_START_STEPS = "startSteps"
            const val COLUMN_END_STEPS = "endSteps"
            const val COLUMN_ACTIVITY_TYPE = "activityType"
            const val COLUMN_NOTES = "notes"
        }
    }
}