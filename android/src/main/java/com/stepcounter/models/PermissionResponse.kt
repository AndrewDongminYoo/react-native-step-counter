package com.stepcounter.models

data class PermissionsResponse(
    val status: String,
    val canAskAgain: Boolean = true,
) {
    companion object {
        const val STATUS_KEY = "status"
        const val GRANTED_KEY = "granted"
        const val EXPIRES_KEY = "expires"
        const val CAN_ASK_AGAIN_KEY = "canAskAgain"
        const val PERMISSION_EXPIRES_NEVER = "never"
        const val SCOPE_IN_USE = "whenInUse"
        const val SCOPE_ALWAYS = "always"
        const val SCOPE_NONE = "none"
        const val SCOPE_KEY = "scope"
    }

    enum class PermissionStatus(val status: String) {
        BLOCKED("blocked"),
        GRANTED("granted"),
        DENIED("denied"),
        UNDETERMINED("undetermined"),
        UNAVAILABLE("unavailable"),
    }
}