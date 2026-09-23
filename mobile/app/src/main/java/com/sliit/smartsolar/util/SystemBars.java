package com.sliit.smartsolar.util;

import android.app.Activity;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * From Android 15 apps draw behind the status bar and the navigation bar. This
 * keeps a screen's content clear of both (and of the keyboard) so nothing is
 * hidden or untappable, and uses dark status bar icons on the light screens.
 */
public final class SystemBars {

    private SystemBars() {
    }

    /** Pads the screen content by the size of the system bars and the keyboard. */
    public static void apply(Activity activity) {
        View content = activity.findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        WindowCompat.getInsetsController(activity.getWindow(), content).setAppearanceLightStatusBars(true);
    }
}
