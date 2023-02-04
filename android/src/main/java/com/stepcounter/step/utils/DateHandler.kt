package com.stepcounter.step.utils

import java.util.*

class DateHandler {
    companion object {
        // return the date of the first day in the current week (could be the most recent Sunday or Monday)
        fun getFirstDayInWeek(
            weekStart: Int,
            theYear: Int = 0,
            theMonth: Int = 0,
            theDay: Int = 0,
        ): Date {
            var theCalendar = Calendar.getInstance(Locale.UK)

            // use a CANADA calendar so that start of week is Sunday
            if (weekStart == 1) {
                theCalendar = Calendar.getInstance(Locale.CANADA)
            }

            if (theYear != 0) {
                theCalendar.set(theYear, theMonth - 1, theDay)
            }
            // get start of this week in milliseconds
            while (theCalendar.get(Calendar.DAY_OF_WEEK) != weekStart) {
                theCalendar.add(Calendar.DATE, -1)
            }

            theCalendar[Calendar.HOUR_OF_DAY] = 0 // ! clear would not reset the hour of day !
            theCalendar.clear(Calendar.MINUTE)
            theCalendar.clear(Calendar.SECOND)
            theCalendar.clear(Calendar.MILLISECOND)

            return theCalendar.time
        }
    }
}